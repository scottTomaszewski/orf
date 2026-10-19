/**
 * Nimble system module: what *happens* to a character (CR2 p.9, p.15, p.17).
 * The content format describes what is true; this code does the procedures, once, for every tool.
 * It steers on the template variables content may contribute to:
 * hit_die.heal.bonus / .maximized / .advantage, initiative.floor, actions.dying_cap, wound.damage_while_dying.
 */
import type { Sheet } from "../engine.js";
import { applyMoment, clampResource, type State } from "../moments.js";

export interface Outcome { state: State; fired: string[]; log: string[] }
export interface Ctx { sheet: Sheet; state: State }

const num = (sheet: Sheet, id: string): number => {
  const v = sheet.value(id);
  return v.kind === "int" ? v.value : 0;
};
const flag = (sheet: Sheet, id: string): boolean => {
  const v = sheet.value(id);
  return v.kind === "bool" ? v.value : false;
};
const cur = (ctx: Ctx, id: string): number => {
  const s = ctx.state[id];
  if (typeof s === "number") return s;
  return ctx.sheet.resources.get(id)?.current ?? 0;
};

class Run {
  state: State;
  fired: string[] = [];
  log: string[] = [];
  constructor(public sheet: Sheet, state: State) { this.state = { ...state }; }
  get(id: string): number { return cur({ sheet: this.sheet, state: this.state }, id); }
  set(id: string, value: number, why: string): void {
    const to = clampResource(this.sheet, id, value);
    const from = this.get(id);
    if (to !== from) this.log.push(`${id}: ${from} → ${to} (${why})`);
    this.state[id] = to;
  }
  fire(moment: string): void {
    this.fired.push(moment);
    const r = applyMoment(moment, this.sheet, this.state);
    this.state = r.state;
    for (const c of r.changes) this.log.push(`${c.resource}: ${c.from} → ${c.to} (${c.rule})`);
    for (const p of r.pending) this.log.push(`${p.resource}: roll ${p.dice} and set it (${p.rule})`);
  }
  addWounds(n: number, why: string): void {
    this.set("wounds", this.get("wounds") + n, why);
    this.fire("gain-wound");
    const max = this.sheet.resources.get("wounds")?.max;
    if (max !== undefined && this.get("wounds") >= max) this.log.push(`DEAD: Wounds reached ${max}`);
  }
  /** Fire full-hp only on the transition from below max to max. */
  fullHpCheck(hpBefore: number): void {
    const max = this.sheet.resources.get("hp")?.max;
    if (max !== undefined && hpBefore < max && this.get("hp") === max) this.fire("full-hp");
  }
  done(): Outcome { return { state: this.state, fired: this.fired, log: this.log }; }
}

export function damage(ctx: Ctx, amount: number, crit = false): Outcome {
  const r = new Run(ctx.sheet, ctx.state);
  if (amount <= 0) return r.done();
  const dying = ctx.state.dying === true;
  if (dying) {
    const w = num(ctx.sheet, "wound.damage_while_dying") + (crit ? 1 : 0);
    r.addWounds(w, `damage while Dying${crit ? ", crit" : ""}`);
    return r.done();
  }
  const temp = r.get("temp_hp");
  const fromTemp = Math.min(temp, amount);
  if (fromTemp > 0) r.set("temp_hp", temp - fromTemp, "damage");
  const rest = amount - fromTemp;
  const hp = r.get("hp");
  if (rest > 0) r.set("hp", hp - rest, "damage");
  if (hp > 0 && r.get("hp") === 0) {
    r.state.dying = true;
    r.log.push("Dying");
    r.addWounds(1, "dropped to 0 HP");
  }
  return r.done();
}

/** Gain Wounds outside the damage procedure (a spell's cost, a GM ruling, a sheet correction). Fires gain-wound; reports death. */
export function gainWounds(ctx: Ctx, n: number): Outcome {
  const r = new Run(ctx.sheet, ctx.state);
  if (n > 0) r.addWounds(n, "gained");
  return r.done();
}

export function heal(ctx: Ctx, amount: number): Outcome {
  const r = new Run(ctx.sheet, ctx.state);
  const before = r.get("hp");
  if (amount > 0) r.set("hp", before + amount, "heal");
  if (r.get("hp") > 0 && r.state.dying === true) { r.state.dying = false; r.log.push("no longer Dying"); }
  r.fullHpCheck(before);
  return r.done();
}

