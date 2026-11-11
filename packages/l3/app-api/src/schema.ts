// Generated from openapi.yaml by `pnpm app-api:gen`. Do not edit.
export interface paths {
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
