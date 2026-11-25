---
name: stickyplan-cloudflare-deploy
description: End-to-end GitHub repository setup, Cloudflare Pages security headers (_headers), static build verification, and zero-cost Cloudflare Pages deployment workflow for StickyPlan. Activate when configuring security headers, preparing CI/CD, creating the GitHub repo, or deploying to Cloudflare Pages.
---

# StickyPlan GitHub + Cloudflare Pages Deployment Skill

Use this skill when preparing StickyPlan for production build verification, GitHub repository push, and Cloudflare Pages deployment.

## 1. Pre-Deploy Build & Bundle Budget Gate

Before pushing or deploying, run and verify all checks:
1. `npm run lint` / `npx tsc --noEmit` — zero TypeScript or lint errors.
2. `npm test` — 100% unit & integration tests green (local date math, time sorting, Maps URL sanitizer, JSON import validator, repository CRUD).
3. `npm run build` — inspect Vite output in `dist/`:
   - Confirm total initial JS + CSS gzipped size is strictly `< 150 KB`.
   - Confirm `dist/sw.js` (or Workbox service worker), `dist/manifest.webmanifest`, and `dist/_headers` are emitted.

## 2. Mandatory Cloudflare Pages Security Headers (`public/_headers`)

Always place `_headers` inside `public/_headers` so Vite copies it verbatim to `dist/_headers`:

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

## 3. GitHub + Cloudflare Pages Deployment Paths

### Path A: GitHub Auto-Deploy (Recommended by PRD for Continuous Deployment)
1. Verify GitHub CLI login: `gh auth status` (if not logged in, ask user to run `gh auth login`).
2. Create repository and push `main`:
   ```powershell
   git init -b main
   git add .
   git commit -m "feat: initial StickyPlan offline-first PWA MVP"
   gh repo create stickyplan --public --source=. --remote=origin --push
   ```
3. Connect repository to Cloudflare Pages (via Cloudflare MCP plugin if installed, or Cloudflare Dashboard -> **Workers & Pages -> Create -> Pages -> Connect to Git**):
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `20` or `22` (`NODE_VERSION=22`)

### Path B: Direct CLI Deploy from Gemini (`wrangler pages`)
If deploying directly from workspace without waiting for Git webhook:
```powershell
npx wrangler pages project create stickyplan --production-branch=main
npx wrangler pages deploy dist --project-name=stickyplan
```
*(Requires one-time `npx wrangler login` browser authentication if Cloudflare session is not yet cached.)*
