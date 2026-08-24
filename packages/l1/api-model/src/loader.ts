export type AsyncLoader<Args extends readonly unknown[], Result> = (...args: Args) => Promise<Result>
