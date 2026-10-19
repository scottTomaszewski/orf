import { useComputed, useSignal } from "@preact/signals";
import { useContext, useMemo } from "preact/hooks";
import type { Document } from "../../../src/document.js";
import { evaluateCharacter, type Sheet } from "../../../src/engine.js";
import { formatValue } from "../../../src/expr/value.js";
import type { Loaded } from "../../../src/content-store.js";
import { saveRows, skillRows, spellsKnown } from "../../../src/sheet-model.js";
import { AppContext } from "../app-context.js";
import { localCharacterStore, serializeCharacter, toShareLink } from "../character-store.js";
import { Panel, CrestRule } from "../components/panel.js";
import { Stepper } from "../components/stepper.js";
import { Value } from "../components/value.js";
import { performAction, type Action, type Roll } from "../play-actions.js";
import { Prose } from "../prose.js";
import { navigate, route } from "../router.js";

const CORE = new Set(["hp", "temp_hp", "wounds", "hit_dice", "actions"]);
const STATE_FLAGS = ["in_wilderness", "ally_nearby", "raging", "concentrating"];

export function PlayView() {
  const { content, storage } = useContext(AppContext);
  const loaded = content.value;
  const r = route.value;
  if (!loaded) return <p class="muted">Loading content…</p>;
  const store = localCharacterStore(storage, loaded.docs);
  const id = r.view === "play" ? r.id : undefined;
  const doc = id ? store.get(id) : undefined;
  if (!doc) return <CharacterList loaded={loaded} storage={storage} />;
  return <Sheet key={id} doc={doc} loaded={loaded} storage={storage} />;
}

function CharacterList({ loaded, storage }: { loaded: Loaded; storage: Storage }) {
  const store = localCharacterStore(storage, loaded.docs);
  const list = store.list();
  const importText = useSignal("");
  return (
    <div class="stack">
      <h1 class="steel-h1">Characters</h1>
      {list.length === 0 && (
        <div class="steel-plate empty">
          <span class="sc-crest lg" aria-hidden="true"><span class="glyph">◆</span></span>
          <p>No characters yet.</p>
          <a class="steel-btn steel-btn--primary" href="#/create" style="display:inline-flex;align-items:center;text-decoration:none">Create a character</a>
          <p class="small">Or paste a character file below.</p>
        </div>
      )}
      <div class="plates">
        {list.map((c) => <button key={c.id} type="button" class="steel-panel plate" onClick={() => navigate(`#/play/${encodeURIComponent(c.id)}`)}><span class="sc-crest sm" aria-hidden="true"><span>{initial(c.name)}</span></span><b>{c.name}</b> <span class="muted small">{c.summary}</span></button>)}
      </div>
      <Panel title="Import a character (.md)">
        <textarea class="steel-input" rows={4} style="width:100%" aria-label="character file" value={importText.value} onInput={(e) => (importText.value = (e.target as HTMLTextAreaElement).value)} />
        <div class="row"><button type="button" class="steel-btn" onClick={() => { try { const d = parseImport(importText.value); store.save(d); navigate(`#/play/${encodeURIComponent(String(d.frontmatter.id))}`); } catch (e) { alert(e instanceof Error ? e.message : String(e)); } }}>Import</button></div>
      </Panel>
    </div>
  );
}
import { parseCharacterText } from "../character-store.js";
const parseImport = (t: string) => parseCharacterText(t);

