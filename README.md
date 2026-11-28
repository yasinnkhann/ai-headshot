# Alterx

> **Next-Gen Studio AI Photo & Headshot Engine**  
> Run unlimited, free, 100% private AI edits locally on Apple Silicon (MLX GPU), or scale seamlessly in the cloud with Cloudinary.

Live Web App: **[alterx.vercel.app](https://alterx.vercel.app)**  
GitHub: **[github.com/yasinnkhann/alterx](https://github.com/yasinnkhann/alterx)**

---

## Features

- **Dual-Engine Architecture**:
  - 🍎 **Local Apple Silicon (MLX GPU)**: 100% private, zero cost, runs on-device via FLUX.1 Fill Dev / Schnell.
  - ☁️ **Cloud Engine (Cloudinary)**: Generative fill, replace, recolor, and smart crop from any browser or mobile device.
- **Lazy + Remember Connection**: Zero wasteful background probing; auto-reconnects smoothly for returning local users.
- **Pro Studio Shortcuts**:
  - `Space` (hold): Peek at original unedited photo.
  - `⌘ + Enter` / `Ctrl + Enter`: Trigger generation instantly.
  - `Esc`: Dismiss modals and drawers.
- **Local Gallery**: Auto-saves rendered creations to `~/Pictures/Alterx`.

---

## Quick Start (Web App)

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`.

---

## Local Mac AI Acceleration (Apple Silicon)

To run FLUX.1 Fill directly on your Mac GPU with $0 API fees and full privacy:

```bash
# One-line automated quickstart (installs uv + mflux, launches daemon)
npm run local-ai
```

Or run in the background on startup:

```bash
bash local-server/install-autostart.sh
```

To stop:

```bash
bash local-server/uninstall-autostart.sh
```

---

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Local AI Engine**: Python 3.12+, MLX (`mflux`), FLUX.1 Fill Dev / Schnell
- **Cloud Infrastructure**: Cloudinary AI Transforms, Vercel Edge Hosting
