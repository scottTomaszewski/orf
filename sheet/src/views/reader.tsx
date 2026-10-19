import { useComputed, useSignal } from "@preact/signals";
import { useContext, useMemo } from "preact/hooks";
import type { Document } from "../../../src/document.js";
import { evaluateCharacter } from "../../../src/engine.js";
import { AppContext } from "../app-context.js";
import { localCharacterStore } from "../character-store.js";
import { CURRENT_KEY } from "./play.js";
import { Panel } from "../components/panel.js";
import { Prose } from "../prose.js";
import { navigate, route } from "../router.js";

const HIDDEN = new Set(["id", "type", "system", "name", "effects", "variables", "resources", "events", "predicates", "choices", "grants", "grants_by_level", "members", "content_types", "stat_arrays"]);

export function ReaderView() {
  const { content, storage } = useContext(AppContext);
  const loaded = content.value;
  const r = route.value;
  const q = useSignal("");
  const selected = r.view === "reader" ? r.id : undefined;
  const docs = useMemo(() => (loaded ? [...loaded.docs.values()].filter((d) => d.frontmatter.type !== "character" && d.frontmatter.type !== "note") : []), [loaded]);
  const filtered = useComputed(() => { const s = q.value.trim().toLowerCase(); return s ? docs.filter((d) => String(d.frontmatter.name).toLowerCase().includes(s) || String(d.frontmatter.id).includes(s)) : docs; });
  const types = useComputed(() => [...new Set(filtered.value.map((d) => String(d.frontmatter.type)))].sort());
  // the character open in Play (not the most recently saved one)
  let currentId: string | null = null;
  try { currentId = storage.getItem(CURRENT_KEY); } catch { /* ignore */ }
  const current = useMemo(() => (loaded && currentId ? localCharacterStore(storage, loaded.docs).get(currentId) : undefined), [loaded, currentId]);
  const sheet = useMemo(() => (current && loaded ? evaluateCharacter(current, loaded.registry, loaded.docs) : undefined), [current, loaded]);
  if (!loaded) return <p class="muted">Loading content…</p>;
  const doc = selected ? loaded.docs.get(selected) : undefined;
  const attached = doc && sheet ? sheet.attachments.some((a) => a.doc.frontmatter.id === doc.frontmatter.id) : false;
  return (
    <div class="stack">
      <h1 class="steel-h1">Reader</h1>
      <label class="row"><span class="steel-label">search</span><input class="steel-input" aria-label="search" value={q.value} onInput={(e) => (q.value = (e.target as HTMLInputElement).value)} /></label>
      <div class="reader">
        <div class="reader__list">
          {types.value.map((t) => (
            <div key={t}><h3 class="steel-label">{t}</h3>
              <ul class="plain">{filtered.value.filter((d) => d.frontmatter.type === t).sort((a, b) => String(a.frontmatter.name).localeCompare(String(b.frontmatter.name))).map((d) => <li key={String(d.frontmatter.id)}><button type="button" class={`steel-value${selected === d.frontmatter.id ? " on" : ""}`} onClick={() => navigate(`#/reader/${encodeURIComponent(String(d.frontmatter.id))}`)}>{String(d.frontmatter.name)}</button></li>)}</ul>
            </div>
          ))}
        </div>
        {doc && <DocView doc={doc} resolve={sheet && attached ? (t) => sheet.render(t) : undefined} resolvedFor={sheet && attached && current ? String(current.frontmatter.name) : undefined} />}
      </div>
    </div>
  );
}

function DocView({ doc, resolve, resolvedFor }: { doc: Document; resolve?: (t: string) => string; resolvedFor?: string }) {
  const props = Object.entries(doc.frontmatter).filter(([k, v]) => !HIDDEN.has(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || (Array.isArray(v) && v.every((x) => typeof x !== "object"))));
  const sources = /## Sources\n([\s\S]*)$/.exec(doc.body)?.[1]?.trim();
  return (
    <article class="reader__doc">
      <Panel title={String(doc.frontmatter.type)} right={<span class="steel-mono small muted">{String(doc.frontmatter.id)}</span>}>
        <h2 class="steel-h2">{String(doc.frontmatter.name)}</h2>
        {props.length > 0 && <table class="props small"><tbody>{props.map(([k, v]) => <tr key={k}><th>{k.replace(/_/g, " ")}</th><td>{resolve && typeof v === "string" ? resolve(v) : String(v)}</td></tr>)}</tbody></table>}
        <Prose text={doc.body} resolve={resolve} />
        {resolvedFor && <p class="small muted">Values resolved for {resolvedFor}.</p>}
        {sources && <p class="small muted">Sources: {sources}</p>}
      </Panel>
    </article>
  );
}
