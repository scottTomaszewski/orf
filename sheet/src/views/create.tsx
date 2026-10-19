import { useComputed, useSignal } from "@preact/signals";
import { useContext, useMemo } from "preact/hooks";
import type { Document } from "../../../src/document.js";
import { creationOptions, newCharacter, STATS, type Option, type Stat } from "../../../src/sheet-model.js";
import { AppContext } from "../app-context.js";
import { localCharacterStore } from "../character-store.js";
import { Panel, CrestRule } from "../components/panel.js";
import { Stepper } from "../components/stepper.js";
import { Prose } from "../prose.js";
import { navigate } from "../router.js";

const SKILLS: { id: string; name: string; stat: Stat }[] = [
  { id: "arcana", name: "Arcana", stat: "int" }, { id: "examination", name: "Examination", stat: "int" }, { id: "lore", name: "Lore", stat: "int" },
  { id: "finesse", name: "Finesse", stat: "dex" }, { id: "stealth", name: "Stealth", stat: "dex" }, { id: "might", name: "Might", stat: "str" },
  { id: "influence", name: "Influence", stat: "wil" }, { id: "insight", name: "Insight", stat: "wil" }, { id: "naturecraft", name: "Naturecraft", stat: "wil" }, { id: "perception", name: "Perception", stat: "wil" },
];
/** Array values still available to `stat`: the multiset minus what the other stats hold, deduplicated, keeping the stat's own value. */
export function remainingValues(values: number[], placed: Record<Stat, string>, stat: Stat): number[] {
  const pool = [...values];
  for (const s of STATS) {
    if (s === stat || placed[s] === "") continue;
    const i = pool.indexOf(Number(placed[s]));
    if (i !== -1) pool.splice(i, 1);
  }
  return pool.filter((v, i, arr) => arr.indexOf(v) === i);
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hero";

function Picker({ title, name, options, value, onPick }: { title: string; name: string; options: Option[]; value: string; onPick: (id: string) => void }) {
  const focused = options.find((o) => o.id === value);
  return (
    <Panel title={title}>
      <div class="row" role="radiogroup" aria-label={title}>
        {options.map((o) => (
          <label key={o.id} class={`steel-btn pick${value === o.id ? " pick--on" : ""}`}>
            <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onPick(o.id)} /> {o.name}
          </label>
        ))}
      </div>
      {focused && <div class="small option-text"><Prose text={focused.doc.body} /></div>}
    </Panel>
  );
}

export function CreateView() {
  const { content, storage } = useContext(AppContext);
  const loaded = content.value;
  if (!loaded) return <p class="muted">Loading content…</p>;
  return <CreateForm docs={loaded.docs} storage={storage} />;
}

