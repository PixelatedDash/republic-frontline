# Republic Frontline

Pixel-art tower defense PWA (Republic clone troopers vs. the droid army). Vanilla JS + Canvas 2D, no build step.
20 levels on 5 planets, 8 towers with tier-4 branches, 14 droids, 5 bosses, galaxy map, tech tree, medals, archives, Heroic replays and Sandbox. Offline-first, with optional cloud sync through Supabase. See `PROGRESS.md` for the current phase.

**Play it:** https://pixelateddash.github.io/republic-frontline/ (GitHub Pages from `main` / root; every push to `main` redeploys).

## Play locally

```bash
node tools/serve.mjs
```

Open http://localhost:8765. The local server sends no-cache headers and the service worker stays off (add `?sw=1` to test it).

Dev shortcuts: `?skip=1` (Kamino 1) or `?skip=geonosis-4` (any level id, add `&heroic=1` for a Heroic replay), `?sandbox=geonosis-2`, `?screen=galaxy|tech|medals|archives`, and `?unlock=1` to open every level on the galaxy map.

### On your iPhone over Wi-Fi (gameplay only, no PWA features)

```bash
node tools/serve.mjs 8765 --lan
```

It prints `phone: http://<your-computer-ip>:8765`. Open that in Safari on the same Wi-Fi. Install, offline play and updates need HTTPS, so test those on the GitHub Pages deploy.

## Deploy to GitHub Pages

The game is static files served from the repository root (all paths are relative, so the `/<repo>/` subpath works).

1. Before committing changed game files, refresh the service worker's file list:
   ```bash
   node tools/build-precache.mjs
   ```
2. Commit and push to `main` (GitHub Desktop: Commit, then Push origin).
3. First time only: on GitHub, Settings → Pages → Build and deployment → Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)**. Save.
4. After a minute the game is live at `https://<you>.github.io/republic-frontline/`.

When a new version is deployed, an open copy of the game shows **UPDATE AVAILABLE - TAP TO RELOAD**; tapping it switches to the new version. (`.nojekyll` is included so GitHub serves every file as-is.)

## Add to Home Screen (iPhone)

1. Open the GitHub Pages URL in **Safari**.
2. Tap the Share button, then **Add to Home Screen**, then **Add**.
3. Launch it from the new icon: it opens without browser bars, in landscape (turn the phone if it asks).
4. After one full load it works in airplane mode.

## Cloud sync with Supabase (optional)

The game always saves on the device first and plays fully without an account. Cloud sync merges progress between your phone and desktop (highest stars, medals, unlocks and stats win; the newest unfinished level wins).

1. **Create a project** at https://supabase.com (free tier is fine).
2. **Create the table:** Dashboard → SQL Editor → New query → paste all of `supabase/schema.sql` → Run. It creates one `saves` table with Row Level Security, so each user can only read and write their own row.
3. **Turn off public sign-ups:** Authentication → Sign In / Providers (or Settings) → disable **Allow new users to sign up**. Nobody else can create an account, even though the site and key are public.
4. **Create your user:** Authentication → Users → **Add user** → **Create new user**:
   - Email: if you want to log in with a username, use `<username>@republic-frontline.invalid` (for example `andrew@republic-frontline.invalid`). Typing `andrew` in the game's login maps to exactly that address. You can also use a real email and type the full address when logging in.
   - Password: your choice.
   - Tick **Auto Confirm User** so no confirmation email is needed.
5. **Connect the game:** Dashboard → Project Settings → API (or **Connect**): copy the **Project URL** and the **publishable / anon** key into `src/config.js` (`SUPABASE_URL`, `SUPABASE_KEY`). Never use the `service_role` / secret key: the publishable key is meant to be public; RLS plus disabled sign-ups protect the data.
6. Run `node tools/build-precache.mjs`, commit, push. In the game: Title → **Account** → log in once per device; the session is remembered.

Notes:
- **Password reset:** Dashboard → Authentication → Users → your user → change the password there (the game sends no emails).
- **Why `.invalid`:** it is a reserved domain that can never belong to anyone. Supabase only runs its stricter address checks (reserved domains, mail-server lookups) when it is about to send an email, which this setup never does; signing in with a password only needs a well-formed address. If you change `ACCOUNT_EMAIL_DOMAIN` in `src/config.js`, create the dashboard user with the new domain.
- **Free-tier pausing:** free projects are paused after a period of inactivity. Nothing breaks: the game keeps saving locally and the sync status shows OFFLINE until you restore the project from the dashboard.
- Sync status shows on the title screen, in Settings and on the Account screen (local only / not logged in / syncing / synced / offline).

## Developer tools

```bash
npm install                 # dev tools only (@napi-rs/canvas, pptxgenjs, @supabase/supabase-js for vendor/)
npm test                    # unit tests
node tools/sim/run.mjs --level kamino-1 --difficulty jedi --bot balanced --seeds 5
node tools/export-art.mjs   # art deck -> art-preview.pptx + art-preview/*.png
node tools/art/lint-art.mjs # orphan-pixel check
node tools/export-icons.mjs # PWA icons from the art code -> icons/
node tools/build-precache.mjs # service worker file list + version (run before committing game files)
```

`vendor/supabase.js` is the UMD build of `@supabase/supabase-js` (pinned in `package.json`), copied from `node_modules/@supabase/supabase-js/dist/umd/supabase.js`. It only loads when `src/config.js` has a URL and key.

## Balance tools

```bash
node tools/sim/run.mjs --level geonosis-3 --difficulty jedi --bot balanced --seeds 5
```

Bots: `balanced`, `no-upgrades`, `spam-<tower>`. `tools/sim/tune.mjs` finds each level's HP scale, `tools/sim/apply-tune.mjs` writes it into `src/data/balance.js`, and `tools/sim/report.mjs` regenerates `BALANCE_REPORT.md` (see `BALANCE.md` for the design intent).
