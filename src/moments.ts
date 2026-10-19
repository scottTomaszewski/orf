import type { Sheet } from "./engine.js";
import type { Registry } from "./registry.js";

/** The character's `state` mapping: resource currents and boolean conditions. */
export type State = Record<string, unknown>;

export interface MomentChange { resource: string; from: number; to: number; rule: string }
export interface MomentResult { state: State; changes: MomentChange[] }

export function clampResource(sheet: Sheet, id: string, value: number): number {
  const r = sheet.resources.get(id);
  if (!r) return value;
  let v = Math.max(value, r.floor);
  if (r.max !== undefined) v = Math.min(v, r.max);
  return v;
}

/**
 * Run every present resource's refresh rules for `moment`, in declaration order, clamping to [floor, max].
 * Needs the registry's resource definitions, which the sheet does not carry; pass them in.
 */
export function applyMoment(moment: string, sheet: Sheet, state: State, registry?: Registry): MomentResult {
  const reg = registry ?? sheet.registry;
  const next: State = { ...state };
  const changes: MomentChange[] = [];
  for (const r of sheet.resources.values()) {
    const def = reg.resources.get(r.id);
    if (!def) continue;
    for (const rule of def.refresh) {
      if (rule.on !== moment) continue;
      const from = typeof next[r.id] === "number" ? (next[r.id] as number) : r.current;
      let target: number | undefined;
      let label: string;
      if (rule.to === "max") { if (r.max === undefined) continue; target = r.max; label = `${moment} to max`; }
      else if (typeof rule.to === "number") { target = rule.to; label = `${moment} to ${rule.to}`; }
      else if (typeof rule.add === "number") { target = from + rule.add; label = `${moment} add ${rule.add}`; }
      else continue;
      const to = clampResource(sheet, r.id, target);
      if (to !== from) changes.push({ resource: r.id, from, to, rule: label });
      next[r.id] = to;
    }
  }
  return { state: next, changes };
}
