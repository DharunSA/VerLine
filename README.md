# 🌳 VerLine — Your Roots, in One Line.

> An interactive, AI-enhanced living family tree visualization platform with real-time graph layout, dual-LLM natural language parsing, and hybrid drag-and-drop linking.

---

## ✨ Features

- **🌳 Interactive Graph Canvas**: Powered by React Flow and Dagre topological layout engine. Enforces strict generation row alignment with birth-year fallbacks.
- **✨ Dual Live AI Engine**:
  - **Primary LLM**: **Google Gemini Flash** (via Google AI Studio) for deep language understanding of complex, messy real-world family sentences.
  - **Fast Path / Fallback LLM**: **Groq** (Llama 3.1 8B Instant) for sub-second fast-path extraction and fallback.
  - **Offline Regex Engine**: Built-in client parser ensures 100% offline uptime.
- **🔗 Hybrid Drag-and-Drop Line Linker**: Click and drag connection lines handle-to-handle directly on the canvas to link parents, children, spouses, or siblings.
- **💓 Clean Side-to-Side Marriage Edges**: Marriage lines connect side-to-side at mid-card height with a centered floating heart badge (`♡`), preventing line collision with vertical parent arrows.
- **📖 AI Family Story Generator**: Generates warm, heirloom-style multi-generational family biographies.
- **🔍 Fuzzy Search & Closeness Ranking**: Instant search by name, profession, or location, with degree-of-kinship calculated automatically via BFS graph pathfinding.

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/DharunSA/VerLine.git
cd VerLine
npm install
```

### 2. Live AI Configuration (Optional)
Copy `.env.local.example` to `.env.local` and add your API keys:
```env
# Google Gemini Flash (Primary LLM)
VITE_GEMINI_API_KEY=AIzaSy...

# Groq (Fast Path / Fallback LLM)
VITE_GROQ_API_KEY=gsk_...
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Build

```bash
# Run unit test suite
npm run test

# Type check & build production bundle
npm run build
```

---

## 📜 License
MIT License. Built with ❤️ for family history preservation.
