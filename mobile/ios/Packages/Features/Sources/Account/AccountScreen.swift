import EatYeetAPI
import EatYeetUI
import FeatureSupport
import SwiftUI

/// The site's /account/sign-in and /account/settings in one screen: Sign in when signed out,
/// Account settings (public name, sign out everywhere, delete) when signed in.
public struct AccountScreen: View {
    @Environment(AccountStore.self) private var account
    @State private var error: String?
    @State private var working = false
    @State private var name = ""
    @State private var nameResult: (ok: Bool, text: String)?
    @State private var confirmingDelete = false

    public init() {}

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                switch account.status {
                case .unknown: ProgressView().frame(maxWidth: .infinity).padding(.top, 48)
                case .signedOut: signIn
                case .signedIn(let member): settings(member)
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(.horizontal, 16).padding(.vertical, 48)
            .frame(maxWidth: 440, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(Palette.background)
        .navigationBarTitleDisplayMode(.inline)
        .task { await account.refresh() }
        .onChange(of: account.member?.displayName, initial: true) { _, value in name = value ?? "" }
    }

    // MARK: Sign in

    private var signIn: some View {
        VStack(alignment: .leading, spacing: 0) {
            PageTitle("Sign in")
            Text("Rate and review recipes, and keep your remixes and their history on every device.")
                .font(Typeface.body(14, relativeTo: .subheadline)).foregroundStyle(Palette.mutedForeground)
                .padding(.top, 8)
            VStack(alignment: .leading, spacing: 20) {
                if let error { AlertBox(error) }
                if !account.googleAvailable { AlertBox("Sign-in is unavailable right now. Please try again later.") }
                if account.googleAvailable {
                    Button {
                        Task { await run { try await account.signIn() } }
                    } label: {
                        Text(working ? "Signing in…" : "Continue with Google").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(working)
                    .accessibilityIdentifier("continue-with-google")
                }
                Text("New here? Continuing creates your account. By signing in you agree to the [Terms of Use](https://eatyeet.com/terms) and [Privacy Policy](https://eatyeet.com/privacy).")
                    .font(Typeface.body(12, relativeTo: .caption)).foregroundStyle(Palette.mutedForeground)
                    .tint(Palette.mutedForeground)
            }
            .padding(.top, 24)
        }
    }

    // MARK: Settings

    private func settings(_ member: Member) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            PageTitle("Account settings")
            (Text("Signed in as ") + Text(member.email).bold().foregroundColor(Palette.ink) + Text(" with Google."))
                .font(Typeface.body(14, relativeTo: .subheadline)).foregroundStyle(Palette.mutedForeground)
                .padding(.top, 8).padding(.bottom, 32)
            if let error { AlertBox(error).padding(.bottom, 16) }

            SettingsSection("Public name", "Shown on your reviews and replies.") {
                TextField("Public name", text: $name)
                    .textContentType(.nickname)
                    .font(Typeface.body(16))
                    .padding(.horizontal, 14).frame(minHeight: 48)
                    .background(Palette.background, in: .rect(cornerRadius: Radius.field))
                    .overlay { RoundedRectangle(cornerRadius: Radius.field).strokeBorder(Palette.input, lineWidth: 1) }
                    .onChange(of: name) { nameResult = nil }
                if let nameResult {
                    Text(nameResult.text).font(Typeface.body(14))
                        .foregroundStyle(nameResult.ok ? Palette.ink : Palette.danger)
                }
                Button(working ? "Saving..." : "Save name") {
                    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !trimmed.isEmpty, trimmed.count <= 80 else { nameResult = (false, "Enter a name of 80 characters or fewer."); return }
                    Task {
                        working = true
                        defer { working = false }
                        do { try await account.updateDisplayName(trimmed); nameResult = (true, "Public name saved.") }
                        catch { nameResult = (false, error.localizedDescription) }
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(working || name.trimmingCharacters(in: .whitespacesAndNewlines) == member.displayName)
            }

            SettingsSection("Sign out everywhere", "Ends every session, including this one.") {
                Button(working ? "Signing out..." : "Sign out everywhere") {
                    Task { await run { try await account.signOutEverywhere() } }
                }
                .buttonStyle(OutlineButtonStyle())
                .disabled(working)
            }

            SettingsSection("Delete account", "Permanently deletes your account, ratings, reviews, replies and remixes.") {
                Button("Delete my account") { confirmingDelete = true }
                    .buttonStyle(DangerButtonStyle())
            }
        }
        .alert("Delete your account?", isPresented: $confirmingDelete) {
            Button("Cancel", role: .cancel) {}
            Button("Delete account", role: .destructive) {
                Task { await run { try await account.deleteAccount() } }
            }
        } message: {
            Text("This permanently deletes your account, ratings, reviews, replies and remixes with their history, including replies other cooks left on your reviews. This can’t be undone.")
        }
    }

    private func run(_ action: () async throws -> Void) async {
        working = true
        error = nil
        defer { working = false }
        do { try await action() }
        catch let failure as AccountError where failure == .cancelled {}
        catch { self.error = error.localizedDescription }
    }
}

struct PageTitle: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text)
            .font(Typeface.display(38, relativeTo: .largeTitle))
            .tracking(38 * 0.02)
            .accessibilityAddTraits(.isHeader)
    }
}

/// Heading and explanation above the controls, separated by a top rule (the site's settings Section, stacked).
struct SettingsSection<Content: View>: View {
    let title: String
    let description: String
    @ViewBuilder let content: Content
    init(_ title: String, _ description: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.description = description
        self.content = content()
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(Typeface.body(18, weight: .semibold)).accessibilityAddTraits(.isHeader)
                Text(description).font(Typeface.body(14, relativeTo: .subheadline)).foregroundStyle(Palette.mutedForeground)
            }
            VStack(alignment: .leading, spacing: 16) { content }
        }
        .padding(.vertical, 32)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .top) { Rectangle().fill(Palette.border).frame(height: 1) }
    }
}

struct AlertBox: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text).font(Typeface.body(14))
            .padding(12).frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.tint, in: .rect(cornerRadius: Radius.field))
            .overlay { RoundedRectangle(cornerRadius: Radius.field).strokeBorder(Palette.border) }
            .accessibilityAddTraits(.isStaticText)
    }
}

/// The site's outlined (utility) and danger buttons.
struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline).foregroundStyle(Palette.ink)
            .padding(.horizontal, 24).frame(minHeight: 48)
            .background(configuration.isPressed ? Palette.tint : Palette.background, in: .capsule)
            .overlay { Capsule().strokeBorder(Palette.ink, lineWidth: 1.5) }
    }
}

struct DangerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline).foregroundStyle(.white)
            .padding(.horizontal, 24).frame(minHeight: 48)
            .background(Palette.danger.opacity(configuration.isPressed ? 0.85 : 1), in: .capsule)
    }
}
