// Generated from openapi.yaml by `pnpm app-api:gen`. Do not edit.
export interface paths {
    "/home": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getHome"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/remix": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listRemixRecipes"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/remix/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getRemixRecipe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/remix/{slug}/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["resolveRemix"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/recipes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listRecipes"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/recipes/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getRecipe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Error: {
            error: string;
        };
        ImageVariant: {
            url: string;
            width: number;
            format: string;
        };
        Image: {
            url: string;
            width: number;
            height: number;
            alt: string;
            focalPoint?: number[];
            variants: components["schemas"]["ImageVariant"][];
        };
        RecipeSummary: {
            slug: string;
            title: string;
            description: string;
            category: string;
            image: string;
            totalLabel: string;
            prepLabel: string;
            cookLabel: string;
            timeLabel: string;
            yieldLabel: string;
            courses: string[];
            methods: string[];
            cuisines: string[];
            restrictions: string[];
            searchText: string;
            order: number;
        };
        Heading: {
            title: string;
            intro: string;
        };
        Fact: {
            label: string;
            value: string;
        };
        Home: {
            wordmark: {
                first: string;
                second: string;
            };
            hero: {
                image: string;
                imageAlt: string;
                /** @description Line breaks are significant. */
                headline: string;
                /** @description The headline word set in the pink sticker; empty means the last word. */
                sticker: string;
                kicker: string;
                motto: string;
                cta: string;
            };
            latest: {
                eyebrow: string;
                title: string;
                recipes: components["schemas"]["RecipeSummary"][];
            };
            browse: {
                eyebrow: string;
                title: string;
                categories: components["schemas"]["Category"][];
            };
            navigation: components["schemas"]["NavLink"][];
            images: {
                [key: string]: components["schemas"]["Image"];
            };
        };
        RemixIndex: {
            recipes: {
                slug: string;
                title: string;
                image: string;
                family: string;
                label: string;
                facts: string;
            }[];
            images: {
                [key: string]: components["schemas"]["Image"];
            };
        };
        RemixRecipe: {
            slug: string;
            title: string;
            image: string;
            /** @description The calculator: sourdough or pizza. */
            family: string;
            label: string;
            /** @description The calculator's opaque state as written; the app edits known fields and keeps the rest. */
            defaultState: {
                [key: string]: unknown;
            };
            methods: {
                id: string;
                label: string;
            }[];
            /** @description Pizza sizes and the ball weight each takes; empty for bread. */
            pizzaSizes: {
                inches: number;
                ballGrams: number;
            }[];
            images: {
                [key: string]: components["schemas"]["Image"];
            };
        };
        RemixChange: {
            label: string;
            from: string;
            to: string;
        };
        RemixResolution: {
            valid: boolean;
            errors: string[];
            facts: string;
            total: string;
            totalDetail: string;
            changes: components["schemas"]["RemixChange"][];
            batchNoun: string;
            /** @description The projected recipe; absent when the state is invalid. */
            recipe?: components["schemas"]["Recipe"];
        };
        Category: {
            slug: string;
            label: string;
            facet: string;
            value: string;
            image: string;
        };
        NavLink: {
            label: string;
            href: string;
        };
        RecipeIndex: {
            heading: components["schemas"]["Heading"];
            recipes: components["schemas"]["RecipeSummary"][];
            images: {
                [key: string]: components["schemas"]["Image"];
            };
        };
        Item: {
            id: string;
            html: string;
        };
        Section: {
            id: string;
            title: string;
            items: components["schemas"]["Item"][];
        };
        Ingredient: {
            id: string;
            html: string;
            /** @description Leading amount, removed from html; empty when none. */
            amount: string;
        };
        IngredientSection: {
            id: string;
            title: string;
            items: components["schemas"]["Ingredient"][];
        };
        Need: {
            key: string;
            amount: string;
            name: string;
        };
        Step: {
            id: string;
            html: string;
            needs: components["schemas"]["Need"][];
            time: string | null;
            minutes: number | null;
            rest: string | null;
            emphasis: boolean;
            /** @description Durations written in the step ("bake 13–15 minutes"), as tap-to-start cook-mode timers set to the shorter end. */
            timers: components["schemas"]["StepTimer"][];
        };
        StepTimer: {
            label: string;
            minutes: number;
        };
        StepSection: {
            id: string;
            title: string;
            timeOrigin: string | null;
            timed: boolean;
            items: components["schemas"]["Step"][];
        };
        RecipeBlock: {
            ingredients: components["schemas"]["IngredientSection"][];
            equipment: components["schemas"]["Section"][];
            steps: components["schemas"]["StepSection"][];
            notes: string[];
            tips: string[];
        };
        Recipe: {
            slug: string;
            title: string;
            description: string;
            category: string;
            image: string;
            totalLabel: string;
            prepLabel: string;
            cookLabel: string;
            timeLabel: string;
            yieldLabel: string;
            courses: string[];
            methods: string[];
            cuisines: string[];
            restrictions: string[];
            searchText: string;
            order: number;
            facts: components["schemas"]["Fact"][];
            blocks: components["schemas"]["RecipeBlock"][];
        };
        Batch: {
            count: number;
            noun: string;
            plural: string;
        };
        RecipeDetail: {
            recipe: components["schemas"]["Recipe"];
            /** @description Today's count; omitted for recipes without a calculator. */
            batch?: components["schemas"]["Batch"];
            images: {
                [key: string]: components["schemas"]["Image"];
            };
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getHome: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The home page (hero, What's New, featured categories) and the phone menu. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Home"];
                };
            };
        };
    };
    listRemixRecipes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Recipes Remix can start from. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RemixIndex"];
                };
            };
        };
    };
    getRemixRecipe: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The recipe's calculator state as written and its choices. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RemixRecipe"];
                };
            };
            /** @description No remixable recipe with this slug. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    resolveRemix: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    state: {
                        [key: string]: unknown;
                    };
                };
            };
        };
        responses: {
            /** @description Validation, facts, totals, changes and the projected recipe for this state. Computes only; stores nothing. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RemixResolution"];
                };
            };
            /** @description Malformed or oversized request. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description No remixable recipe with this slug. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listRecipes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Published recipes in display order, with their images. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecipeIndex"];
                };
            };
        };
    };
    getRecipe: {
        parameters: {
            query?: {
                /** @description Today's batch count, clamped to 1–99. Ignored for recipes without a calculator. */
                count?: number;
            };
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The recipe as written, projected for today's count. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecipeDetail"];
                };
            };
            /** @description Not found or not published. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
}
