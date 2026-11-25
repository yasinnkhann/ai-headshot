---
name: saas-design-standards
description: UI/UX layout standards and aesthetic guidelines for modern, high-converting SaaS web apps and landing pages
---

When designing, scaffolding, or refactoring web applications and SaaS landing pages, strictly adhere to the following UI/UX and architectural standards:

### 1. Two-Column Interactive Hero (Above-the-Fold)
- **Avoid Barren Layouts**: Never render isolated centered text followed by a large empty void or disconnected standalone form cards.
- **Desktop 2-Column Split (`lg:grid lg:grid-cols-12`)**:
  - **Primary Side (e.g. 7 cols)**: High-impact headline with gradient accents, concise value proposition, embedded primary action/dropzone directly in the hero container, and trust badges (`🔒 Private & Secure`, `⚡ Speed`, `📸 Resolution`).
  - **Interactive Showcase Side (e.g. 5 cols)**: A live interactive widget (e.g., before/after comparison slider, interactive simulator, preview canvas, or interactive sandbox) demonstrating actual product output.
- **No Redundant Anchor CTAs**: Do not add hero buttons whose only function is scrolling a few hundred pixels down to a form. Either embed the action directly or make the button trigger the native action (e.g. file dialog, modal, demo).

### 2. Zero-Friction Onboarding ("Try Sample")
- Every upload, creation, or transformation flow MUST include an instant one-click `"⚡ Try with sample data"` button.
- Users must be able to experience the app's full value and visual output immediately without forcing a signup or file upload first.

### 3. Rich Below-the-Fold Structure (Zero Dead Space)
Never leave the bottom of the page blank. Structure the landing experience with:
- **Interactive Preset / Template Showcase**: Visual cards displaying curated styles or templates, each equipped with a 1-click `"Try this style →"` button that pre-loads sample data and activates that style in the workspace.
- **3-Pillar Feature Spotlight**: Clean glassmorphism cards with Lucide icons highlighting core differentiators.
- **3-Step "How It Works"**: Simple 1-2-3 sequential cards from input to export.
- **Bottom Re-Engagement Banner**: Gradient CTA card with dual actions ("Upload / Start" + "Try Sample"), leading into a minimal, dark-mode footer.

### 4. Distinct Landing vs. Workspace Modes
- **Landing Mode (`!hasData`)**: Display the full high-conversion landing page (2-column hero + showcase + features + steps).
- **Workspace Mode (`hasData`)**: Hide marketing landing sections. Transition smoothly into a distraction-free studio/editor workspace (customization tools, real-time preview, gallery, export actions).
- **Seamless Reset**: Provide a clean header action (e.g., `"Upload Different Photo"` or `"Reset"`) to return to the landing view without losing session history.

### 5. Aesthetic & Styling Guidelines
- **Palette**: Modern dark mode with deep dark background (`#0a0a0f`), subtle ambient radial glow (`radial-gradient`), and high-contrast typography.
- **Glassmorphism**: Glass surfaces using `backdrop-blur-md`, subtle white opacity backgrounds (`bg-white/[0.05]`), and 1px crisp borders (`border-white/10` with hover `border-indigo-500/40`).
- **Typography & Accents**: Vibrant gradient text (`bg-gradient-to-r` or `gradient-text`) for key emphasis, smooth micro-interactions, and accessible keyboard/touch controls.
