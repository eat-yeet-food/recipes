import Foundation

/// `/api/public/account/ratings/<slug>`: the aggregate for anyone, ownership flags for the signed-in member.
public struct RatingSummary: Codable, Equatable, Sendable {
    public struct Reply: Codable, Equatable, Sendable, Identifiable {
        public let id: String
        public let name: String
        public let body: String
        public let own: Bool
    }
    public struct Review: Codable, Equatable, Sendable, Identifiable {
        public let id: String
        public let name: String
        public let score: Int
        public let reviewText: String
        public let own: Bool
        public let replies: [Reply]
    }
    public let average: Double?
    public let count: Int
    public let eatPercentage: Int?
    public let ownRating: Int?
    public let ownReview: String
    public let reviews: [Review]
}

extension AccountStore {
    private func ratings(_ slug: String, _ suffix: String = "", method: String = "GET", body: [String: String]? = nil, fallback: String) async throws -> RatingSummary {
        let path = "/ratings/\(slug)\(suffix)"
        let (data, code) = try await request(path, method: method, body: body)
        guard code == 200, let summary = try? JSONDecoder().decode(RatingSummary.self, from: data) else {
            throw AccountError.failed(message(data, fallback: fallback))
        }
        return summary
    }

    public func readRatings(_ slug: String) async throws -> RatingSummary {
        try await ratings(slug, fallback: "Ratings are unavailable. Please try again.")
    }

    public func saveRating(_ slug: String, score: Int, reviewText: String) async throws -> RatingSummary {
        // The route takes an integer score; encode the body by hand so it isn't a string.
        let (data, code) = try await requestJSON("/ratings/\(slug)", method: "PUT", json: ["score": score, "reviewText": reviewText])
        guard code == 200, let summary = try? JSONDecoder().decode(RatingSummary.self, from: data) else {
            throw AccountError.failed(message(data, fallback: "Your rating could not be saved. Please try again."))
        }
        return summary
    }

    public func deleteRating(_ slug: String) async throws -> RatingSummary {
        try await ratings(slug, method: "DELETE", fallback: "Your rating could not be deleted. Please try again.")
    }

    public func reply(_ slug: String, reviewId: String, body: String) async throws -> RatingSummary {
        try await ratings(slug, "/replies", method: "POST", body: ["reviewId": reviewId, "body": body], fallback: "Your reply could not be posted. Please try again.")
    }

    public func deleteReply(_ slug: String, replyId: String) async throws -> RatingSummary {
        try await ratings(slug, "/replies/\(replyId)", method: "DELETE", fallback: "Your reply could not be deleted. Please try again.")
    }
}
