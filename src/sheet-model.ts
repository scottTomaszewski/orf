/** Pure helpers the sheet's views need: creation, level-up, spells known, skill rows, a dice roller. */
import type { Document } from "./document.js";
import type { Sheet } from "./engine.js";
import { parse } from "./expr/parser.js";
import type { Expr } from "./expr/ast.js";
import type { Registry, SlotDef } from "./registry.js";

type FM = Record<string, unknown>;
const isObj = (v: unknown): v is FM => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const STATS = ["str", "dex", "int", "wil"] as const;
export type Stat = (typeof STATS)[number];

export interface Option { id: string; name: string; doc: Document }
const opt = (d: Document): Option => ({ id: String(d.frontmatter.id), name: String(d.frontmatter.name), doc: d });
const ofType = (docs: Map<string, Document>, type: string): Option[] =>
  [...docs.values()].filter((d) => d.frontmatter.type === type).map(opt).sort((a, b) => a.name.localeCompare(b.name));

export interface StatArray { id: string; name: string; values: number[] }
export function creationOptions(docs: Map<string, Document>): { classes: Option[]; ancestries: Option[]; backgrounds: Option[]; statArrays: StatArray[]; skillPoints: number; startingGold: number } {
  const creation = [...docs.values()].find((d) => d.frontmatter.type === "creation");
  const arrays = list(creation?.frontmatter.stat_arrays).filter(isObj).map((a) => ({ id: String(a.id), name: String(a.name ?? a.id), values: list(a.values).map(Number) }));
  return {
    classes: ofType(docs, "class"), ancestries: ofType(docs, "ancestry"), backgrounds: ofType(docs, "background"),
    statArrays: arrays,
    skillPoints: typeof creation?.frontmatter.skill_points_at_creation === "number" ? creation.frontmatter.skill_points_at_creation : 4,
    startingGold: typeof creation?.frontmatter.starting_gold === "number" ? creation.frontmatter.starting_gold : 50,
  };
}

export interface NewCharacterInput {
  id: string; name: string; classId: string; ancestryId: string; backgroundId: string;
  stats: Record<Stat, number>; skills: Record<string, number>; equipment: { id: string; equipped: boolean }[];
}
export function newCharacter(input: NewCharacterInput, docs: Map<string, Document>): Document {
  const cls = docs.get(input.classId);
  const hp = typeof cls?.frontmatter.starting_hp === "number" ? cls.frontmatter.starting_hp : 10;
  const frontmatter: FM = {
    id: input.id, type: "character", system: "nimble", name: input.name,
    stats: { ...input.stats },
    ancestry: input.ancestryId, background: input.backgroundId,
    classes: [{ id: input.classId, level: 1 }],
    skills: Object.fromEntries(Object.entries(input.skills).filter(([, v]) => v > 0)),
    levels: [{ level: 1, hp, source: "starting" }],
    choices: {},
    equipment: input.equipment.map((e) => ({ id: e.id, equipped: e.equipped })),
    state: {},
  };
  return { path: `${input.id}.md`, frontmatter, body: "", bodyStartLine: 2 };
}

/** The documents (or literal options) a slot offers this character. */
export function slotOptions(slot: SlotDef, choice: FM, registry: Registry, docs: Map<string, Document>, sheet?: Sheet): Option[] | string[] {
  const from = isObj(choice.from) ? choice.from : {};
  if (Array.isArray(from.options)) return from.options.map(String);
  const type = String(from.type ?? "");
  const tags = list(from.tags).map(String);
  const attached = new Set(sheet?.attachments.map((a) => String(a.doc.frontmatter.id)) ?? []);
  void registry;
  return [...docs.values()]
    .filter((d) => d.frontmatter.type === type && tags.every((t) => list(d.frontmatter.tags).map(String).includes(t)))
    .filter((d) => !(choice.unique === "character" && attached.has(String(d.frontmatter.id))))
    .map(opt).sort((a, b) => a.name.localeCompare(b.name));
}

export interface LevelUpSlot { slot: SlotDef; count: number; options: Option[] | string[]; picked: string[]; text: string }
export interface LevelUpPrompt {
  classLevelId: string; classId: string; level: number; doc: Document;
  grants: Option[]; slots: LevelUpSlot[]; hpRoll: { die: number; advantage: true }; skillPoint: true;
}
export function levelUpPrompts(character: Document, registry: Registry, docs: Map<string, Document>, sheet?: Sheet): LevelUpPrompt | undefined {
  const cls = list(character.frontmatter.classes).find(isObj);
  if (!cls) return undefined;
  const classId = String(cls.id);
  const level = (typeof cls.level === "number" ? cls.level : 1) + 1;
  if (level > 20) return undefined;
  const doc = [...docs.values()].find((d) => d.frontmatter.type === "class-level" && d.frontmatter.class === classId && d.frontmatter.level === level);
  if (!doc) return undefined;
  const classDoc = docs.get(classId);
  const die = typeof classDoc?.frontmatter.hit_die === "number" ? classDoc.frontmatter.hit_die : 6;
  const classLevelId = String(doc.frontmatter.id);
  const grants = list(doc.frontmatter.grants).map((g) => docs.get(String(g))).filter((d): d is Document => !!d).map(opt);
  const slots: LevelUpSlot[] = list(doc.frontmatter.choices).filter(isObj).map((c) => {
    const slotId = `${classLevelId}.${String(c.slot)}`;
    const slot = registry.slots.get(slotId) ?? { id: slotId, declaredIn: doc.path };
    return { slot, count: typeof c.count === "number" ? c.count : 1, options: slotOptions(slot, c, registry, docs, sheet), picked: [], text: String(c.slot) };
  });
  return { classLevelId, classId, level, doc, grants, slots, hpRoll: { die, advantage: true }, skillPoint: true };
}

