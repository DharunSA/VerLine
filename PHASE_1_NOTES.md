# Phase 1 Notes — Core Graph MVP

## Accomplished
1. **Scaffolded React 18 + TypeScript + Vite project** with Tailwind CSS v4 and warm heirloom design tokens.
2. **Built deterministic relationship engine (`src/engine/`)**:
   - `graph.ts`: In-memory adjacency maps (`parentsOf`, `childrenOf`, `spousesOf`).
   - `relationshipPath.ts`: BFS path finder tagging steps UP / DOWN / LATERAL.
   - `relationshipLabel.ts`: Classifier converting move sequences to precise labels (1st cousin, grand-parent, Nth removed, half-sibling) + degree + path summary.
3. **Unit Tests**: 20 comprehensive Vitest unit tests covering nuclear family, grandparents, first cousins, half-siblings, cousins once removed, spouse of cousin, adopted children, and unrelated nodes — **all 20 tests pass cleanly**.
4. **Tree Canvas**: Built using `@xyflow/react` v12 and `dagre` hierarchical auto-layout:
   - Generations stacked top-to-bottom.
   - Spouses placed side-by-side with custom `♡` marriage edges.
   - Custom `PersonNode` with photo/initials avatar, life dates, profession tag, and branch collapse toggle.
   - Mini controls panel and canvas legend.
5. **Member Drawer & Add Member Modal**:
   - Side drawer with profile tabs (Details | Family | Timeline).
   - 2-step Add Member Modal with Zod validation, fuzzy duplicate detection (Fuse.js), and relationship picker.
6. **Supabase Integration**:
   - Client setup with fallback demo mode.
   - Complete Postgres schema DDL (`supabase/schema.sql`) with RLS policies and indexes.

## Acceptance Criteria
- [x] Create small family (self, parents, sibling, child), view auto-laid-out canvas.
- [x] All 20 engine unit tests pass.
- [x] Production build compiles without errors.
