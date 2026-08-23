# SOUTH MUSIC

**Listen to What Feels Right.**

Mobile-first, audio-only music discovery PWA with local personalization, IndexedDB history, persistent playback UI, listen-later storage, search, artist pages, route-based genre/language/mood browsing, and rights-aware catalog validation.

## Important catalog note

The initial catalog intentionally contains only open-license demonstration recordings. SOUTH MUSIC does **not** scrape YouTube, bypass DRM, proxy unauthorized streams, or re-host commercial music. South Asian commercial catalogs require a provider that explicitly permits browser audio streaming and redistribution/use under its API/license terms.

## Architecture

- Vanilla ES modules; no framework or paid API dependency.
- `assets/recommendationEngine.js` — local recommendation scoring and diversity controls.
- `assets/app.js` — SPA routes, onboarding, search, artist pages, player, library, profile.
- `data/*.json` — catalog/taxonomy.
- IndexedDB — listening history/cache store.
- localStorage — preferences, saves, recommendation signals and search history.
- Service worker — offline application shell only; it does not cache unauthorized audio.
- GitHub Actions — catalog validation/stat refresh and source health checks.

## Deployment

Enable GitHub Pages for the `main` branch. The app is designed for the `/music/` project path and includes a `404.html` deep-link recovery flow.

## Rights-aware ingestion contract

Every playable song must include:

`provider`, `source.url`, `source.license`, `source.streamingAllowed === true`, and an explicit audio URL.

If `streamingAllowed` is not `true`, the UI refuses playback.
