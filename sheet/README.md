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

## Recording checklist (for the post)

Creator's seat, under a minute, desktop or 390px:

1. Write: type ancestry, name Ratfolk, one effect on `wounds.max`, the source filling itself.
2. Save → Reader. Create a Ratfolk Mage (Balanced array). Play: Wounds max 7, tap, "Ratfolk +1".
3. Content → edit → `add: 2` → Save → Wounds max 8.
4. Optional second shot: the same file in Obsidian, and `npx tsx src/cli.ts` linting it.

## Hosting

`.github/workflows/pages.yml` builds `sheet/` and deploys it to GitHub Pages on every push to
`main` (`VITE_BASE=/orf/`). Enable Pages once with the workflow as the source:
`gh api -X POST repos/scottTomaszewski/orf/pages -f build_type=workflow`.
