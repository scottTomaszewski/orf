# Nimble Sheet (placeholder name)

A free, phone-first character sheet for Nimble, driven entirely by the content documents in
`../systems/nimble` and `../examples/nimble`. No accounts, no server: characters live in this
browser, export as `.md`, and travel as share links.

This app is free to use for anyone who already owns the content, is trying the system out, or
cannot afford to buy it right now. If you enjoy Nimble and are able, please support the game by
purchasing the official content at nimbleRPG.com. Nimble Sheet is an independent product
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

## Homebrew folder (the demo)

1. Make a folder with `ratfolk.md`:
   ```markdown
   ---
   id: nimble.ancestries.ratfolk
   type: ancestry
   system: nimble
   name: Ratfolk
   effects:
     - {target: wounds.max, add: 1, note: "Hard to kill."}
   ---
   Ratfolk are hard to kill.
   ```
2. Content → **Choose folder** (Chromium) or **Add files**. The ancestry appears in Create.
3. Create a Ratfolk character. Play shows Wounds max 7; tap it and the popover names Ratfolk
   and the note.
4. Edit the file to `add: 2`, Content → **Reload**. Wounds max 8.
5. Break the YAML on purpose: the Content view's Problems panel names the file and line; the
   rest of the content still loads.

## Recording checklist (for the post)

Phone-width window (360px). Create a gnome Mage. Play: take 20 damage, watch Dying and the
Wound appear, Safe Rest. Content: add `ratfolk.md`, create a Ratfolk, show the Wounds popover,
edit the file, Reload, show 8. Under a minute.
