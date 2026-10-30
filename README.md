# Republic Frontline

Pixel-art tower defense PWA (Republic clone troopers vs. the droid army). Vanilla JS + Canvas 2D, no build step.
Status: Phase 3 meta and modes (galaxy map, tech tree, medals, archives, Heroic, Sandbox) on top of the full campaign (20 levels, 8 towers, 14 droids, 5 bosses). See `PROGRESS.md`.

**Play it:** https://pixelateddash.github.io/republic-frontline/ (GitHub Pages from `main` / root; every push to `main` redeploys).

## Play locally

```bash
node tools/serve.mjs
```

Open http://localhost:8765. Dev shortcuts: `?skip=1` (Kamino 1) or `?skip=geonosis-4` (any level id, add `&heroic=1` for a Heroic replay), `?sandbox=geonosis-2`, `?screen=galaxy|tech|medals|archives`, and `?unlock=1` to open every level on the galaxy map.

### On your iPhone over Wi-Fi (gameplay only, no PWA features)

```bash
node tools/serve.mjs 8765 --lan
```

It prints `phone: http://<your-computer-ip>:8765`. Open that in Safari on the same Wi-Fi.

## Deploy to GitHub Pages

The game is static files served from the repository root (all paths are relative, so the `/<repo>/` subpath works).

1. Create an empty repository on github.com (for example `republic-frontline`).
2. Push this folder to it:
   ```bash
   git remote add origin https://github.com/<you>/republic-frontline.git
   git push -u origin main --tags
   ```
3. On GitHub: Settings → Pages → Build and deployment → Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)**. Save.
4. After a minute the game is live at `https://<you>.github.io/republic-frontline/`.

(`.nojekyll` is included so GitHub serves every file as-is.)

## Developer tools

```bash
npm install                 # dev tools only (@napi-rs/canvas, pptxgenjs)
npm test                    # unit tests
node tools/sim/run.mjs --level kamino-1 --difficulty jedi --bot balanced --seeds 5
node tools/export-art.mjs   # art deck -> art-preview.pptx + art-preview/*.png
node tools/art/lint-art.mjs # orphan-pixel check
```

Supabase setup, cloud sync and Add to Home Screen instructions arrive in Phase 4.

## Balance tools

```bash
node tools/sim/run.mjs --level geonosis-3 --difficulty jedi --bot balanced --seeds 5
```

Bots: `balanced`, `no-upgrades`, `spam-<tower>`. `tools/sim/tune.mjs` finds each level's HP scale, `tools/sim/apply-tune.mjs` writes it into `src/data/balance.js`, and `tools/sim/report.mjs` regenerates `BALANCE_REPORT.md` (see `BALANCE.md` for the design intent).
