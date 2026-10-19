# ORF Sheet for Nimble

A free, phone-first character sheet for Nimble, driven entirely by the content documents in
`../systems/nimble` and `../examples/nimble`. No accounts, no server: characters live in this
browser, export as `.md`, and travel as share links.

This app is free to use for anyone who already owns the content, is trying the system out, or
cannot afford to buy it right now. If you enjoy Nimble and are able, please support the game by
purchasing the official content at nimbleRPG.com. ORF Sheet for Nimble is an independent product
published under the Nimble 3rd Party Creator License. Nimble TTRPG © Nimble Co.

## Run

```bash
cd sheet
npm install
npm run dev        # bundles the content (../scripts/bundle-content.ts) then serves on localhost
npm test           # jsdom component tests + store tests
npm run build      # typecheck + static build to sheet/dist (deploy anywhere static)
```

The engine is imported from `../src` unchanged; nothing in `sheet/` computes a rule.

## Views

- **Play**: HP, Wounds, Hit Dice, mana and class pools, rests, Initiative and turns, stats,
  Armor, saves, skills, inventory, spells known, features, situation toggles, a log. Tap any
  number for its provenance (formulas expand one level: "Armor 4 = base 4 from Adventurer's
  Garb when equipped").
- **Create**: name, class, ancestry, background, stat array and placement, skill points,
  starting kit. Every option shows its rules text.
- **Level Up**: what the next level grants, one picker per choice slot, HP roll with
  advantage, skill point.
- **Reader**: every loaded document, searchable, with `{{ }}` values resolved for your
  character.
- **Content**: the bundle, your homebrew folder, and every problem the linter or engine found.
- **About**: the license notice and package version.

## The demo: write content, watch it ripple

The sheet exists to make the format's promise visible: a creator writes one Markdown file and
every tool that speaks ORF picks it up. Two ways to run it.

**In the sheet (Write view).**

1. **Write** → type `ancestry`, name `Ratfolk`. The id fills itself (`nimble.ancestries.ratfolk`).
2. **Add effect**: target `wounds.max` (the list offers every number the system declares),
   `add`, `1`, note "Ratfolk are hard to kill." The source on the right is the file; Problems
   says none.
3. **Save**. The Reader opens on Ratfolk. **Create** now offers Ratfolk; make one. **Play**
   shows Wounds max 7; tap it and the popover names Ratfolk and the note.
4. **Content** → edit `homebrew/ancestry/ratfolk.md` → change `1` to `2` in the source →
   Save. Wounds max 8.
5. Type `wound.max` instead: Problems names the unknown target and Save waits. Break the
   YAML on purpose: the file opens in source mode with the line number; nothing else breaks.

**In a text editor (the same file).** Write `ratfolk.md` anywhere (the creator guide has it:
[`../docs/guide/writing-content.md`](../docs/guide/writing-content.md)), then Content →
**Choose folder** (Chromium) or **Add files**. Edit the file, **Reload**, the sheet updates.
Open the same file in Obsidian: the properties show as a table, the text as prose. ORF is
Markdown.

## The look

High-Fantasy Steel, the Steel Compendium design language (workspace `DESIGN.md`), ported as
tokens in `src/styles/steel.css`. Depth carries hierarchy: one raised **plate** per view (a
character's head, a document, the file being written) with a crest and a deep cast shadow;
**panels** inside with a dark title band and a soft sheen; **chips** at 2px for single facts.
Numbers are tabular mono with an emboss; labels are Petrona small caps; display is Cinzel.
Saturated color is semantic only (HP red, Wound gold, Mana blue, the teal accent for the one
primary action per view). Wounds and actions are seals: an engraved empty ring, a struck disc
when spent. No colored left-border spines (DESIGN.md rule 7).

## Browser tests (Playwright)

`npm run e2e` builds the sheet, serves it with `vite preview`, and runs `e2e/` in Playwright's
Chromium at desktop (1280px) and phone (390px, touch):

- `e2e/visual.spec.ts` — a full-page baseline PNG per view and size under
  `e2e/__screenshots__/<project>/`. A failure is a rendering change: `npm run e2e:report` shows
  the diff; if the change is intended, `npm run e2e:update` and commit the PNGs. Baselines carry
  no platform suffix because the fonts are web fonts and the browser is Playwright's own build,
  so Linux CI and a Linux desktop agree; regenerate on Linux (or let CI's diff tell you).
- `e2e/ripple.spec.ts` — the format's promise in a real browser: write Ratfolk, save, create a
  Ratfolk mage, Wounds max 7 with provenance, edit the file to `add: 2`, Wounds max 8.
- `e2e/layout.spec.ts` — no view is wider than the viewport. Horizontal overflow on a phone
  makes mobile Chromium zoom the layout viewport out and pushes the fixed tab bar off-screen.
- `e2e/flows.ts` — the steps both of those and the demo share, written against a `Pace`
  (`e2e/pace.ts`): `instant` for tests, `human` for the recording.

First run on a new machine: `npx playwright install chromium`. CI runs the same suite
(`.github/workflows/ci.yml`) and uploads the HTML report when it fails.

## Recording the demo

```
npm run demo:record          # → demo/orf-demo.mp4, .gif, .webm (gitignored)
DEMO_SPEED=0.6 npm run demo:record   # faster pauses and typing
```

`e2e/demo.spec.ts` runs the ripple flow at human pace with a drawn cursor and captions, in a
1280×800 Chromium with video on; `scripts/finish-demo.mjs` converts the newest recording with
ffmpeg. The recording is reproducible: same steps, same content, same captions every time. Change
the captions or the beats in the spec, not in an editor. About a minute long.

## Hosting

`.github/workflows/pages.yml` builds `sheet/` and deploys it to GitHub Pages on every push to
`main` (`VITE_BASE=/orf/`). Live at https://scotttomaszewski.github.io/orf/.
