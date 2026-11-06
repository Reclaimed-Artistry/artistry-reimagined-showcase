# Learn it yourself

A responsive, self-guided digital-skills learning site built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

The development server uses port 8080. For production:

```sh
npm run build
npm run preview -- --host 0.0.0.0
```

Deploy the generated `dist/` directory to a static host. Configure an SPA fallback to `index.html` for client-side routes such as `/paths` and `/dashboard`. Keep real asset requests intact.

## Included

- A category chooser for complete beginners, students/job seekers, and working professionals.
- Category-specific recommendations; every learning path remains available to everyone.
- Searchable, level-filtered path catalogue.
- Four starter paths: Digital Workplace Essentials, Spreadsheets & Data Fundamentals, Design & Digital Content, and Web & No-Code Fundamentals.
- Twelve original text lessons with practical exercises and knowledge checks.
- Four project briefs, a downloadable deliberately imperfect practice sales dataset, self-review checklists, and saved reflections.
- A personal learning dashboard, progress export, and confirmed progress reset.
- Responsive navigation, keyboard-accessible controls, reduced-motion support, a system font stack, and a privacy page.

## Important scope boundaries

This is a working **frontend starter edition**, not a production learning-management or payment system. Progress is stored in this browser under `learn-it-yourself:v1`. There are no accounts, server persistence, cross-device syncing, file submissions, public portfolios, assessed certificates, or payments. Project checklists are self-reviews. No employment outcomes are guaranteed.

Changing category preserves learning progress. Clearing browser storage removes it. If storage is unavailable, the app remains usable in memory and displays a warning. The JSON export is a readable record, not an import/restore format.

The original showcase components remain in the repository but are no longer mounted. The active application starts at `src/App.tsx`; new learning content is in `src/data/learning.ts`.

## Validation

```sh
npx tsc --noEmit
npm run lint
npm run build
```

## Next production steps

1. Validate the category language, recommendations, and starter content with real learners and employers.
2. Add managed authentication, a database, and row-level access controls before syncing progress.
3. Add reviewed project submissions, object storage, and accessible public portfolios if needed.
4. Add an instructor content/review workflow and expand the reviewed curriculum.
5. Integrate a suitable hosted checkout and server-verified payment webhooks before selling paid paths. Never collect raw bank credentials in the browser.
6. Publish an updated privacy notice and assessment/certificate policy before introducing those features.
