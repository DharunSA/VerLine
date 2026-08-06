# 🌳 VerLine — Complete Technical Architecture & Viva Presentation Documentation

This document provides a comprehensive technical breakdown of **VerLine** (*Your Roots, in One Line*), designed to help present the project to evaluators, guides, and technical leads.

---

## 📋 Table of Contents
1. [Project Overview & Vision](#1-project-overview--vision)
2. [Technology Stack & Architecture](#2-technology-stack--architecture)
3. [Deep Technical Implementation Breakdown](#3-deep-technical-implementation-breakdown)
   - [A. Multi-Provider AI Natural Language Pipeline](#a-multi-provider-ai-natural-language-pipeline)
   - [B. Graph Theory & Automatic Topological Generation Layout](#b-graph-theory--automatic-topological-generation-layout)
   - [C. Kinship Pathfinding & Relationship Degree Engine](#c-kinship-pathfinding--relationship-degree-engine)
   - [D. Custom Damerau-Levenshtein Fuzzy Search Engine](#d-custom-damerau-levenshtein-fuzzy-search-engine)
   - [E. Hybrid Drag-and-Drop Line Linker](#e-hybrid-drag-and-drop-line-linker)
4. [Aesthetics & UX Design System](#4-aesthetics--ux-design-system)
5. [Key Technical Questions & Answers for Viva / Evaluation](#5-key-technical-questions--answers-for-viva--evaluation)

---

## 1. Project Overview & Vision

**VerLine** is an heirloom-grade, AI-enhanced, living family tree platform designed for multi-generational genealogical visualization. 

Unlike traditional tree editors that produce cluttered, overlapping node trees or require tedious manual form entry, VerLine combines:
1. **Natural Language AI Parsing**: Enter plain sentences like *"Dr. Ramesh is the elder brother of Arjun Sharma born in 1965 in Jaipur, he is a Surgeon"* to automatically parse and pre-fill family records.
2. **Deterministic Topological Graph Layout**: Automatically calculates generation bands, spouse pairings, and descendant branches with zero line collisions.
3. **Kinship Graph Search**: Calculates degree of relationship between any two members using Breadth-First Search (BFS).

---

## 2. Technology Stack & Architecture

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + TypeScript** | Strict type safety, component modularity, high UI state stability. |
| **Build System** | **Vite 5** | Lightning-fast HMR and optimized production bundling. |
| **Canvas & Graph Rendering** | **React Flow (`@xyflow/react`)** | Hardware-accelerated SVG/HTML5 canvas with interactive pan, zoom, and node dragging. |
| **Graph Auto-Layout Engine** | **Dagre.js** | Topological graph layout engine for multi-layered directed graphs. |
| **State Management** | **Zustand** | Lightweight, reactive state stores (`usePeopleStore`, `useUIStore`) without Redux boilerplate. |
| **AI LLM Providers** | **Google Gemini Flash (Primary) + Groq (Fallback)** | Multi-provider architecture combining Gemini Flash's rich JSON understanding with Groq's sub-200ms speed. |
| **Form Handling** | **React Hook Form + Zod** | High-performance form state management with strict schema validation. |
| **Styling Engine** | **Vanilla CSS Tokens + Framer Motion** | Custom Golden Heirloom design system with 60fps glassmorphism and spring physics animations. |

---

## 3. Deep Technical Implementation Breakdown

### A. Multi-Provider AI Natural Language Pipeline

#### System Design
The AI pipeline is designed for **high availability, zero user friction, and gracefull fallback**:

```
[User Input Sentence]
        │
        ▼
┌───────────────────────────────┐
│ Client-side / Edge Key Check  │
└───────────────┬───────────────┘
                │
   ┌────────────┴────────────┐
   ▼                         ▼
[Google Gemini 1.5 Flash]  [Groq Llama 3.1 8B]
(Primary LLM via AI Studio) (Sub-second Fast Path)
   │                         │
   └────────────┬────────────┘
                │ (JSON schema payload)
                ▼
  [Sanitization & Validation]
  - Birth Year: "1965" -> "1965-01-01"
  - Anchor Person ID matching
                │
                ▼
 [Pre-filled Add Member Modal]
```

#### Code Implementation (`src/lib/aiProviders.ts`)
1. **Google Gemini Flash Endpoint**:
   - Calls `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`.
   - Enforces structured JSON output via `generationConfig: { responseMimeType: "application/json" }`.
2. **Groq Llama 3.1 8B Fallback**:
   - Calls `https://api.groq.com/openai/v1/chat/completions` with model `llama-3.1-8b-instant`.
   - Enforces `response_format: { type: "json_object" }`.
3. **Regex Safety Fallback**:
   - If offline or missing API keys, the client parses standard patterns (`X is the Y of Z`, `X married to Y`, `X born in Y`) using regular expressions.

---

### B. Graph Theory & Automatic Topological Generation Layout

#### Graph Representation
The family tree is modeled as a directed multi-graph $G = (V, E)$:
- **Vertices $V$**: Member nodes containing personal attributes (name, dob, gender, photo, profession, location).
- **Directed Edges $E_D$**: Parent-to-child relations (`PARENT_OF`).
- **Undirected Edges $E_U$**: Spouse marriage links (`SPOUSE_OF`).

#### Generation Band Assignment (`useAutoLayout.ts`)
1. **Topological Generation Depth**:
   - Traverses the graph from root ancestor nodes using BFS to compute generation ranks ($G_0, G_1, G_2, \dots$).
   - If birth years are available, validates row assignment using generation spacing ($\text{Depth} \approx (\text{DOB}_{\text{child}} - \text{DOB}_{\text{parent}}) / 25$).
2. **Spouse Marriage Line Geometry**:
   - Binds marriage lines horizontally between `right-source` (left spouse) and `left-target` (right spouse) handles at mid-card height ($Y + 45\text{px}$).
   - Places a floating heart badge (`♡`) at the exact midpoint:
     $$X_{\text{heart}} = \frac{X_{\text{spouse1}} + X_{\text{spouse2}}}{2}, \quad Y_{\text{heart}} = Y + 45\text{px}$$
   - Eliminates line overlap with vertical bloodline arrows.

---

### C. Kinship Pathfinding & Relationship Degree Engine

#### Breadth-First Search (BFS) Adjacency Pathfinding (`src/engine/relationshipPath.ts`)
- Builds an undirected adjacency graph connecting every family member.
- Computes the shortest path distance between any selected viewer node $V_A$ and target node $V_B$.
- Maps path step sequences to human terms:
  - `PARENT` $\to$ Parent
  - `PARENT` + `SIBLING` $\to$ Uncle / Aunt
  - `PARENT` + `SIBLING` + `CHILD` $\to$ First Cousin

---

### D. Custom Damerau-Levenshtein Fuzzy Search Engine

#### Implementation (`src/lib/fuzzySearch.ts`)
Instead of relying on heavy external dependencies, VerLine includes a custom Damerau-Levenshtein matrix distance algorithm supporting:
- Character Insertions, Deletions, and Substitutions.
- Transpositions of adjacent characters (e.g., `Rahmesh` $\to$ `Ramesh`).

$$\text{Similarity Score} = 1 - \frac{\text{Distance}(\text{str}_1, \text{str}_2)}{\max(\text{len}_1, \text{len}_2)}$$

Used for instant duplicate detection in `AddMemberModal` to prevent accidental duplicate entries.

---

### E. Hybrid Drag-and-Drop Line Linker

- Allows users to drag connection lines handle-to-handle directly on the canvas.
- Triggers a smart connection modal asking the user to specify the relationship (`Child of`, `Parent of`, `Spouse of`, or `Sibling of`).

---

## 4. Aesthetics & UX Design System

- **Golden Heirloom Palette**: Warm parchment backgrounds (`#FAF7F2`), deep sienna accent colors (`#C2672A`), rich warm gray borders, and soft editorial serif typography (Cormorant Garamond + Inter).
- **Glassmorphism UI**: Floating canvas toolbars and legends feature multi-layer blur filters (`backdrop-filter: blur(10px)`).
- **Animated Energy Flows**: Smooth spring animations via Framer Motion for drawer slide-ins, modal transitions, and node highlights.

---

## 5. Key Technical Questions & Answers for Viva / Evaluation

### ❓ Q1: How do you handle complex or messy user inputs in natural language?
> **Answer**: We employ a multi-stage AI pipeline. The primary model is **Google Gemini 1.5 Flash**, which utilizes native structured JSON mode to extract attributes (name, relationship type, birth year, profession, location). If Gemini experiences rate-limiting, the system automatically falls back to **Groq (Llama 3.1 8B Instant)** for sub-200ms extraction. If offline, a regex parser handles standard sentence patterns.

---

### ❓ Q2: How does the application layout family members automatically without overlapping cards?
> **Answer**: We use the **Dagre topological layout algorithm** combined with custom generation band assignment. Vertices are assigned to discrete horizontal generation rows based on topological depth and birth-year deltas. Married spouses are locked side-by-side on the same $Y$-coordinate, and blood relations route vertically from bottom handles to top handles.

---

### ❓ Q3: How do you ensure user API keys are secure?
> **Answer**: API keys are stored in `.env.local`, which is listed in `.gitignore` under `*.local`. They are never committed or pushed to Git repositories. Alternatively, keys can be securely stored in Supabase Edge Secrets and proxied through our Deno Edge Function (`ai-proxy`).

---

### ❓ Q4: How is state managed across the application?
> **Answer**: We use **Zustand** for centralized, reactive state management. `usePeopleStore` manages the normalized member hash map and relationship array, while `useUIStore` manages active drawer states, toasts, and focus targets.

---

### ❓ Q5: What algorithm is used to determine how two distant relatives are connected?
> **Answer**: We model the family tree as an undirected graph and execute **Breadth-First Search (BFS)** to find the shortest path between any two members. The step sequence is then mapped to formal kinship terms (e.g. Granduncle, Second Cousin).
