# The Ledger — GPA & CGPA Tracker

An installable PWA for tracking GPA, CGPA, and degree classification across unlimited
semesters, on the 5.0 or 4.0 grading scale.

## Features
- Unlimited semesters and courses, 5.0/4.0 grading scales, GPA + CGPA, degree
  classification, credit unit tracking
- Student profile (name, matric number, faculty, department, level, graduation year)
- Auto-save to this browser's local storage, plus JSON export/import for backup or
  moving between devices
- GPA/CGPA trend chart and credits-per-semester chart
- Official-style transcript, print or save as PDF from the browser's print dialog
- Dark/light mode, installable as a home-screen / desktop app (PWA)

## Run locally

```bash
npm install
npm run dev
```

Then open the printed local URL (typically http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview   # optional: preview the production build locally
```

The build output goes to `dist/`.

## Deploy to Vercel

**Option A — Vercel CLI**
```bash
npm install -g vercel
vercel
```
Follow the prompts. Vercel auto-detects Vite; no extra config needed
(build command `npm run build`, output directory `dist`).

**Option B — GitHub + Vercel dashboard**
1. Push this folder to a new GitHub repo.
2. In the Vercel dashboard, "Add New Project" → import that repo.
3. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
4. Deploy.

## Installing as an app (PWA)
Once deployed (PWA features require HTTPS, so this won't install from `localhost`
in all browsers — deploy first, or use `npm run build && npm run preview` which
serves over HTTP but some browsers still allow PWA install on localhost):
- **Desktop Chrome/Edge:** click the install icon in the address bar, or
  Menu → "Install The Ledger…"
- **iOS Safari:** Share → "Add to Home Screen"
- **Android Chrome:** Menu → "Install app" / "Add to Home screen"

## Data & privacy
All data is stored locally in the browser (`localStorage`) — nothing is sent to a
server. Use the **Export** button to download a JSON backup, and **Import** to restore
it on another device or browser.

## Project structure
```
the-ledger/
├── index.html
├── package.json
├── vite.config.js          # includes vite-plugin-pwa (manifest + service worker)
├── tailwind.config.js
├── postcss.config.js
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   └── icon-512.png
└── src/
    ├── main.jsx
    ├── index.css
    └── App.jsx              # the whole app
```
