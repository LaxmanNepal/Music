# SOUTH MUSIC runtime configuration

Audius documents its API key as safe for frontend use. The Bearer Token must never be shipped to the browser.

For GitHub Pages, `config/audius-config.js` is the runtime configuration file. The Audius adapter reads `window.SOUTH_MUSIC_CONFIG.audiusApiKey` first and falls back to a local development value if present.

Do not add an Audius Bearer Token here.
