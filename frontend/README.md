# 💻 VertexFlow Client Application

This directory houses the frontend client for **VertexFlow**, a high-performance collaborative workspace and professional networking application. Built using **React 19** and **Vite**, it offers near-instantaneous page loads, fluid HMR, custom Lexical rich-text editors, and smooth glassmorphic UI interactions.

---

## 🛠️ Frontend Tech Stack

* **Core Framework:** [React 19.2 (Stable)](https://react.dev/)
* **Build Tooling:** [Vite 8.0](https://vite.dev/) (fast builds, CSS splitting, code compression)
* **Text Editor Engine:** [Lexical 0.44](https://lexical.dev/) (Meta's low-latency, modular rich-text framework)
* **Real-time Engine:** [Socket.io-client 4.8](https://socket.io/)
* **Local Synchronization:** [idb (IndexedDB wrapper)](https://github.com/jakearchibald/idb)
* **Routing:** [React Router Dom 7.1](https://reactrouter.com/)
* **Icons:** [Lucide React 1.11](https://lucide.dev/)
* **Design Language:** Pure CSS3 variables with hardware-accelerated animations and Glassmorphic aesthetics (No TailwindCSS to maximize raw rendering speed and style isolation)

---

## 📂 Source Structure (`src/`)

The frontend application follows a highly modular, domain-driven structure.

```
src/
├── app/                  # Main App entrypoint and central router
│   ├── App.jsx           # App wrapper with global context providers
│   └── routes.jsx        # Lazy-loaded route definitions & layouts
│
├── assets/               # Globals style rules, animations, and logos
│
├── components/           # Shared, reusable UI components
│   ├── common/           # Loaders, protection wrappers (ProtectedRoute, AdminRoute)
│   └── layout/           # Global navbar, sidebar, and layout templates
│
├── context/              # Global state contexts (AuthContext, SocketContext)
│   ├── AuthContext.jsx   # Cookie-based session tracking and login routines
│   └── SocketContext.jsx # Shared WebSocket listener socket registry
│
├── hooks/                # Global React hooks
│
├── modules/              # Feature modules (Domain-driven encapsulation)
│   ├── admin/            # Moderation panels, logs, database control, and maintenance views
│   ├── auth/             # Login, register, OTP verification, and password resets
│   ├── document/         # Rich-text editor panel, PDF export layout, dashboard
│   ├── network/          # Friend requests, list, and real-time private messages
│   ├── social/           # Feed scroll, post creation, comments, and likes
│   └── user/             # User bio updates, avatar uploads, and preferences
│
├── pages/                # Global views (Landing / Home Page)
└── utils/                # Utility classes (Axios wrapper, formatting helpers)
```

---

## ⚡ Performance Architecture

VertexFlow's frontend is optimized for a Google Lighthouse score close to 100:

1. **Zero-Delay Hydration:** Documents are rendered instantly from **IndexedDB** state before the socket connects to sync other edits, eliminating layout shift (CLS) and lowering LCP.
2. **Aggressive Code Splitting:** Every route level view is lazy-loaded asynchronously. Heavy compilation libraries (like `html2pdf.js` or `prismjs`) are dynamically imported in-line ONLY when required (e.g. during code block writing or file export).
3. **Above-the-Fold Critical CSS:** Base colors, themes, layout skeletons, and the root loading spinners are inlined directly within `index.html` to eliminate Flash of Unstyled Content (FOUC).
4. **Preconnected Fonts:** Fonts are preconnected to Google servers (`fonts.googleapis.com` and `fonts.gstatic.com`) using non-blocking media queries to ensure smooth text rendering without blocking DOM compilation.

---

## ⚙️ Environment Variables

Add a `.env` file to the root of the `/frontend` directory:

```ini
VITE_API_URL=http://localhost:4000
```

* `VITE_API_URL`: Points to the API and WebSocket server. In production, set this to your cloud hosting backend domain (e.g. `https://vertexflow-backend.herokuapp.com`).

---

## 🚀 Execution & Command Reference

Ensure that the backend server is running, then execute the following within `/frontend`:

### Install Dependencies
```bash
npm install
```

### Start Development Server
Runs the application locally with hot-module replacement (HMR) at `http://localhost:5173`.
```bash
npm run dev
```

### Production Build
Compiles, code-splits, and compresses assets (Gzip) into the `/dist` directory for production deployment.
```bash
npm run build
```

### Preview Build
Serves the local production build locally for verification.
```bash
npm run preview
```

### Lint Files
Scans code using ESLint for style validation.
```bash
npm run lint
```
