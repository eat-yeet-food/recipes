import EatYeetCore
import Foundation
import HTTPTypes
import OpenAPIRuntime
import OpenAPIURLSession

public typealias RecipeIndex = Components.Schemas.RecipeIndex
public typealias RecipeSummary = Components.Schemas.RecipeSummary
public typealias RecipeDetail = Components.Schemas.RecipeDetail
public typealias RecipeImage = Components.Schemas.Image

public enum AppAPIError: Error, Equatable {
    case notFound
    case unexpected(status: Int)
}

/// Typed access to `/api/public/app/v1`, generated from the shared OpenAPI spec.
public struct AppAPI: Sendable {
    private let client: Client

    public init(base: URL, session: URLSession = .shared) {
        client = Client(
            serverURL: base.appending(path: "api/public/app/v1"),
            transport: URLSessionTransport(configuration: .init(session: session)),
            middlewares: [NetworkLogMiddleware()])
    }

    public func recipes() async throws -> RecipeIndex {
        switch try await client.listRecipes() {
        case .ok(let ok): return try ok.body.json
        case .undocumented(let status, _): throw AppAPIError.unexpected(status: status)
        }
    }

    public func recipe(slug: String, count: Int? = nil) async throws -> RecipeDetail {
        switch try await client.getRecipe(path: .init(slug: slug), query: .init(count: count)) {
        case .ok(let ok): return try ok.body.json
        case .notFound: throw AppAPIError.notFound
        case .undocumented(let status, _): throw AppAPIError.unexpected(status: status)
        }
    }
}

/// Feeds every request into the dev menu's network log.
struct NetworkLogMiddleware: ClientMiddleware {
    func intercept(
        _ request: HTTPRequest, body: HTTPBody?, baseURL: URL, operationID: String,
        next: @Sendable (HTTPRequest, HTTPBody?, URL) async throws -> (HTTPResponse, HTTPBody?)
    ) async throws -> (HTTPResponse, HTTPBody?) {
        let start = ContinuousClock.now
        let url = URL(string: request.path ?? "", relativeTo: baseURL)?.absoluteURL ?? baseURL
        do {
            let (response, responseBody) = try await next(request, body, baseURL)
            // Buffer so the preview can be logged and the body still decoded.
            var data = Data()
            if let responseBody { data = try await Data(collecting: responseBody, upTo: 8 * 1024 * 1024) }
            await log(request.method.rawValue, url, response.status.code, start, data)
            return (response, HTTPBody(data))
        } catch {
            await log(request.method.rawValue, url, nil, start, Data(String(describing: error).utf8))
            throw error
        }
    }

    private func log(_ method: String, _ url: URL, _ status: Int?, _ start: ContinuousClock.Instant, _ body: Data) async {
        let elapsed = ContinuousClock.now - start
        let ms = Int(elapsed.components.seconds * 1000 + elapsed.components.attoseconds / 1_000_000_000_000_000)
        let entry = NetworkLogEntry(method: method, url: url, status: status, milliseconds: ms,
                                    bodyPreview: String(decoding: body.prefix(512), as: UTF8.self), at: .now)
        await MainActor.run { NetworkLog.shared.record(entry) }
    }
}
