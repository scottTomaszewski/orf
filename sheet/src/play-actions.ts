/** The Play view's verbs: pure over (character, sheet); wraps the Nimble module and returns the updated document plus a human log. */
import type { Document } from "../../src/document.js";
import type { Sheet } from "../../src/engine.js";
import { formatValue } from "../../src/expr/value.js";
import { rollDice } from "../../src/sheet-model.js";
import * as nimble from "../../src/systems/nimble.js";
import { clampResource } from "../../src/moments.js";

export type Action =
  | { kind: "damage"; amount: number; crit: boolean } | { kind: "heal"; amount: number }
  | { kind: "catch-breath"; dice: number } | { kind: "make-camp"; dice: number } | { kind: "safe-rest" }
  | { kind: "encounter-start"; roll: number } | { kind: "turn-end" } | { kind: "encounter-end" }
  | { kind: "adjust"; resource: string; delta: number } | { kind: "toggle"; flag: string; value: boolean }
  | { kind: "equip"; id: string; equipped: boolean };

export interface Roll { text: string; rolls: number[]; total: number }
export interface ActionResult { character: Document; log: string[]; rolls: Roll[] }

const stateOf = (d: Document): Record<string, unknown> => (typeof d.frontmatter.state === "object" && d.frontmatter.state ? (d.frontmatter.state as Record<string, unknown>) : {});
const withState = (d: Document, state: Record<string, unknown>): Document => ({ ...d, frontmatter: { ...d.frontmatter, state } });
const num = (sheet: Sheet, id: string): number => { const v = sheet.value(id); return v.kind === "int" ? v.value : 0; };
const flag = (sheet: Sheet, id: string): boolean => { const v = sheet.value(id); return v.kind === "bool" && v.value; };

/** Fill `state` with every present resource's current so procedures see a complete picture. */
function fullState(character: Document, sheet: Sheet): Record<string, unknown> {
  const s = { ...stateOf(character) };
  for (const r of sheet.resources.values()) if (typeof s[r.id] !== "number") s[r.id] = r.current;
  return s;
}

export function performAction(character: Document, sheet: Sheet, action: Action, rng: () => number): ActionResult {
  const ctx = { sheet, state: fullState(character, sheet) };
  const rolls: Roll[] = [];
  const out = (o: nimble.Outcome, extra: string[] = []): ActionResult => ({ character: withState(character, o.state), log: [...extra, ...o.log], rolls });
  switch (action.kind) {
    case "damage": return out(nimble.damage(ctx, action.amount, action.crit), [`Took ${action.amount} damage${action.crit ? " (crit)" : ""}`]);
    case "heal": return out(nimble.heal(ctx, action.amount), [`Healed ${action.amount}`]);
    case "catch-breath": {
      const size = num(sheet, "hit_die.size");
      const adv = flag(sheet, "hit_die.heal.advantage");
      const n = Math.min(action.dice, typeof ctx.state.hit_dice === "number" ? ctx.state.hit_dice : 0);
      const dieRolls: number[][] = [];
      for (let i = 0; i < n; i++) {
        const r = rollDice(`${adv ? 2 : 1}d${size}${adv ? "kh1" : ""}`, rng);
        rolls.push({ text: `${adv ? "2" : "1"}d${size}${adv ? " (advantage)" : ""}`.replace(" (advantage)", adv ? "kh1" : ""), rolls: r.rolls, total: r.total });
        dieRolls.push(r.rolls);
      }
      return out(nimble.catchBreath(ctx, dieRolls), [`Catch Breath: ${n} Hit ${n === 1 ? "Die" : "Dice"}${rolls.length ? ", rolled " + rolls.map((r) => r.total).join(", ") : ""}`]);
    }
    case "make-camp": return out(nimble.makeCamp(ctx, action.dice), [`Make Camp: ${action.dice} Hit ${action.dice === 1 ? "Die" : "Dice"}`]);
    case "safe-rest": return out(nimble.safeRest(ctx), ["Safe Rest"]);
    case "encounter-start": return out(nimble.encounterStart(ctx, action.roll), [`Initiative ${action.roll}`]);
    case "turn-end": return out(nimble.turnEnd(ctx), ["Turn ended"]);
    case "encounter-end": return out(nimble.encounterEnd(ctx), ["Encounter ended"]);
    case "adjust": {
      const cur = typeof ctx.state[action.resource] === "number" ? (ctx.state[action.resource] as number) : 0;
      const to = clampResource(sheet, action.resource, cur + action.delta);
      return { character: withState(character, { ...ctx.state, [action.resource]: to }), log: [`${action.resource}: ${cur} → ${to}`], rolls };
    }
    case "toggle": return { character: withState(character, { ...ctx.state, [action.flag]: action.value }), log: [`${action.flag}: ${action.value ? "on" : "off"}`], rolls };
    case "equip": {
      const eq = (Array.isArray(character.frontmatter.equipment) ? character.frontmatter.equipment : []).map((e) => (typeof e === "object" && e && (e as { id: string }).id === action.id ? { ...(e as object), equipped: action.equipped } : e));
      return { character: { ...character, frontmatter: { ...character.frontmatter, equipment: eq } }, log: [`${action.equipped ? "Equipped" : "Unequipped"} ${action.id.split(".").pop()}`], rolls };
    }
  }
}

export const fmt = formatValue;
