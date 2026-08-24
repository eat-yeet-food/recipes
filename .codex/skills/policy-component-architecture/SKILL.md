---
name: policy-component-architecture
description: Use when adding or changing UI components, tests, stories, or project layout in this repository.
---

# Component Architecture Policy

Use the existing component layers deliberately:

- `src/components/primitives/`: generated or primitive shadcn/Radix-style controls.
- `src/components/shell/`: site chrome, frame, wordmark, and global error states.
- `src/components/catalog/`: reusable recipe/catalog cards, grids, and section headings.
- `src/components/content-blocks/`: generic page-block renderers for markdown, image, and embedded media.
- `src/components/home/`, `src/components/search/`, `src/components/recipes/`: composed domain surfaces.
- `src/routes/`: route modules and route-level behavior tests.
- `src/lib/`: shared pure logic, with unit tests beside the module.

Tests and stories for behavior owned by a source module live beside that module:
`thing.test.ts`, `thing.test.mjs`, or `thing.stories.tsx`. The top-level
`test/` directory is for shared harnesses, static servers, visual baselines,
production verification, and visual parity checks that have no source-module
owner.

Do not add a global test file for behavior owned by a route, component, or lib
module. Co-locate it first.
