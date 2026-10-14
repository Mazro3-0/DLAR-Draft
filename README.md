# Deadlock AR — Draft Studio

A refined React/Vite version of the uploaded DLAR draft prototype, using the community’s parchment and olive identity. Includes an admin studio and a separate 1920 × 1080 broadcast view.

## Try the included build

On Windows, extract the ZIP and double-click `START-PREVIEW.cmd` inside the project folder. Keep the terminal open, then visit **http://127.0.0.1:4173**. The script uses an installed Node.js runtime or the bundled Codex runtime on this computer. It serves only on this computer.

The ZIP includes `dist/`, so this preview needs no package installation. Choose **Load demo** to see sample hero artwork, or paste your Statlocker draft link and press **Connect draft**.

## Admin workflow

1. Paste a Statlocker URL such as `https://statlocker.gg/draft/VBWWGH17`. An eight-character room code also works.
2. Edit team names, short names, logos, series scores, tournament name, round, format, and game number. Arabic names are supported.
3. Select Full board or Lower third. Broadcast settings include transparency, bans, source team names, and the live timer.
4. Copy the OBS URL. Add a Browser Source in OBS with width **1920** and height **1080**. Keep “Refresh browser when scene becomes active” enabled.
5. After editing names, logos, scores, or presentation settings, copy the new URL into OBS. Draft picks and bans continue updating through Statlocker independently.

Logos support PNG, JPEG, and WebP files under 5 MB, resized locally to at most 256 pixels. Uploads stay in the browser and are included in the broadcast link. Use Export/Import settings to transfer branding between admins.

Disconnect & use manual mode preserves the last live selections. Click a hero slot to choose or clear a hero. Duplicate selections are prevented. Manual broadcast URLs carry the current selections; copy a new URL after changing them. Exiting demo clears the sample selections.

## Existing Vercel project

Keep the friend’s current repository and Vercel project. Review and replace the app files with this version, then push through the existing Git workflow. Use the folder containing `package.json` as the project root. The supplied `vercel.json` sets **Vite**, build command **npm run build**, and output directory **dist**. This follows [Vercel’s Vite deployment workflow](https://vercel.com/docs/frameworks/frontend/vite).

No Vercel environment variables or backend service are required for this version. The draft view uses query parameters on `/`, so no additional SPA route rewrites are needed. Nothing was deployed or changed in the existing Vercel account during this work.

## Develop and build

Use Node.js **22.12 or newer** with npm:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview:built
```

`npm run update:heroes` refreshes the hero catalogue and artwork from Statlocker’s current catalogue and the Deadlock API asset bucket. Rebuild after running it. The bundled catalogue contains 42 selectable heroes fetched on 14 October 2026. Unknown future hero IDs display an ID fallback until the catalogue is refreshed.

## Statlocker adapter

The adapter is isolated in `src/draft.js`. It connects directly to `wss://statlocker.gg/ws/draft` and sends `JOIN_DRAFT` with role `SPECTATOR`, a fresh browser session ID, and no owner token. It never sends selection, start, pause, team swap, or settings commands to Statlocker.

It consumes `DRAFT_STATE_UPDATE` and `TIMER_UPDATE`; renders actual steps, team numbers, hero IDs, current step, and draft status; and reconnects with increasing delays capped at 30 seconds. Connection interruptions retain the previous snapshot. Switching to another room clears the previous room’s selections. Room errors stop reconnect attempts until an admin reconnects.

The protocol was verified against the live room provided for this project and inspected in Statlocker’s browser client. It is not a documented public WebSocket API. [Statlocker’s public API documentation](https://statlocker.gg/api) describes HTTP API-key access. In the observed test, the HTTP lobby info endpoint returned 401, while the spectator WebSocket successfully returned the active room state. This app therefore does not depend on that HTTP lobby lookup.

Passwords entered for private rooms are used only in the admin connection and kept in memory. **The OBS link currently requires a room with public spectator access.** Passwords, owner tokens, and participant session details are not exported in URLs or saved snapshots. A rematch notice asks the admin to connect the new room explicitly.

## Storage and future work

This is a browser-local admin workspace. Open broadcast tabs on the same origin in the same browser follow branding changes through browser storage. OBS uses its own browser environment, so its URL contains a copy of the branding. Other admins’ computers do not receive those branding edits automatically.

A future shared version can add authenticated admin accounts, persistent match records, hosted logo uploads, and a realtime configuration channel. Keep that configuration channel separate from the Statlocker adapter so source selections and custom broadcast identity remain independent.

## Verification

- Production build completed successfully.
- Seven automated tests cover source URL validation, Arabic branding and manual-state URL round trips, participant-data removal, dynamic ban counts, safe logo inputs, spectator-only messages, timer messages, reconnection, and room errors.
- Browser checks confirmed a live spectator state from room VBWWGH17. It was ACTIVE at the first ban, with no hero selections; no source draft decisions were changed. Changing picks and timer payloads were exercised with protocol fixtures.
- Desktop checks covered demo artwork, Arabic names, score edits, logo upload/removal, manual hero selection, a separate broadcast view, and transparent document/body/canvas backgrounds.
- A 390-pixel phone viewport was verified with no horizontal overflow; a full-page phone screenshot is included. OBS itself and a Vercel deployment were not tested.

## Source map

- `src/App.jsx`: admin UI, broadcast renderer, local settings, image uploads, and backup tools.
- `src/draft.js`: data normalization, link encoding, room parsing, and spectator transport.
- `src/App.css` / `src/index.css`: layout and brand tokens.
- `src/heroes.json` / `public/heroes/`: local hero catalogue and cards.
- `scripts/serve.mjs`: dependency-free local build preview.
- `scripts/update-heroes.mjs`: refresh the hero assets.
- `tests/draft.test.js`: protocol and data tests.

The community logo is preserved from the uploaded project and displayed using CSS cropping. Hero artwork comes from the Deadlock API asset bucket and belongs to its respective rights holders. Inter, Cairo, and Barlow Condensed fonts are bundled locally; their OFL licenses are in `public/fonts/`.