export const CURRENT_KEY = "nimble-sheet:current";
function Sheet({ doc, loaded, storage }: { doc: Document; loaded: Loaded; storage: Storage }) {
  const { rng } = useContext(AppContext);
  try { storage.setItem(CURRENT_KEY, String(doc.frontmatter.id)); } catch { /* ignore */ }
  const store = localCharacterStore(storage, loaded.docs);
  const character = useSignal<Document>(doc);
  const log = useSignal<string[]>([]);
  const lastRolls = useSignal<Roll[]>([]);
  const sheet = useComputed(() => evaluateCharacter(character.value, loaded.registry, loaded.docs));
  const act = (a: Action) => {
    const r = performAction(character.value, sheet.value, a, rng);
    character.value = r.character;
    store.save(r.character);
    log.value = [...r.log, ...log.value].slice(0, 40);
    lastRolls.value = r.rolls;
  };
  const s = sheet.value;
  const n = (id: string) => { const v = s.value(id); return v.kind === "int" ? v.value : 0; };
  const res = (id: string) => s.resources.get(id);
  const dmg = useSignal("1"), crit = useSignal(false), heal = useSignal("1"), hd = useSignal("1"), init = useSignal(""), hdRolls = useSignal("");
  const fm = character.value.frontmatter;
  const cls = Array.isArray(fm.classes) ? (fm.classes[0] as { id: string; level: number }) : undefined;
  const nameOf = (id: unknown) => (typeof id === "string" ? String(loaded.docs.get(id)?.frontmatter.name ?? id) : "");
  const docsFm = loaded.docs as Map<string, { frontmatter: Record<string, unknown> }>;
  const problems = s.diagnostics;
  const dying = (fm.state as Record<string, unknown> | undefined)?.dying === true;
  const bloodied = s.value("bloodied"); const isBloodied = bloodied.kind === "bool" && bloodied.value;
  const spells = useMemo(() => spellsKnown(s, loaded.docs), [s]);
  const features = s.attachments.filter((a) => a.doc.frontmatter.type === "feature");
  const equipment = (Array.isArray(fm.equipment) ? fm.equipment : []).filter((e): e is { id: string; equipped: boolean } => typeof e === "object" && e !== null && typeof (e as { id?: unknown }).id === "string");
  const exportMd = () => { const blob = new Blob([serializeCharacter(character.value)], { type: "text/markdown" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${String(fm.id).split(".").pop()}.md`; a.click(); };
  return (
    <div class="stack">
      <header class="steel-plate head" aria-label="character">
        <span class="sc-crest lg head__crest" aria-hidden="true"><span>{initial(cls ? nameOf(cls.id) : String(fm.name))}</span></span>
        <span class="steel-eyebrow">character</span>
        <h1 class="steel-h1 head__name">{String(fm.name)}</h1>
        <div class="head__deck">
          <span class="steel-chip">{nameOf(fm.ancestry)}</span><span class="steel-chip">{nameOf(fm.background)}</span>
        </div>
        <div class="head__rail">
          {cls && <span class="steel-chip">{nameOf(cls.id)} <b>{cls.level}</b></span>}
          <span class="steel-chip">hit die <b>d{n("hit_die.size")}</b></span>
        </div>
        <div class="head__actions">
          <button type="button" class="steel-btn" onClick={() => navigate(`#/level-up/${encodeURIComponent(String(fm.id))}`)}>Level up</button>
          <button type="button" class="steel-btn" onClick={exportMd}>Export .md</button>
          <button type="button" class="steel-btn" onClick={() => { void navigator.clipboard?.writeText(toShareLink(character.value)); log.value = ["Share link copied", ...log.value]; }}>Share link</button>
        </div>
      </header>
      {problems.length > 0 && (
        <section class="steel-panel problems" aria-label="Problems"><span class="steel-label">problems</span>
          <ul class="small">{problems.map((d, i) => <li key={i} class={d.severity === "warning" ? "muted" : ""}>{d.message}</li>)}</ul>
        </section>
      )}
      <div class="board">
        <Panel title="Hit Points" kind="hp" right={<span class="row" style="gap:.4rem">{dying && <span class="steel-badge steel-badge--hp">Dying</span>}{isBloodied && <span class="steel-badge steel-badge--wound">Bloodied</span>}<Value sheet={s} id="hp.max" label="max" docs={docsFm} /></span>}>
          <div class="track track--hp" aria-hidden="true"><i style={`width:${pct(res("hp"))}%`} /></div>
          <div class="row" style="justify-content:space-between;margin-top:.55rem">
            <Stepper label="HP" value={res("hp")?.current ?? 0} min={0} max={res("hp")?.max ?? 0} onChange={(v) => act({ kind: "set-hp", value: v })} />
            <span class="steel-mono small muted">{res("hp")?.current ?? 0} / {res("hp")?.max ?? "?"}</span>
          </div>
          <div class="row small" style="margin-top:.4rem"><span class="steel-label">temp hp</span><Stepper label="temp HP" value={res("temp_hp")?.current ?? 0} min={0} onChange={(v) => act({ kind: "adjust", resource: "temp_hp", delta: v - (res("temp_hp")?.current ?? 0) })} /></div>
          <div class="row" style="margin-top:.5rem">
            <input class="steel-input" style="width:4.5rem" type="number" min="0" aria-label="damage amount" value={dmg.value} onInput={(e) => (dmg.value = (e.target as HTMLInputElement).value)} />
            <label class="small"><input type="checkbox" checked={crit.value} onChange={() => (crit.value = !crit.value)} /> crit</label>
            <button type="button" class="steel-btn" disabled={!(Number(dmg.value) > 0)} onClick={() => act({ kind: "damage", amount: Number(dmg.value) || 0, crit: crit.value })}>Damage</button>
            <input class="steel-input" style="width:4.5rem" type="number" min="0" aria-label="heal amount" value={heal.value} onInput={(e) => (heal.value = (e.target as HTMLInputElement).value)} />
            <button type="button" class="steel-btn" disabled={!(Number(heal.value) > 0)} onClick={() => act({ kind: "heal", amount: Number(heal.value) || 0 })}>Heal</button>
          </div>
        </Panel>
        <Panel title="Wounds" kind="wound" right={<Value sheet={s} id="wounds.max" label="max" docs={docsFm} />}>
          <div class="row" style="justify-content:space-between">
            <span class="wounds" aria-hidden="true">{Array.from({ length: res("wounds")?.max ?? 6 }, (_, i) => <span key={i} class={i < (res("wounds")?.current ?? 0) ? "seal seal--wound on" : "seal seal--wound"}>{i < (res("wounds")?.current ?? 0) ? "◆" : "◇"}</span>)}</span>
            <span><span class="steel-mono">{res("wounds")?.current ?? 0} / {res("wounds")?.max ?? "?"}</span>{(res("wounds")?.current ?? 0) >= (res("wounds")?.max ?? Infinity) && <span class="steel-badge steel-badge--hp"> Dead</span>}</span>
            <Stepper label="Wounds" value={res("wounds")?.current ?? 0} min={0} max={res("wounds")?.max ?? 6} onChange={(v) => act({ kind: "set-wounds", value: v })} />
          </div>
        </Panel>
        <Panel title="Hit Dice" right={<span class="small muted">d<Value sheet={s} id="hit_die.size" docs={docsFm} /> each</span>}>
          <div class="row" style="justify-content:space-between">
            <Stepper label="Hit Dice" value={res("hit_dice")?.current ?? 0} min={0} max={res("hit_dice")?.max ?? 0} onChange={(v) => act({ kind: "adjust", resource: "hit_dice", delta: v - (res("hit_dice")?.current ?? 0) })} />
            <Value sheet={s} id="hit_dice.max" label="max" docs={docsFm} />
          </div>
          <div class="row" style="margin-top:.5rem">
            <span class="small steel-label">spend</span><input class="steel-input" style="width:3.5rem" type="number" min="1" aria-label="hit dice to spend" value={hd.value} onInput={(e) => (hd.value = (e.target as HTMLInputElement).value)} />
            <button type="button" class="steel-btn" onClick={() => act({ kind: "catch-breath", dice: Number(hd.value) || 1, rolls: parseRolls(hdRolls.value) })}>Catch Breath</button>
            <button type="button" class="steel-btn" onClick={() => act({ kind: "make-camp", dice: Number(hd.value) || 1 })}>Make Camp</button>
          </div>
          <div class="row small" style="margin-top:.3rem"><span class="muted">or enter your rolls</span><input class="steel-input" style="width:7rem" aria-label="hit die rolls" placeholder="e.g. 4, 2" value={hdRolls.value} onInput={(e) => (hdRolls.value = (e.target as HTMLInputElement).value)} /></div>
          {lastRolls.value.length > 0 && <p class="small muted">Rolled {lastRolls.value.map((r) => `${r.text}: [${r.rolls.join(", ")}] → ${r.total}`).join("; ")}</p>}
        </Panel>
        {[...s.resources.values()].filter((r) => !CORE.has(r.id)).map((r) => (
          <Panel key={r.id} title={r.id === "mana" ? "Mana" : resourceName(r.id, loaded)} kind={r.id === "mana" ? "mana" : undefined} right={r.maxDice ? <span class="small muted">max {r.maxDice} (rolled on refresh)</span> : maxVariable(r.id, loaded) ? <Value sheet={s} id={maxVariable(r.id, loaded)!} label="max" docs={docsFm} /> : r.max !== undefined ? <span class="small muted">max {r.max}</span> : undefined}>
            <Stepper label={r.id === "mana" ? "Mana" : resourceName(r.id, loaded)} value={r.current} min={r.floor} max={r.max ?? Infinity} onChange={(v) => act({ kind: "adjust", resource: r.id, delta: v - r.current })} />
          </Panel>
        ))}
      </div>
      <Panel title="Rest and encounter">
        <div class="row">
          <button type="button" class="steel-btn steel-btn--primary" onClick={() => act({ kind: "safe-rest" })}>Safe Rest</button>
          <span class="muted small">Field Rest = spend Hit Dice above.</span>
        </div>
        <div class="row" style="margin-top:.5rem">
          <button type="button" class="steel-btn" onClick={() => act({ kind: "encounter-start" })}>Roll Initiative (d20{n("initiative.bonus") >= 0 ? "+" : ""}{n("initiative.bonus")})</button>
          <input class="steel-input" style="width:4.5rem" type="number" aria-label="initiative roll" placeholder="or total" value={init.value} onInput={(e) => (init.value = (e.target as HTMLInputElement).value)} />
          <button type="button" class="steel-btn" disabled={init.value.trim() === ""} onClick={() => act({ kind: "encounter-start", roll: Number(init.value) })}>Use</button>
          <span class="actions" aria-label={`${res("actions")?.current ?? 0} actions`}>{Array.from({ length: res("actions")?.max ?? 3 }, (_, i) => <span key={i} class={i < (res("actions")?.current ?? 0) ? "seal seal--accent on" : "seal seal--accent"}>{i < (res("actions")?.current ?? 0) ? "◆" : "◇"}</span>)}</span>
          <button type="button" class="steel-btn" onClick={() => act({ kind: "turn-end" })}>Turn end</button>
          <button type="button" class="steel-btn" onClick={() => act({ kind: "encounter-end" })}>Encounter end</button>
        </div>
      </Panel>
      <div class="board">
        <Panel title="Stats">
          <div class="cells">{["str", "dex", "int", "wil"].map((st) => <Value key={st} sheet={s} id={st} label={st.toUpperCase()} docs={docsFm} layout="cell" />)}</div>
          <div class="cells cells--small" style="margin-top:.4rem"><Value sheet={s} id="key" label="KEY" docs={docsFm} layout="cell" /><Value sheet={s} id="dc.hero" label="DC" docs={docsFm} layout="cell" /><Value sheet={s} id="speed" label="Speed" docs={docsFm} layout="cell" /><Value sheet={s} id="initiative.bonus" label="Initiative" docs={docsFm} layout="cell" /></div>
        </Panel>
        <Panel title="Armor" right={<span class="small muted">{s.variables.get("armor.base")?.provenance.contributions.map((c) => `${nameOfOrigin(c.origin, loaded)} ${formatValue(c.value)}`).join(" · ")}{n("armor.bonus") ? ` + ${n("armor.bonus")}` : ""}</span>}>
          <Value sheet={s} id="armor" label="Armor" docs={docsFm} />
          <div class="small muted">Damage reduced when you Defend.</div>
        </Panel>
        <Panel title="Saves">
          <ul class="small plain ledger">{saveRows(s).map((r) => <li key={r.stat}><Value sheet={s} id={`save.${r.stat}`} label={`save ${r.stat.toUpperCase()}`} docs={docsFm} />{r.advantage > 0 ? <span class="steel-badge"> advantage</span> : r.advantage < 0 ? <span class="steel-badge steel-badge--warn"> disadvantage</span> : null}</li>)}</ul>
        </Panel>
        <Panel title="Skills" class="span-2">
          <ul class="small plain skills">{skillRows(s).map((r) => <li key={r.id}><span>{r.name} <span class="muted">({r.stat.toUpperCase()}{r.points ? ` +${r.points}` : ""})</span></span><Value sheet={s} id={`skill.${r.id}`} docs={docsFm} /></li>)}</ul>
        </Panel>
      </div>
      <Panel title="Inventory" right={<span class="small muted">{equipment.length} / <Value sheet={s} id="inventory.slots" docs={docsFm} /> slots</span>}>
        {equipment.length === 0 && <p class="small muted">Nothing carried.</p>}
        <ul class="plain">{equipment.map((e) => <li key={e.id} class="row" style="justify-content:space-between"><span>{nameOf(e.id)}</span><label class="small"><input type="checkbox" checked={e.equipped} onChange={() => act({ kind: "equip", id: e.id, equipped: !e.equipped })} /> equipped</label></li>)}</ul>
      </Panel>
      {spells.length > 0 && (
        <section class="steel-panel" aria-label="Spells"><div class="steel-panel__title"><span class="steel-label">spells</span></div>
          {[...new Set(spells.map((k) => k.school))].map((school) => (
            <div key={school}><h3 class="steel-label" style="margin:.5rem 0 .2rem">{school}</h3>
              <ul class="plain">{spells.filter((k) => k.school === school).map((k) => <Expandable key={String(k.spell.frontmatter.id)} title={<span>{String(k.spell.frontmatter.name)} <span class="muted small">{k.tier === 0 ? "cantrip" : `tier ${k.tier}`} · {String(k.spell.frontmatter.actions)} action{k.spell.frontmatter.actions === 1 ? "" : "s"}</span></span>} body={k.spell.body} resolve={(t) => s.render(t)} />)}</ul>
            </div>
          ))}
        </section>
      )}
      <Panel title="Features">
        <ul class="plain">{features.map((a) => <Expandable key={String(a.doc.frontmatter.id)} title={String(a.doc.frontmatter.name)} body={a.doc.body} resolve={(t) => s.render(t)} />)}</ul>
      </Panel>
      <Panel title="Situation">
        <div class="row">{STATE_FLAGS.filter((f) => loaded.registry.variables.has(f)).map((f) => <label key={f} class="steel-btn pick"><input type="checkbox" checked={(fm.state as Record<string, unknown>)?.[f] === true} onChange={(e) => act({ kind: "toggle", flag: f, value: (e.target as HTMLInputElement).checked })} /> {loaded.registry.variables.get(f)?.name ?? f}</label>)}</div>
      </Panel>
      <CrestRule />
      <section aria-label="Log" role="log" class="steel-panel"><div class="steel-panel__title"><span class="steel-label">log</span></div>
        <ul class="log">{log.value.map((l, i) => <li key={i}>{l}</li>)}</ul>
      </section>
    </div>
  );
}

function Expandable({ title, body, resolve }: { title: preact.ComponentChildren; body: string; resolve?: (t: string) => string }) {
  const open = useSignal(false);
  return <li><button type="button" class="steel-value" onClick={() => (open.value = !open.value)}>{title}</button>{open.value && <div class="small option-text"><Prose text={body} resolve={resolve} /></div>}</li>;
}
/** The crest's monogram: the first letter of a name, skipping a leading article ("The Cheat" → C). */
export const initial = (s: string): string => s.replace(/^the\s+/i, "").trim().charAt(0).toUpperCase() || "◆";
const pct = (r?: { current: number; max?: number }): number => (r && r.max ? Math.max(0, Math.min(100, (r.current / r.max) * 100)) : 0);
function parseRolls(text: string): number[][] | undefined {
  const nums = text.split(/[\s,;]+/).map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0);
  return nums.length ? nums.map((x) => [x]) : undefined;
}
function maxVariable(id: string, loaded: Loaded): string | undefined {
  const def = loaded.registry.resources.get(id);
  return def && typeof def.max === "string" && loaded.registry.variables.has(def.max) ? def.max : undefined;
}
function resourceName(id: string, loaded: Loaded): string {
  const def = loaded.registry.resources.get(id);
  const maxVar = def && typeof def.max === "string" ? loaded.registry.variables.get(def.max) : undefined;
  return maxVar ? maxVar.name.replace(/^your /, "") : id.split(".").slice(1).join(" ").replace(/_/g, " ") || id;
}
function nameOfOrigin(origin: string, loaded: Loaded): string {
  const d = loaded.docs.get(origin);
  if (d) return String(d.frontmatter.name);
  return origin === "<formula>" ? "formula" : origin;
}
