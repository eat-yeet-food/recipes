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
                case .unknown: ProgressView().frame(maxWidth: .infinity).padding(.top, Space.s12)
                case .signedOut: signIn
                case .signedIn(let member): settings(member)
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(.horizontal, Space.s4).padding(.vertical, Space.s12)
            .frame(maxWidth: Measure.formWidth, alignment: .leading)
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
                .font(Typeface.body(.sm, relativeTo: .subheadline)).foregroundStyle(Palette.mutedForeground)
                .padding(.top, Space.s2)
            VStack(alignment: .leading, spacing: Space.s5) {
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
                    .font(Typeface.body(.xs, relativeTo: .caption)).foregroundStyle(Palette.mutedForeground)
                    .tint(Palette.mutedForeground)
            }
            .padding(.top, Space.s6)
        }
    }

    // MARK: Settings

    private func settings(_ member: Member) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            PageTitle("Account settings")
            (Text("Signed in as ") + Text(member.email).fontWeight(.black).foregroundColor(Palette.ink) + Text(" with Google."))
                .font(Typeface.body(.sm, relativeTo: .subheadline)).foregroundStyle(Palette.mutedForeground)
                .padding(.top, Space.s2).padding(.bottom, Space.s8)
            if let error { AlertBox(error).padding(.bottom, Space.s4) }

            SettingsSection("Public name", "Shown on your reviews and replies.") {
                TextField("Public name", text: $name)
                    .textContentType(.nickname)
                    .font(Typeface.body(.base))
                    .padding(.horizontal, Space.s3_5).frame(minHeight: Control.regular)
                    .background(Palette.background, in: .rect(cornerRadius: Radius.field))
                    .overlay { RoundedRectangle(cornerRadius: Radius.field).strokeBorder(Palette.input, lineWidth: Stroke.hairline) }
                    .onChange(of: name) { nameResult = nil }
                if let nameResult {
                    Text(nameResult.text).font(Typeface.body(.sm))
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

            SettingsSection("Sign out", "Signs out of the app on this iPhone.") {
                Button("Sign out") { Task { await account.signOut() } }
                    .buttonStyle(OutlineButtonStyle())
                    .disabled(working)
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
            .font(Typeface.display(.page, relativeTo: .largeTitle))
            .tracking(Tracking.title(.page))
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
        VStack(alignment: .leading, spacing: Space.s4) {
            VStack(alignment: .leading, spacing: Space.s1) {
                Text(title).font(Typeface.body(.lg, weight: .semibold)).accessibilityAddTraits(.isHeader)
                Text(description).font(Typeface.body(.sm, relativeTo: .subheadline)).foregroundStyle(Palette.mutedForeground)
            }
            VStack(alignment: .leading, spacing: Space.s4) { content }
        }
        .padding(.vertical, Space.s8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .top) { Rectangle().fill(Palette.border).frame(height: Stroke.hairline) }
    }
}

struct AlertBox: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text).font(Typeface.body(.sm))
            .padding(Space.s3).frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.tint, in: .rect(cornerRadius: Radius.field))
            .overlay { RoundedRectangle(cornerRadius: Radius.field).strokeBorder(Palette.border) }
            .accessibilityAddTraits(.isStaticText)
    }
}

/// The site's outlined (utility) and danger buttons.
struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Typeface.body(.base, weight: .semibold)).foregroundStyle(Palette.ink)
            .padding(.horizontal, Space.s6).frame(minHeight: Control.regular)
            .background(configuration.isPressed ? Palette.tint : Palette.background, in: .capsule)
            .overlay { Capsule().strokeBorder(Palette.ink, lineWidth: Stroke.control) }
    }
}

struct DangerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Typeface.body(.base, weight: .semibold)).foregroundStyle(Palette.white)
            .padding(.horizontal, Space.s6).frame(minHeight: Control.regular)
            .background(configuration.isPressed ? Palette.dangerPressed : Palette.danger, in: .capsule)
    }
}
