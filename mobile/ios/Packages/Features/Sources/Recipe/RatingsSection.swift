import EatYeetAPI
import EatYeetUI
import SwiftUI

/// The site's Ratings & Reviews module: a striped card to rate (or sign in), then the plum
/// summary and the reviews with their replies. Reloads when the member changes.
struct RatingsSection: View {
    @Environment(AccountStore.self) private var account
    let slug: String

    @State private var summary: RatingSummary?
    @State private var score: Int?
    @State private var reviewText = ""
    @State private var saving = false
    @State private var error = ""
    @State private var message = ""
    @State private var replyingTo: String?
    @State private var replyBody = ""
    @State private var replyError = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 16) {
                Text("Ratings & Reviews")
                    .font(Typeface.display(30, relativeTo: .title))
                    .accessibilityAddTraits(.isHeader)
                    .fixedSize()
                LinearGradient(colors: [Palette.brand, Palette.brandAlt], startPoint: .leading, endPoint: .trailing)
                    .frame(height: 3).clipShape(.capsule).accessibilityHidden(true)
            }
            .padding(.bottom, 24)

            rateCard.padding(.bottom, 32)
            if let summary { reviews(summary) }
        }
        .foregroundStyle(Palette.ink)
        .task(id: account.member?.id) { await load() }
    }

    private var signedIn: Bool { account.member != nil }
    private var rated: Bool { (summary?.ownRating ?? 0) > 0 }

    private func apply(_ value: RatingSummary) {
        summary = value
        score = value.ownRating
        reviewText = value.ownReview
    }

    private func load() async {
        guard account.status != .unknown else { return }
        do { apply(try await account.readRatings(slug)); error = "" }
        catch { self.error = "Ratings are unavailable. Please try again." }
    }

    // MARK: Rate

    private var rateCard: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text(rated ? "Update your rating" : "Rate this recipe")
                .font(Typeface.display(30, weight: .black, relativeTo: .title))
                .accessibilityAddTraits(.isHeader)
            if account.status != .unknown && !signedIn {
                Text("Sign in to rate this recipe, write a review, or reply to other cooks.").font(Typeface.body(14))
                Button {
                    Task { try? await account.signIn() }
                } label: { Text("Sign in to rate").frame(maxWidth: .infinity) }
                .buttonStyle(PrimaryButtonStyle())
                if !error.isEmpty { callout(error) }
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Star rating").font(Typeface.body(14, weight: .medium)).foregroundStyle(Palette.mutedForeground)
                    HStack(spacing: 4) {
                        ForEach(1...5, id: \.self) { star in
                            Button { score = star; error = ""; message = "" } label: {
                                Image(systemName: star <= (score ?? 0) ? "star.fill" : "star")
                                    .font(.system(size: 24, weight: .light))
                                    .frame(width: 44, height: 44)
                            }
                            .accessibilityLabel("\(star) \(star == 1 ? "star" : "stars")")
                            .accessibilityAddTraits(score == star ? .isSelected : [])
                        }
                    }
                    .sensoryFeedback(.selection, trigger: score)
                    .disabled(saving)
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("Review (optional)").font(Typeface.body(14, weight: .medium)).foregroundStyle(Palette.mutedForeground)
                    TextField("Share your experience...", text: $reviewText, axis: .vertical)
                        .lineLimit(4...10)
                        .font(Typeface.body(16))
                        .padding(14)
                        .overlay { RoundedRectangle(cornerRadius: Radius.field).strokeBorder(Palette.input) }
                        .onChange(of: reviewText) { _, value in if value.count > 2000 { reviewText = String(value.prefix(2000)) } }
                        .disabled(saving)
                    if let member = account.member {
                        Text("Posting as \(member.displayName).").font(Typeface.body(12)).foregroundStyle(Palette.mutedForeground)
                    }
                }
                if !error.isEmpty { callout(error) }
                Button {
                    Task { await submit() }
                } label: { Text(saving ? "Submitting..." : rated ? "Update Rating" : "Submit Rating").frame(maxWidth: .infinity) }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(score == nil || summary == nil || saving)
                .opacity(score == nil || summary == nil ? 0.5 : 1)
                if rated {
                    Button("Delete my rating") { Task { await remove() } }
                        .font(Typeface.body(14, weight: .bold)).underline()
                        .disabled(saving)
                }
                if !message.isEmpty {
                    Text(message).font(Typeface.body(14)).foregroundStyle(Palette.mutedForeground)
                        .accessibilityAddTraits(.updatesFrequently)
                }
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.card)
        .overlay(alignment: .top) { BrandStripe() }
        .clipShape(.rect(cornerRadius: Radius.surface))
        .overlay { RoundedRectangle(cornerRadius: Radius.surface).strokeBorder(Palette.border) }
    }

    private func callout(_ text: String) -> some View {
        Text(text).font(Typeface.body(14)).foregroundStyle(Palette.danger)
            .padding(12).frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.danger.opacity(0.08), in: .rect(cornerRadius: Radius.field))
    }

    private func submit() async {
        guard let score, !saving, signedIn else { return }
        saving = true; error = ""; message = ""
        defer { saving = false }
        do {
            apply(try await account.saveRating(slug, score: score, reviewText: reviewText))
            message = "Your \(score)-star rating\(reviewText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? " is" : " and review are") saved."
        } catch { self.error = error.localizedDescription }
    }

    private func remove() async {
        saving = true; error = ""; message = ""
        defer { saving = false }
        do { apply(try await account.deleteRating(slug)); message = "Your rating was deleted." }
        catch { self.error = error.localizedDescription }
    }

    // MARK: Reviews

    @ViewBuilder
    private func reviews(_ summary: RatingSummary) -> some View {
        if summary.count == 0 {
            Text("No reviews yet. Be the first!").font(Typeface.body(14)).foregroundStyle(Palette.mutedForeground)
        } else if let average = summary.average {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 20) {
                    Text(String(format: "%.1f", average))
                        .font(Typeface.body(34, weight: .bold)).monospacedDigit()
                        .foregroundStyle(Palette.brand)
                    VStack(alignment: .leading, spacing: 4) {
                        Stars(value: average, filled: Palette.brand, empty: Palette.onDarkLabel)
                        HStack(spacing: 8) {
                            Text("\(summary.count) \(summary.count == 1 ? "rating" : "ratings")").font(Typeface.body(14))
                            let eat = summary.eatPercentage ?? 0
                            Text(eat >= 50 ? "\(eat)% EAT" : "\(100 - eat)% YEET")
                                .font(Typeface.body(12, weight: .bold)).foregroundStyle(Palette.ink)
                                .padding(.horizontal, 10).padding(.vertical, 2)
                                .background(Palette.brand, in: .capsule)
                        }
                    }
                }
                .foregroundStyle(Palette.onDarkLabel)
                .padding(20).frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.ink, in: .rect(cornerRadius: Radius.surface))

                ForEach(summary.reviews) { review in reviewRow(review) }
            }
        }
    }

    private func reviewRow(_ review: RatingSummary.Review) -> some View {
        HStack(alignment: .top, spacing: 16) {
            Initial(name: review.name, size: 40)
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 8) {
                    Text(review.name).font(Typeface.body(14, weight: .bold))
                    Text(review.score >= 4 ? "EAT" : "YEET").font(Typeface.body(12, weight: .bold))
                        .padding(.horizontal, 10).padding(.vertical, 2).background(Palette.brandSoft, in: .capsule)
                    if review.own { Text("Your review").font(Typeface.body(12)).foregroundStyle(Palette.mutedForeground) }
                }
                .padding(.bottom, 4)
                Stars(value: Double(review.score), filled: Palette.ink, empty: Palette.mutedForeground).padding(.bottom, 8)
                if !review.reviewText.isEmpty { Text(review.reviewText).font(Typeface.body(14)) }

                if !review.replies.isEmpty {
                    VStack(alignment: .leading, spacing: 16) {
                        ForEach(review.replies) { reply in
                            HStack(alignment: .top, spacing: 12) {
                                Initial(name: reply.name, size: 32)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(reply.name).font(Typeface.body(12, weight: .bold))
                                    Text(reply.body).font(Typeface.body(14))
                                    if reply.own {
                                        Button("Delete") { Task { await deleteReply(reply.id) } }
                                            .font(Typeface.body(12, weight: .bold)).underline()
                                            .accessibilityLabel("Delete your reply to \(review.name)")
                                    }
                                }
                            }
                        }
                    }
                    .padding(.leading, 16).padding(.top, 16)
                    .overlay(alignment: .leading) { Rectangle().fill(Palette.brand).frame(width: 2).padding(.top, 16) }
                }

                if signedIn {
                    Button(replyingTo == review.id ? "Cancel reply" : review.replies.isEmpty ? "Reply" : "Reply again") {
                        replyingTo = replyingTo == review.id ? nil : review.id
                        replyBody = ""; replyError = ""
                    }
                    .font(Typeface.body(14, weight: .bold)).underline()
                    .padding(.top, 12)
                } else {
                    Button("Sign in to reply") { Task { try? await account.signIn() } }
                        .font(Typeface.body(14, weight: .bold)).underline()
                        .padding(.top, 12)
                }

                if replyingTo == review.id {
                    VStack(alignment: .leading, spacing: 16) {
                        TextField("Reply to \(review.name)...", text: $replyBody, axis: .vertical)
                            .lineLimit(3...8).font(Typeface.body(16)).padding(14)
                            .overlay { RoundedRectangle(cornerRadius: Radius.field).strokeBorder(Palette.input) }
                            .onChange(of: replyBody) { _, value in if value.count > 1000 { replyBody = String(value.prefix(1000)) } }
                        if !replyError.isEmpty { Text(replyError).font(Typeface.body(14)).foregroundStyle(Palette.danger) }
                        Button(saving ? "Posting..." : "Post Reply") { Task { await postReply(review.id) } }
                            .buttonStyle(PrimaryButtonStyle())
                            .disabled(saving || replyBody.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                    .padding(.top, 16)
                }
            }
        }
        .padding(.bottom, 20)
        .overlay(alignment: .bottom) { Rectangle().fill(Palette.border).frame(height: 1) }
        .accessibilityElement(children: .contain)
    }

    private func postReply(_ reviewId: String) async {
        saving = true; replyError = ""
        defer { saving = false }
        do { apply(try await account.reply(slug, reviewId: reviewId, body: replyBody)); replyingTo = nil; replyBody = "" }
        catch { replyError = error.localizedDescription }
    }

    private func deleteReply(_ id: String) async {
        do { apply(try await account.deleteReply(slug, replyId: id)) }
        catch { self.error = error.localizedDescription }
    }
}

private struct Stars: View {
    let value: Double
    let filled: Color
    let empty: Color
    var body: some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: Double(star) <= value.rounded() ? "star.fill" : "star")
                    .font(.system(size: 16, weight: .light))
                    .foregroundStyle(Double(star) <= value.rounded() ? filled : empty)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(String(format: "%.1f out of 5 stars", value))
    }
}

private struct Initial: View {
    let name: String
    let size: CGFloat
    var body: some View {
        Text(String(name.first ?? "C").uppercased())
            .font(Typeface.body(size > 36 ? 14 : 12, weight: .bold))
            .frame(width: size, height: size)
            .background(Palette.brandSoft, in: .circle)
            .accessibilityHidden(true)
    }
}