function CreateForm({ docs, storage }: { docs: Map<string, Document>; storage: Storage }) {
  const opts = useMemo(() => creationOptions(docs), [docs]);
  const items = useMemo(() => [...docs.values()].filter((d) => ["armor", "weapon", "item"].includes(String(d.frontmatter.type))).sort((a, b) => String(a.frontmatter.name).localeCompare(String(b.frontmatter.name))), [docs]);
  const name = useSignal(""), classId = useSignal(""), ancestryId = useSignal(""), backgroundId = useSignal("");
  const arrayId = useSignal(opts.statArrays[0]?.id ?? "");
  const placed = useSignal<Record<Stat, string>>({ str: "", dex: "", int: "", wil: "" });
  const skills = useSignal<Record<string, number>>({});
  const taken = useSignal<Set<string>>(new Set());
  const array = useComputed(() => opts.statArrays.find((a) => a.id === arrayId.value));
  const spent = useComputed(() => Object.values(skills.value).reduce((s, v) => s + v, 0));
  const placementOk = useComputed(() => {
    const vals = array.value?.values ?? [];
    const chosen = STATS.map((s) => placed.value[s]).filter((v) => v !== "").map(Number);
    if (chosen.length !== 4) return false;
    const pool = [...vals];
    for (const c of chosen) { const i = pool.indexOf(c); if (i === -1) return false; pool.splice(i, 1); }
    return pool.length === 0;
  });
  const problems = useComputed(() => {
    const p: string[] = [];
    if (!name.value.trim()) p.push("Give the character a name.");
    if (!classId.value) p.push("Pick a class.");
    if (!ancestryId.value) p.push("Pick an ancestry.");
    if (!backgroundId.value) p.push("Pick a background.");
    if (!placementOk.value) p.push("Place each value once: every stat gets one value from the array, and each value is used exactly once.");
    if (spent.value !== opts.skillPoints) p.push(`Spend exactly ${opts.skillPoints} skill points (${spent.value} spent).`);
    return p;
  });
  const create = () => {
    const id = `local.characters.${slug(name.value)}-${Math.random().toString(36).slice(2, 6)}`;
    const doc = newCharacter({
      id, name: name.value.trim(), classId: classId.value, ancestryId: ancestryId.value, backgroundId: backgroundId.value,
      stats: { str: Number(placed.value.str), dex: Number(placed.value.dex), int: Number(placed.value.int), wil: Number(placed.value.wil) },
      skills: skills.value,
      equipment: [...taken.value].map((iid) => ({ id: iid, equipped: ["armor", "weapon"].includes(String(docs.get(iid)?.frontmatter.type)) })),
    }, docs);
    localCharacterStore(storage, docs).save(doc);
    navigate(`#/play/${encodeURIComponent(id)}`);
  };
  const setSkill = (id: string, v: number) => { skills.value = { ...skills.value, [id]: v }; };
  return (
    <div class="stack">
      <h1 class="steel-h1">Create a character</h1>
      <Panel title="Identity">
        <label class="row"><span class="steel-label" id="name-label">Name</span><input class="steel-input" aria-labelledby="name-label" aria-label="Name" value={name.value} onInput={(e) => (name.value = (e.target as HTMLInputElement).value)} /></label>
      </Panel>
      <Picker title="Class" name="class" options={opts.classes} value={classId.value} onPick={(v) => (classId.value = v)} />
      <Picker title="Ancestry" name="ancestry" options={opts.ancestries} value={ancestryId.value} onPick={(v) => (ancestryId.value = v)} />
      <Picker title="Background" name="background" options={opts.backgrounds} value={backgroundId.value} onPick={(v) => (backgroundId.value = v)} />
      <Panel title="Stats">
        <div class="row" role="radiogroup" aria-label="Stat array">
          {opts.statArrays.map((a) => (
            <label key={a.id} class={`steel-btn pick${arrayId.value === a.id ? " pick--on" : ""}`}>
              <input type="radio" name="array" value={a.id} checked={arrayId.value === a.id} onChange={() => { arrayId.value = a.id; placed.value = { str: "", dex: "", int: "", wil: "" }; }} /> {a.name} ({a.values.map((v) => (v >= 0 ? `+${v}` : v)).join(" / ")})
            </label>
          ))}
        </div>
        <div class="row" style="margin-top:.5rem">
          {STATS.map((s) => (
            <label key={s} class="row"><span class="steel-label">{s.toUpperCase()}</span>
              <select class="steel-select" aria-label={s.toUpperCase()} value={placed.value[s]} onChange={(e) => (placed.value = { ...placed.value, [s]: (e.target as HTMLSelectElement).value })}>
                <option value="">—</option>
                {remainingValues(array.value?.values ?? [], placed.value, s).map((v) => <option key={v} value={String(v)}>{v >= 0 ? `+${v}` : v}</option>)}
              </select>
            </label>
          ))}
        </div>
      </Panel>
      <Panel title={`Skills (${spent.value}/${opts.skillPoints} points)`}>
        <div class="grid-2" role="group" aria-label="Skills">
          {SKILLS.map((k) => (
            <div key={k.id} class="row" style="justify-content:space-between">
              <span>{k.name} <span class="muted small">({k.stat.toUpperCase()}{placed.value[k.stat] !== "" ? ` ${Number(placed.value[k.stat]) >= 0 ? "+" : ""}${placed.value[k.stat]}` : ""})</span></span>
              <Stepper label={k.name} value={skills.value[k.id] ?? 0} min={0} max={(skills.value[k.id] ?? 0) + Math.max(0, opts.skillPoints - spent.value)} onChange={(v) => setSkill(k.id, v)} />
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Starting kit">
        <p class="small muted">Take your class's starting kit or {opts.startingGold} gp (CR2 p.20). Tick what you carry; armor and weapons start equipped.</p>
        <div class="row">
          {items.map((d) => { const id = String(d.frontmatter.id); return (
            <label key={id} class={`steel-btn pick${taken.value.has(id) ? " pick--on" : ""}`}>
              <input type="checkbox" checked={taken.value.has(id)} onChange={() => { const n = new Set(taken.value); if (n.has(id)) n.delete(id); else n.add(id); taken.value = n; }} /> {String(d.frontmatter.name)}
            </label>); })}
        </div>
      </Panel>
      <CrestRule />
      {problems.value.length > 0 && <ul class="small muted">{problems.value.map((p) => <li key={p}>{p}</li>)}</ul>}
      <div class="row"><button type="button" class="steel-btn steel-btn--primary" disabled={problems.value.length > 0} onClick={create}>Create</button></div>
    </div>
  );
}