export interface LevelUpAnswers { hp: number; picks: Record<string, string[]>; skill: string; moveSkill?: { from: string; to: string } }
export function applyLevelUp(character: Document, prompt: LevelUpPrompt, answers: LevelUpAnswers): Document {
  const fm: FM = structuredClone(character.frontmatter);
  const classes = list(fm.classes).filter(isObj);
  for (const c of classes) if (c.id === prompt.classId) c.level = prompt.level;
  fm.classes = classes;
  fm.levels = [...list(fm.levels), { level: prompt.level, hp: answers.hp, source: "roll" }];
  const choices = isObj(fm.choices) ? fm.choices : {};
  for (const [slot, picks] of Object.entries(answers.picks)) choices[slot] = picks;
  fm.choices = choices;
  const skills: Record<string, number> = isObj(fm.skills) ? { ...(fm.skills as Record<string, number>) } : {};
  skills[answers.skill] = (skills[answers.skill] ?? 0) + 1;
  if (answers.moveSkill && (skills[answers.moveSkill.from] ?? 0) > 0) {
    skills[answers.moveSkill.from] -= 1;
    skills[answers.moveSkill.to] = (skills[answers.moveSkill.to] ?? 0) + 1;
  }
  fm.skills = Object.fromEntries(Object.entries(skills).filter(([, v]) => v > 0));
  return { ...character, frontmatter: fm };
}

export interface KnownSpell { school: string; tier: number; spell: Document }
export function spellsKnown(sheet: Sheet, docs: Map<string, Document>): KnownSpell[] {
  const schools = new Set(sheet.attachments.filter((a) => a.doc.frontmatter.type === "spell-school").map((a) => String(a.doc.frontmatter.id).split(".").pop()));
  const tierMax = sheet.value("spells.tier.max");
  const max = tierMax.kind === "int" ? tierMax.value : 0;
  return [...docs.values()]
    .filter((d) => d.frontmatter.type === "spell" && schools.has(String(d.frontmatter.school)) && typeof d.frontmatter.tier === "number" && d.frontmatter.tier <= max)
    .map((d) => ({ school: String(d.frontmatter.school), tier: d.frontmatter.tier as number, spell: d }))
    .sort((a, b) => a.school.localeCompare(b.school) || a.tier - b.tier || String(a.spell.frontmatter.name).localeCompare(String(b.spell.frontmatter.name)));
}

export interface SkillRow { id: string; name: string; stat: string; points: number; total: number }
export function skillRows(sheet: Sheet): SkillRow[] {
  const rows: SkillRow[] = [];
  for (const [id, v] of sheet.variables) {
    const m = /^skill\.([a-z_]+)$/.exec(id);
    if (!m) continue;
    const key = m[1];
    if (!sheet.registry.variables.has(`skill.${key}.points`)) continue;   // skill.cap is not a skill
    const pts = sheet.value(`skill.${key}.points`);
    const def = sheet.registry.variables.get(id);
    const stat = def?.formula && typeof def.formula === "string" ? (STATS.find((s) => new RegExp(`\\b${s}\\b`).test(def.formula as string)) ?? "") : "";
    rows.push({ id: key, name: key.charAt(0).toUpperCase() + key.slice(1), stat, points: pts.kind === "int" ? pts.value : 0, total: v.value.kind === "int" ? v.value.value : 0 });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function saveRows(sheet: Sheet): { stat: Stat; bonus: number; advantage: number }[] {
  return STATS.map((stat) => {
    const b = sheet.value(`save.${stat}`), a = sheet.value(`save.${stat}.advantage`);
    return { stat, bonus: b.kind === "int" ? b.value : 0, advantage: a.kind === "int" ? a.value : 0 };
  });
}

/** Roll a dice expression ("2d6 + 1", "4d6kh3", "1d8 - 1"). rng in [0, 1). The sheet rolls; the engine never does. */
export function rollDice(text: string, rng: () => number = Math.random): { total: number; rolls: number[]; text: string } {
  const rolls: number[] = [];
  const walk = (e: Expr): number => {
    switch (e.kind) {
      case "int": return e.value;
      case "dice": {
        const these: number[] = [];
        for (let i = 0; i < e.count; i++) these.push(1 + Math.floor(rng() * e.sides));
        rolls.push(...these);
        let kept = [...these];
        if (e.keep) {
          const sorted = [...these].sort((a, b) => a - b);
          const n = Math.min(e.keep.n, these.length);
          if (e.keep.mode === "kh") kept = sorted.slice(-n);
          else if (e.keep.mode === "kl") kept = sorted.slice(0, n);
          else if (e.keep.mode === "dh") kept = sorted.slice(0, these.length - n);
          else kept = sorted.slice(n);
        }
        return kept.reduce((s, x) => s + x, 0);
      }
      case "unary": return e.op === "-" ? -walk(e.arg) : Number(!walk(e.arg));
      case "binary": {
        const l = walk(e.left), r = walk(e.right);
        switch (e.op) { case "+": return l + r; case "-": return l - r; case "*": return l * r; case "/": return Math.floor(l / r); default: throw new Error(`cannot roll "${e.op}"`); }
      }
      default: throw new Error(`cannot roll ${e.kind}`);
    }
  };
  const total = walk(parse(text));
  return { total, rolls, text };
}
