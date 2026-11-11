import os

/// Signposts read by `pnpm ios:perf` (subsystem com.phoganuci.eatyeet, category perf).
public enum Perf {
    public static let signposter = OSSignposter(subsystem: "com.phoganuci.eatyeet", category: "perf")
    public static let launchContent: StaticString = "launch-content"
    public static let recipeInteractive: StaticString = "recipe-interactive"
}
