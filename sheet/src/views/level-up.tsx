import { useComputed, useSignal } from "@preact/signals";
import { useContext, useMemo } from "preact/hooks";
import type { Document } from "../../../src/document.js";
import type { Loaded } from "../../../src/content-store.js";
import { evaluateCharacter } from "../../../src/engine.js";
import { applyLevelUp, levelUpPrompts, rollDice, type LevelUpPrompt, type Option } from "../../../src/sheet-model.js";
import { AppContext } from "../app-context.js";
import { localCharacterStore } from "../character-store.js";
import { Panel, CrestRule } from "../components/panel.js";
import { Prose } from "../prose.js";
import { navigate, route } from "../router.js";

const SKILLS = ["arcana", "examination", "lore", "finesse", "stealth", "might", "influence", "insight", "naturecraft", "perception"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function LevelUpView() {
  const { content, storage } = useContext(AppContext);
  const loaded = content.value;
  const r = route.value;
  if (!loaded) return <p class="muted">Loading content…</p>;
  const store = localCharacterStore(storage, loaded.docs);
  const id = r.view === "level-up" ? r.id : undefined;
  const doc = id ? store.get(id) : undefined;
  if (!doc) {
    const list = store.list();
    return <div class="stack"><h1 class="steel-h1">Level up</h1>{list.length === 0 ? <p class="muted">No characters yet.</p> : <div class="grid-2">{list.map((c) => <button key={c.id} type="button" class="steel-panel pick" onClick={() => navigate(`#/level-up/${encodeURIComponent(c.id)}`)}><b>{c.name}</b> <span class="muted small">{c.summary}</span></button>)}</div>}</div>;
  }
  return <LevelUpForm key={id} doc={doc} loaded={loaded} storage={storage} />;
}

function LevelUpForm({ doc, loaded, storage }: { doc: Document; loaded: Loaded; storage: Storage }) {
  const { rng } = useContext(AppContext);
  const sheet = useMemo(() => evaluateCharacter(doc, loaded.registry, loaded.docs), [doc, loaded]);
  const prompt = useMemo(() => levelUpPrompts(doc, loaded.registry, loaded.docs, sheet), [doc, loaded, sheet]);
  const level = (doc.frontmatter.classes as { level: number }[] | undefined)?.[0]?.level ?? 1;
  if (!prompt) return <div class="stack"><h1 class="steel-h1">{String(doc.frontmatter.name)}</h1><p class="muted">Already level {level}: {level >= 20 ? "level 20 is the cap" : "no class-level document exists for the next level yet"}.</p></div>;
  return <Prompts doc={doc} prompt={prompt} loaded={loaded} storage={storage} rng={rng} />;
}

function Prompts({ doc, prompt, loaded, storage, rng }: { doc: Document; prompt: LevelUpPrompt; loaded: Loaded; storage: Storage; rng: () => number }) {
  const picks = useSignal<Record<string, string[]>>({});
  const hp = useSignal<string>("");
  const rolled = useSignal<number[] | undefined>(undefined);
  const skill = useSignal<string>("");
  const move = useSignal<{ from: string; to: string } | undefined>(undefined);
  const currentSkills = (doc.frontmatter.skills ?? {}) as Record<string, number>;
  const slotId = (s: string) => `${prompt.classLevelId}.${s}`;
  const incomplete = useComputed(() => prompt.slots.filter((s) => (picks.value[slotId(s.text)] ?? []).length !== s.count).map((s) => s.text));
  const ready = useComputed(() => incomplete.value.length === 0 && Number(hp.value) > 0 && skill.value !== "");
  const roll = () => {
    const a = rollDice(`1d${prompt.hpRoll.die}`, rng).total, b = rollDice(`1d${prompt.hpRoll.die}`, rng).total;
    rolled.value = [a, b]; hp.value = String(Math.max(a, b));
  };
  const toggle = (slot: string, value: string, count: number) => {
    const cur = picks.value[slot] ?? [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : count === 1 ? [value] : cur.length < count ? [...cur, value] : cur;
    picks.value = { ...picks.value, [slot]: next };
  };
  const apply = () => {
    const next = applyLevelUp(doc, prompt, { hp: Number(hp.value), picks: picks.value, skill: skill.value, moveSkill: move.value });
    localCharacterStore(storage, loaded.docs).save(next);
    navigate(`#/play/${encodeURIComponent(String(doc.frontmatter.id))}`);
  };
  return (
    <div class="stack">
      <h1 class="steel-h1">{String(doc.frontmatter.name)}: level {prompt.level - 1} → {prompt.level}</h1>
      <Panel title={String(prompt.doc.frontmatter.name)}><Prose text={prompt.doc.body} /></Panel>
      {prompt.grants.length > 0 && (
        <Panel title="You gain">
          <ul class="plain">{prompt.grants.map((g) => <li key={g.id}><b>{g.name}</b><div class="small option-text"><Prose text={g.doc.body} /></div></li>)}</ul>
        </Panel>
      )}
      {prompt.slots.map((s) => {
        const id = slotId(s.text);
        const chosen = picks.value[id] ?? [];
        const isDocs = s.options.length > 0 && typeof s.options[0] !== "string";
        return (
          <Panel key={id} title={`Choose ${s.count}: ${s.text}`}>
            <div class="row" role={s.count === 1 ? "radiogroup" : "group"} aria-label={s.text}>
              {(s.options as (Option | string)[]).map((o) => { const value = typeof o === "string" ? o : o.id; const label = typeof o === "string" ? o : o.name; return (
                <label key={value} class={`steel-btn pick${chosen.includes(value) ? " pick--on" : ""}`}>
                  <input type={s.count === 1 ? "radio" : "checkbox"} name={id} value={value} checked={chosen.includes(value)} onChange={() => toggle(id, value, s.count)} /> {label}
                </label>); })}
            </div>
            {isDocs && chosen.map((c) => { const o = (s.options as Option[]).find((x) => x.id === c); return o ? <div key={c} class="small option-text"><b>{o.name}</b><Prose text={o.doc.body} /></div> : null; })}
          </Panel>
        );
      })}
      <Panel title="Hit Points">
        <div class="row">
          <button type="button" class="steel-btn" onClick={roll}>Roll with advantage (d{prompt.hpRoll.die})</button>
          {rolled.value && <span class="small muted">rolled {rolled.value[0]} and {rolled.value[1]}, keeping the higher</span>}
          <label class="row"><span class="steel-label">HP gained</span><input class="steel-input" style="width:4rem" type="number" min="1" aria-label="HP gained" value={hp.value} onInput={(e) => (hp.value = (e.target as HTMLInputElement).value)} /></label>
        </div>
      </Panel>
      <Panel title="Skill point">
        <div class="row" role="radiogroup" aria-label="skill point">
          {SKILLS.map((k) => <label key={k} class={`steel-btn pick${skill.value === k ? " pick--on" : ""}`}><input type="radio" name="skill" value={k} checked={skill.value === k} onChange={() => (skill.value = k)} /> {cap(k)}{currentSkills[k] ? <span class="muted small"> +{currentSkills[k]}</span> : null}</label>)}
        </div>
        <details class="small" style="margin-top:.5rem"><summary class="muted">Move one point (optional)</summary>
          <div class="row">
            <select class="steel-select" aria-label="move from" value={move.value?.from ?? ""} onChange={(e) => (move.value = { from: (e.target as HTMLSelectElement).value, to: move.value?.to ?? "" })}><option value="">from…</option>{SKILLS.filter((k) => currentSkills[k] > 0).map((k) => <option key={k} value={k}>{cap(k)}</option>)}</select>
            <select class="steel-select" aria-label="move to" value={move.value?.to ?? ""} onChange={(e) => (move.value = { from: move.value?.from ?? "", to: (e.target as HTMLSelectElement).value })}><option value="">to…</option>{SKILLS.map((k) => <option key={k} value={k}>{cap(k)}</option>)}</select>
          </div>
        </details>
      </Panel>
      <CrestRule />
      {!ready.value && <p class="small muted">{[...incomplete.value.map((s) => `pick ${s}`), Number(hp.value) > 0 ? "" : "roll or enter HP", skill.value ? "" : "choose a skill point"].filter(Boolean).join(" · ")}</p>}
      <div class="row"><button type="button" class="steel-btn steel-btn--primary" disabled={!ready.value} onClick={apply}>Apply</button></div>
    </div>
  );
}
