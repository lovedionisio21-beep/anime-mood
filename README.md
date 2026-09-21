# Anime Mood v0.3

A mood-first anime recommendation website prototype.

## What changed in v0.3
- Multidimensional mood profile.
- Current mood and desired experience support up to three selections each.
- Separates current emotional state from desired emotional experience.
- Free-text soft-signal interpretation for common intent words.
- 80/20-style discovery behavior with a deterministic Wild Card.
- Explainability flow: current mood → desired experience → anime characteristics → why it matches.
- Feedback loop stored locally and used as a small session personalization signal.
- PWA manifest and service worker for install/offline-friendly shell.
- GitHub Pages deployment workflow included.

## Publishing

This project is a static site and is ready for GitHub Pages. GitHub Pages can publish static HTML/CSS/JavaScript from a repository. Configure Pages to use GitHub Actions, then push to `main`.

The workflow in `.github/workflows/pages.yml` handles deployment.

## Data integrity

The current anime catalog is demo data. Do not treat its metadata or watch availability as production-verified. The app intentionally does not fabricate streaming URLs. The next production phase should connect a verified anime data source and region-aware watch availability.
