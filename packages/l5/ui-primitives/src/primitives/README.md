# Primitives

This folder contains the project's shadcn/Radix-style primitives.

Provenance:

- Generator config: `components.json`
- shadcn style: `radix-nova`
- Primitive alias: `@/components/primitives`
- Utility alias: `@/lib/utils`
- Icon library: `lucide`

Generated primitives are not pasted in unchanged. Before wiring a new shadcn
primitive into the app:

- Rename the stock `destructive` variant/token language to this repo's
  `danger` naming.
- Replace bare CSS variable references with the repo's `--color-*` token names.
- Keep primitives generic. Domain copy, route behavior, and composed app
  workflows belong in sibling owner folders such as `search/`, `recipes/`, or
  `catalog/`.
- Document any intentional divergence from the generated source in the file
  where it happens.
