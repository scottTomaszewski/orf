/** The Play view's verbs: pure over (character, sheet); wraps the Nimble module and returns the updated document plus a human log. */
import type { Document } from "../../src/document.js";
import type { Sheet } from "../../src/engine.js";
import { formatValue } from "../../src/expr/value.js";
import { rollDice } from "../../src/sheet-model.js";
import * as nimble from "../../src/systems/nimble.js";
import { clampResource } from "../../src/moments.js";

export type Action =
  | { kind: "damage"; amount: number; crit: boolean } | { kind: "heal"; amount: number }
  | { kind: "catch-breath"; dice: number; rolls?: number[][] } | { kind: "make-camp"; dice: number } | { kind: "safe-rest" }
  | { kind: "encounter-start"; roll?: number }   // no roll = the sheet rolls d20 + initiative.bonus
  | { kind: "turn-end" } | { kind: "encounter-end" }
  | { kind: "adjust"; resource: string; delta: number } | { kind: "toggle"; flag: string; value: boolean }
  | { kind: "equip"; id: string; equipped: boolean }
  | { kind: "set-hp"; value: number }          // routed through damage/heal so Dying follows the rules
  | { kind: "set-wounds"; value: number };     // up: gainWounds (fires gain-wound, death check); down: direct

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
  /** Resources whose max is dice ask the consumer to roll on refresh: the sheet rolls them here, visibly. */
  const settle = (o: nimble.Outcome): nimble.Outcome => {
    const pending = o.log.filter((l) => /^(\S+): roll (.+) and set it/.test(l));
    for (const line of pending) {
      const m = /^(\S+): roll (.+) and set it/.exec(line)!;
      const r = rollDice(m[2], rng);
      rolls.push({ text: m[2], rolls: r.rolls, total: r.total });
      o.state[m[1]] = r.total;
      o.log.push(`${m[1]}: rolled ${m[2]} → ${r.total}`);
    }
    return o;
  };
  const out = (o: nimble.Outcome, extra: string[] = []): ActionResult => { settle(o); return { character: withState(character, o.state), log: [...extra, ...o.log], rolls }; };
  const posInt = (v: number) => Math.max(0, Math.floor(Number(v) || 0));
  switch (action.kind) {
    case "damage": { const a = posInt(action.amount); if (a === 0) return { character, log: ["No damage entered"], rolls }; return out(nimble.damage(ctx, a, action.crit), [`Took ${a} damage${action.crit ? " (crit)" : ""}`]); }
    case "heal": { const a = posInt(action.amount); if (a === 0) return { character, log: ["No healing entered"], rolls }; return out(nimble.heal(ctx, a), [`Healed ${a}`]); }
    case "set-hp": {
      const cur = typeof ctx.state.hp === "number" ? ctx.state.hp : 0;
      if (action.value < cur) return out(nimble.damage(ctx, cur - action.value, false), [`HP set to ${action.value} (${cur - action.value} damage)`]);
      if (action.value > cur) return out(nimble.heal(ctx, action.value - cur), [`HP set to ${action.value} (healed ${action.value - cur})`]);
      return { character, log: [], rolls };
    }
    case "set-wounds": {
      const cur = typeof ctx.state.wounds === "number" ? ctx.state.wounds : 0;
      if (action.value > cur) return out(nimble.gainWounds(ctx, action.value - cur), [`Gained ${action.value - cur} Wound${action.value - cur === 1 ? "" : "s"}`]);
      const to = clampResource(sheet, "wounds", action.value);
      return { character: withState(character, { ...ctx.state, wounds: to }), log: [`Wounds: ${cur} → ${to}`], rolls };
    }
    case "catch-breath": {
      const size = num(sheet, "hit_die.size");
      const adv = flag(sheet, "hit_die.heal.advantage");
      const n = Math.min(posInt(action.dice), typeof ctx.state.hit_dice === "number" ? ctx.state.hit_dice : 0);
      if (n === 0) return { character, log: ["No Hit Dice to spend"], rolls };
      const dieRolls: number[][] = [];
      for (let i = 0; i < n; i++) {
        const manual = action.rolls?.[i];
        if (manual && manual.length) { dieRolls.push(manual); rolls.push({ text: `d${size} (entered)`, rolls: manual, total: adv ? Math.max(...manual) : manual[0] }); continue; }
        const r = rollDice(`${adv ? 2 : 1}d${size}${adv ? "kh1" : ""}`, rng);
        rolls.push({ text: `${adv ? 2 : 1}d${size}${adv ? "kh1" : ""}`, rolls: r.rolls, total: r.total });
        dieRolls.push(r.rolls);
      }
      return out(nimble.catchBreath(ctx, dieRolls), [`Catch Breath: ${n} Hit ${n === 1 ? "Die" : "Dice"}, rolled ${rolls.map((r) => r.total).join(", ")}`]);
    }
    case "make-camp": { const d = posInt(action.dice); if (d === 0) return { character, log: ["No Hit Dice to spend"], rolls }; return out(nimble.makeCamp(ctx, d), [`Make Camp: ${d} Hit ${d === 1 ? "Die" : "Dice"}`]); }
    case "safe-rest": return out(nimble.safeRest(ctx), ["Safe Rest"]);
    case "encounter-start": {
      let roll = action.roll;
      if (roll === undefined || !Number.isFinite(roll)) {
        const bonus = num(sheet, "initiative.bonus");
        const r = rollDice(`1d20${bonus >= 0 ? ` + ${bonus}` : ` - ${-bonus}`}`, rng);
        rolls.push({ text: r.text, rolls: r.rolls, total: r.total });
        roll = r.total;
        return out(nimble.encounterStart(ctx, roll), [`Initiative: rolled ${r.text} → ${roll}`]);
      }
      return out(nimble.encounterStart(ctx, roll), [`Initiative ${roll} (entered)`]);
    }
    case "turn-end": return out(nimble.turnEnd(ctx), ["Turn ended"]);
    case "encounter-end": return out(nimble.encounterEnd(ctx), ["Encounter ended"]);
    case "adjust": {
      const cur = typeof ctx.state[action.resource] === "number" ? (ctx.state[action.resource] as number) : 0;
      const to = clampResource(sheet, action.resource, cur + action.delta);
      return { character: withState(character, { ...ctx.state, [action.resource]: to }), log: [`${action.resource}: ${cur} → ${to}`], rolls };
    }
    case "toggle": return { character: withState(character, { ...ctx.state, [action.flag]: action.value }), log: [`${action.flag}: ${action.value ? "on" : "off"}`], rolls };
    case "equip": {
      const list = Array.isArray(character.frontmatter.equipment) ? character.frontmatter.equipment : [];
      if (!list.some((e) => typeof e === "object" && e && (e as { id: string }).id === action.id)) return { character, log: [`${action.id} is not in the inventory`], rolls };
      const eq = list.map((e) => (typeof e === "object" && e && (e as { id: string }).id === action.id ? { ...(e as object), equipped: action.equipped } : e));
      return { character: { ...character, frontmatter: { ...character.frontmatter, equipment: eq } }, log: [`${action.equipped ? "Equipped" : "Unequipped"} ${action.id.split(".").pop()}`], rolls };
    }
  }
}

export const fmt = formatValue;
