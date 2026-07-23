# Studio Apartment Layout Simulator

A cozy isometric studio-apartment planner: drag furniture on a 1 ft grid, rotate it, watch door clearances, and tally what you still need to buy. All furniture art lives in `sprites/*.svg` — edit the sprites in Figma and the app updates on the next deploy, **no code changes needed**.

## Folder layout

```
index.html            The app (open directly in a browser, or deploy as-is)
support.js            Runtime the app needs (do not edit)
sprites/              One SVG per furniture piece per facing direction
sprites/manifest.json Where each sprite sits relative to its floor tile (don't edit by hand)
figma/furniture-kit.svg   Import this into Figma — every sprite + room shell + palette
figma/room-shell.svg      The empty room, for reference/editing
scripts/figma-pull.mjs    Pulls edited sprites straight from your Figma file
.github/workflows/figma-sync.yml  GitHub Action that runs the pull automatically
```

## 1 · Deploy to Vercel (one-time, ~3 minutes)

1. Create a new GitHub repository and upload everything in this folder
   (on github.com: **Add file → Upload files**, drag the folder contents in, commit).
2. Go to [vercel.com/new](https://vercel.com/new), import that repository.
3. Framework preset: **Other**. No build command, no output directory — it's a static site. Deploy.

Every push to the repo now redeploys the live app automatically.

## 2 · Edit furniture in Figma

1. In Figma: **File → Import** and pick `figma/furniture-kit.svg`. You get every furniture piece (4 rotations each), the room shell, and the palette as editable vectors.
2. Edit whatever you like. Rules that keep the game working:
   - **Keep each sprite's invisible `bounds` rectangle** (it's the first layer in each sprite group). It pins the artwork's position relative to its floor tile — art can be smaller than the bounds, never larger.
   - Keep the footprint plausible: the game still uses the real-world dimensions (a 5×3 ft sofa occupies 5×3 tiles no matter what you draw).
   - The four rotations (`-r0` … `-r3`) face: toward you-left, toward you-right, away-right, away-left. Wall items have `-back` / `-left` variants instead.
3. Export the edited sprite: select its group → Export → SVG → save over the matching file in `sprites/` (same name, e.g. `sofa-r0.svg`).
4. Commit + push → Vercel redeploys → your new art is live.

## 3 · Optional: automatic Figma → repo sync

Skip manual exporting entirely:

1. In Figma, after importing the kit, turn each sprite group into a **component** keeping its exact name (`sofa-r0`, `bed-r2`, `tv-back`, …). Component names are how the sync finds them.
2. Get a Figma personal access token: Figma → Settings → Security → Personal access tokens.
3. Get your file key: it's the string in the file URL, `figma.com/design/<FILE_KEY>/...`.
4. In the GitHub repo: **Settings → Secrets and variables → Actions** → add secrets `FIGMA_TOKEN` and `FIGMA_FILE_KEY`.
5. Run the **Sync sprites from Figma** action (Actions tab → run workflow), or wait for the nightly run. It exports every matching component as SVG, commits changed files, and Vercel redeploys.

## Adding new furniture

1. Add the item in the app's catalog: in `index.html`, find `DEFS = [` and add a line with id, name, group, footprint in feet (`w`, `d`), height `h`, `price`, and a `kind` (used only as fallback art).
2. Draw sprites named `<id>-r0.svg` … `<id>-r3.svg` (copy a similar item's files as a starting point) and add matching entries to `sprites/manifest.json` (copy a similar item's entries — `vx/vy/vw/vh` is the sprite's box relative to the tile origin).

If a sprite is missing, the app falls back to drawing the item procedurally, so nothing breaks.

## Notes

- The in-app **custom items** (added via the sidebar form) are always drawn procedurally — they have no sprite files.
- Layouts are saved in each visitor's browser (localStorage), not on a server.