/**
 * One inner array per Hit Die spent: the roll(s) the player made. With hit_die.heal.advantage the
 * higher of two counts; without it only the first roll counts. Invalid or empty rolls spend nothing.
 */
export function catchBreath(ctx: Ctx, rolls: number[][]): Outcome {
  const r = new Run(ctx.sheet, ctx.state);
  const before = r.get("hp");
  const size = num(ctx.sheet, "hit_die.size");
  const str = num(ctx.sheet, "str");
  const bonus = num(ctx.sheet, "hit_die.heal.bonus");
  const maximized = flag(ctx.sheet, "hit_die.heal.maximized");
  const advantage = flag(ctx.sheet, "hit_die.heal.advantage");
  for (const dieRolls of rolls) {
    if (r.get("hit_dice") <= 0) { r.log.push("no Hit Dice left"); break; }
    const valid = dieRolls.every((x) => Number.isInteger(x) && x >= 1 && x <= size);
    if (dieRolls.length === 0 || !valid) { r.log.push(`ignored roll [${dieRolls.join(", ")}]: need 1..${size}`); continue; }
    r.set("hit_dice", r.get("hit_dice") - 1, "Catch Breath");
    const roll = maximized ? size : advantage ? Math.max(...dieRolls) : dieRolls[0];
    const healed = Math.max(0, roll + str + bonus);
    r.set("hp", r.get("hp") + healed, `Catch Breath: ${maximized ? "max" : "rolled"} ${roll} + STR ${str}${bonus ? ` + ${bonus}` : ""}`);
  }
  r.fire("catch-breath");
  return finishRest(r, ctx, before);
}

export function makeCamp(ctx: Ctx, hitDice: number): Outcome {
  const r = new Run(ctx.sheet, ctx.state);
  const before = r.get("hp");
  const size = num(ctx.sheet, "hit_die.size");
  const str = num(ctx.sheet, "str");
  const bonus = num(ctx.sheet, "hit_die.heal.bonus");
  for (let i = 0; i < hitDice && r.get("hit_dice") > 0; i++) {
    r.set("hit_dice", r.get("hit_dice") - 1, "Make Camp");
    r.set("hp", r.get("hp") + Math.max(0, size + str + bonus), `Make Camp: max ${size} + STR ${str}${bonus ? ` + ${bonus}` : ""}`);
  }
  r.fire("make-camp");
  return finishRest(r, ctx, before);
}

function finishRest(r: Run, _ctx: Ctx, hpBefore: number): Outcome {
  if (r.get("hp") > 0 && r.state.dying === true) { r.state.dying = false; r.log.push("no longer Dying"); }
  r.fullHpCheck(hpBefore);
  return r.done();
}

export function safeRest(ctx: Ctx): Outcome {
  const r = new Run(ctx.sheet, ctx.state);
  const before = r.get("hp");
  if (r.state.dying === true) { r.state.dying = false; r.log.push("no longer Dying"); }
  r.fire("safe-rest"); // hp/hit dice/mana to max, one Wound healed, temp hp cleared: the resources' own refresh rules
  r.fullHpCheck(before);
  return r.done();
}

/** First-turn actions by digit count of the Initiative roll (after the floor); capped while Dying. */
export function encounterStart(ctx: Ctx, initiativeRoll: number): Outcome {
  const r = new Run(ctx.sheet, ctx.state);
  const roll = Math.max(initiativeRoll, num(ctx.sheet, "initiative.floor"));
  let actions = roll >= 20 ? 3 : roll >= 10 ? 2 : 1;
  if (ctx.state.dying === true) actions = Math.min(actions, num(ctx.sheet, "actions.dying_cap"));
  r.set("actions", actions, `Initiative ${initiativeRoll}${roll !== initiativeRoll ? ` (floor ${roll})` : ""}`);
  r.fire("encounter-start");
  return r.done();
}

export function turnEnd(ctx: Ctx): Outcome {
  const r = new Run(ctx.sheet, ctx.state);
  r.fire("turn-end");
  if (ctx.state.dying === true) r.set("actions", Math.min(r.get("actions"), num(ctx.sheet, "actions.dying_cap")), "Dying cap");
  return r.done();
}

export function encounterEnd(ctx: Ctx): Outcome {
  const r = new Run(ctx.sheet, ctx.state);
  r.fire("encounter-end");
  return r.done();
}
