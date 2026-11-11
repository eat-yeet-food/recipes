import AuthenticationServices
import CryptoKit
import EatYeetCore
import Foundation
import Observation
import Security
import UIKit

/// A signed-in member, as `/api/public/account/session` returns it.
public struct Member: Codable, Equatable, Sendable {
    public let id: String
    public let email: String
    public let displayName: String
    public let displayNameConfirmed: Bool
}

/// The session token in the Keychain, readable after first unlock on this device only (never synced or backed up).
public struct TokenKeychain: Sendable {
    let account: String
    public init(backend: BackendEnvironment) { account = "member-session:" + backend.baseURL.absoluteString }
    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.phoganuci.eatyeet", kSecAttrAccount as String: account]
    }
    public func read() -> String? {
        var item: CFTypeRef?
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        guard SecItemCopyMatching(q as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    public func write(_ token: String) {
        delete()
        var q = query
        q[kSecValueData as String] = Data(token.utf8)
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(q as CFDictionary, nil)
    }
    public func delete() { SecItemDelete(query as CFDictionary) }
}

public enum AccountError: LocalizedError, Equatable {
    case cancelled
    case failed(String)
    public var errorDescription: String? {
        switch self {
        case .cancelled: nil
        case .failed(let message): message
        }
    }
}

/// Google sign-in for the app (PKCE one-time grant, then a bearer session) and the account calls
/// the site's settings page makes. The token never leaves the Keychain except as `Authorization: Bearer`.
@MainActor
@Observable
public final class AccountStore {
    public enum Status: Equatable { case unknown, signedOut, signedIn(Member) }

    public private(set) var status: Status = .unknown
    public private(set) var googleAvailable = true
    private var backend: BackendEnvironment
    private var keychain: TokenKeychain
    private let presentation = PresentationAnchor()

    public init(backend: BackendEnvironment) {
        self.backend = backend
        keychain = TokenKeychain(backend: backend)
    }

    public var member: Member? { if case .signedIn(let member) = status { member } else { nil } }

    public func use(_ backend: BackendEnvironment) {
        guard backend != self.backend else { return }
        self.backend = backend
        keychain = TokenKeychain(backend: backend)
        status = .unknown
    }

    private var api: URL { backend.baseURL.appending(path: "api/public/account") }

    private struct SessionReply: Decodable {
        let member: Member?
        let providers: Providers
        struct Providers: Decodable { let google: Bool }
    }
    private struct ErrorReply: Decodable { let error: String }

    func request(_ path: String, method: String = "GET", body: [String: String]? = nil, token: String? = nil) async throws -> (Data, Int) {
        var request = URLRequest(url: api.appending(path: path))
        request.httpMethod = method
        request.cachePolicy = .reloadIgnoringLocalCacheData
        if let token = token ?? keychain.read(), !token.isEmpty { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(body)
        }
        // Ephemeral: no cookies, so the server always treats the app as a bearer client.
        let (data, response) = try await URLSession(configuration: .ephemeral).data(for: request)
        return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
    }

    func requestJSON(_ path: String, method: String, json: [String: any Sendable]) async throws -> (Data, Int) {
        var request = URLRequest(url: api.appending(path: path))
        request.httpMethod = method
        if let token = keychain.read() { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: json)
        let (data, response) = try await URLSession(configuration: .ephemeral).data(for: request)
        return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
    }

    func message(_ data: Data, fallback: String) -> String {
        (try? JSONDecoder().decode(ErrorReply.self, from: data))?.error ?? fallback
    }

    /// Read who is signed in. A token the server no longer accepts is forgotten.
    public func refresh() async {
        guard keychain.read() != nil else {
            status = .signedOut
            if let (data, code) = try? await request("/session"), code == 200,
               let reply = try? JSONDecoder().decode(SessionReply.self, from: data) { googleAvailable = reply.providers.google }
            return
        }
        do {
            let (data, code) = try await request("/session")
            guard code == 200 else { return }
            let reply = try JSONDecoder().decode(SessionReply.self, from: data)
            googleAvailable = reply.providers.google
            if let member = reply.member { status = .signedIn(member) } else { keychain.delete(); status = .signedOut }
        } catch {
            // Offline: keep the token and whatever we knew.
            if status == .unknown { status = .signedOut }
        }
    }

    public func signIn() async throws {
        let verifier = Self.randomURLSafe(48)
        let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URLEncoded
        var start = URLComponents(url: api.appending(path: "google"), resolvingAgainstBaseURL: false)!
        start.queryItems = [.init(name: "client", value: "ios"), .init(name: "challenge", value: challenge)]
        let callback = try await authenticate(start.url!)
        let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        guard let code = items.first(where: { $0.name == "code" })?.value else {
            throw AccountError.failed("Google sign-in didn’t complete. Please try again.")
        }
        let (data, status) = try await request("/native/token", method: "POST", body: ["code": code, "verifier": verifier], token: "")
        struct Issued: Decodable { let token: String }
        guard status == 200, let issued = try? JSONDecoder().decode(Issued.self, from: data) else {
            throw AccountError.failed(message(data, fallback: "Google sign-in didn’t complete. Please try again."))
        }
        keychain.write(issued.token)
        await refresh()
    }

    private func authenticate(_ url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(url: url, callback: .customScheme("eatyeet")) { callback, error in
                if let callback { continuation.resume(returning: callback) }
                else if (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin { continuation.resume(throwing: AccountError.cancelled) }
                else { continuation.resume(throwing: AccountError.failed("Google sign-in didn’t complete. Please try again.")) }
            }
            // Ephemeral: Google's own cookies stay out of the app, as with the site's account chooser.
            session.prefersEphemeralWebBrowserSession = true
            session.presentationContextProvider = presentation
            session.start()
        }
    }

    public func signOut() async {
        _ = try? await request("/session", method: "DELETE")
        keychain.delete()
        status = .signedOut
    }

    public func signOutEverywhere() async throws {
        let (data, code) = try await request("/sessions", method: "DELETE")
        guard code == 200 else { throw AccountError.failed(message(data, fallback: "You could not be signed out. Please try again.")) }
        keychain.delete()
        status = .signedOut
    }

    public func updateDisplayName(_ name: String) async throws {
        let (data, code) = try await request("/session", method: "PATCH", body: ["displayName": name])
        guard code == 200, let reply = try? JSONDecoder().decode(SessionReply.self, from: data), let member = reply.member else {
            throw AccountError.failed(message(data, fallback: "Your name could not be saved. Please try again."))
        }
        status = .signedIn(member)
    }

    public func deleteAccount() async throws {
        guard let member else { return }
        let (data, code) = try await request("/delete", method: "POST", body: ["email": member.email])
        guard code == 200 else { throw AccountError.failed(message(data, fallback: "Your account could not be deleted. Please try again.")) }
        keychain.delete()
        status = .signedOut
    }

    static func randomURLSafe(_ count: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: count)
        _ = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
        return Data(bytes).base64URLEncoded
    }
}

extension Data {
    var base64URLEncoded: String {
        base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}

private final class PresentationAnchor: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.keyWindow }.first ?? ASPresentationAnchor()
        }
    }
}
