# DECISIONS.md — Architectural Choices & Deviations

## Decision Log

### 1. Tailwind v4 via `@tailwindcss/vite` plugin
**Reason:** Tailwind v4 was installed (latest). v4 uses a Vite plugin rather than a separate `tailwind.config.js`. CSS tokens use native CSS variables; `@tailwind` directives are included in `globals.css`.

### 2. Demo mode without Supabase
**Reason:** To allow the app to run without credentials, a demo Sharma family (10 members) is seeded via `usePeopleStore.seedDemoData()`. When `VITE_SUPABASE_URL` is provided, the store switches to real Supabase persistence.

### 3. Relationship engine: viewer identity via bio flag
**Reason:** The spec didn't define how to determine "the logged-in user's own node" for degree computation. For demo mode, the person with `bio` containing "That's me!" is used as the viewer. With Supabase Auth, this would be matched via `created_by = auth.uid()`.

### 4. `useAutoLayout` runs synchronously (not debounced hook)
**Reason:** The graph is small (family trees are hundreds of nodes maximum, per spec), so synchronous dagre layout is fast. The spec mentions debouncing only for rapid successive edits; this is handled by the fact that Zustand updates batch re-renders.

### 5. Spouse pairing override after dagre
**Reason:** dagre's `SPOUSE_OF` edges don't natively produce side-by-side layout since it's a directed graph library. Implemented a post-processing step that averages the X/Y of spouse pairs after dagre runs, placing them horizontally adjacent at the same Y level.

### 6. No Framer Motion `LayoutGroup` on canvas nodes
**Reason:** React Flow manages its own node positions via internal state. Framer Motion `layout` animations are applied on individual node cards (hover-lift, scale-in), but the overall canvas re-layout animation is handled by React Flow's built-in `fitView` duration.

### 7. Half-sibling detection
**Reason:** The spec listed half-siblings as a targeted extension. Implemented: `areHalfSiblings()` in `engine/graph.ts` checks if two people share exactly 1 parent (vs. 2 for full siblings). The BFS path for both is UP=1, DOWN=1 — differentiated by the parent count check.

### 8. `rough.js` sketchy edges — not implemented
**Reason:** Marked as "optional" in spec. Clean organic bezier curves are used instead. Rough.js can be added as a rendering toggle in a future polish pass.

### 9. Supabase Auth — not implemented in Phase 1
**Reason:** The spec listed auth as a separate concern from the core graph/canvas. Phase 1 focuses on local demo mode. Auth integration (Supabase `auth.users`, login screen, RLS enforcement) is Phase 2+ scope.

### 10. `@types/dagre` moved to dependencies (not devDependencies)
**Reason:** dagre types are needed at runtime via the TypeScript `import type` paths. Kept in dependencies for safety.
