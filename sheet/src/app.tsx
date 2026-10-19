import { useSignal } from "@preact/signals";
import { Component, type ComponentChildren } from "preact";
import { useContext, useEffect, useMemo } from "preact/hooks";
import { fromShareLink, localCharacterStore } from "./character-store.js";
import { loadContent, type HomebrewStore, type Loaded } from "../../src/content-store.js";
import { AppContext, type AppServices } from "./app-context.js";
import { SHORT_NAME } from "./notice.js";
import { navigate, parseHash, route, type Route } from "./router.js";
import { AboutView } from "./views/about.js";
import { CreateView } from "./views/create.js";
import { PlayView } from "./views/play.js";
import { LevelUpView } from "./views/level-up.js";
import { ReaderView } from "./views/reader.js";
import { ContentView } from "./views/content.js";
import { WriteView } from "./views/write.js";

const TABS: { view: string; label: string; glyph: string; hash: string }[] = [
  { view: "play", label: "Play", glyph: "◆", hash: "#/play" },
  { view: "create", label: "Create", glyph: "✦", hash: "#/create" },
  { view: "level-up", label: "Level Up", glyph: "▲", hash: "#/level-up" },
  { view: "reader", label: "Reader", glyph: "❖", hash: "#/reader" },
  { view: "write", label: "Write", glyph: "✎", hash: "#/write" },
  { view: "content", label: "Content", glyph: "☰", hash: "#/content" },
  { view: "about", label: "About", glyph: "ⓘ", hash: "#/about" },
];

/** Default loader: fetch the content bundle built by scripts/bundle-content.ts. */
export async function fetchBundleLoader(homebrew: HomebrewStore): Promise<Loaded> {
  const res = await fetch("content/nimble.json");
  if (!res.ok) throw new Error(`content bundle missing (${res.status}); run npm run bundle-content`);
  return loadContent(await res.json(), await homebrew.list());
}

export function App({ loader, homebrew, storage, rng = Math.random }: { loader: (homebrew: HomebrewStore) => Promise<Loaded>; homebrew: HomebrewStore; storage: Storage; rng?: () => number }) {
  const content = useSignal<Loaded | undefined>(undefined);
  const contentError = useSignal<string | undefined>(undefined);
  const services = useMemo<AppServices>(() => ({
    content, contentError, homebrew, storage, rng,
    reload: async () => { try { content.value = await loader(homebrew); contentError.value = undefined; } catch (e) { contentError.value = e instanceof Error ? e.message : String(e); } },
  }), [loader, homebrew, storage]);
  useEffect(() => { route.value = parseHash(location.hash); void services.reload(); }, [services]);
  const r = route.value;
  const theme = useSignal(document.documentElement.getAttribute("data-theme") ?? "slate");
  const toggleTheme = () => { theme.value = theme.value === "slate" ? "light" : "slate"; document.documentElement.setAttribute("data-theme", theme.value); try { storage.setItem("nimble-sheet:theme", theme.value); } catch { /* ignore */ } };
  useEffect(() => { try { const t = storage.getItem("nimble-sheet:theme"); if (t) { theme.value = t; document.documentElement.setAttribute("data-theme", t); } } catch { /* ignore */ } }, []);
  return (
    <AppContext.Provider value={services}>
      <div class="app">
        <header class="app__header">
          <span class="app__brand"><span class="crest" aria-hidden="true">◆</span><span class="steel-h1">{SHORT_NAME}</span><span class="sub">for Nimble</span></span>
          <button type="button" class="steel-btn app__theme" onClick={toggleTheme} aria-label="toggle theme">{theme.value === "slate" ? "☾" : "☀"}</button>
        </header>
        <nav class="app__tabs" role="tablist" aria-label="views">
          {TABS.map((t) => (
            <button key={t.view} type="button" role="tab" class="app__tab" aria-selected={r.view === t.view} onClick={() => navigate(t.hash)}>
              <span class="glyph" aria-hidden="true">{t.glyph}</span><span>{t.label}</span>
            </button>
          ))}
        </nav>
        <main class="app__main">
          {contentError.value && <div class="steel-panel problems"><span class="steel-label">content</span><p>{contentError.value}</p></div>}
          <ErrorBoundary key={routeKey(r)}><View /></ErrorBoundary>
        </main>
      </div>
    </AppContext.Provider>
  );
}

const routeKey = (r: Route): string => `${r.view}:${r.view === "play" || r.view === "level-up" || r.view === "reader" ? r.id ?? "" : r.view === "write" ? r.path ?? "" : r.view === "share" ? r.payload.slice(0, 16) : ""}`;

/** One bad value must never blank the app: show what broke and where to go. */
class ErrorBoundary extends Component<{ children: ComponentChildren }, { error?: Error }> {
  state = { error: undefined as Error | undefined };
  componentDidCatch(error: Error) { this.setState({ error }); }
  render() {
    if (this.state.error) return (
      <section class="steel-panel problems" role="alert" aria-label="Problems"><span class="steel-label">something went wrong</span>
        <p>{this.state.error.message}</p>
        <p class="small muted">This view could not render. The character or content document it was showing has a value the sheet did not expect. <a href="#/play">Back to characters</a> · <a href="#/content">Content problems</a></p>
      </section>);
    return this.props.children;
  }
}

function ShareImport({ payload }: { payload: string }) {
  const { storage, content } = useContext(AppContext);
  const error = useSignal<string | undefined>(undefined);
  useEffect(() => {
    try {
      const doc = fromShareLink(`#/share/${payload}`, "nimble");
      localCharacterStore(storage, content.value?.docs).save(doc);
      navigate(`#/play/${encodeURIComponent(String(doc.frontmatter.id))}`);
    } catch (e) { error.value = e instanceof Error ? e.message : String(e); }
  }, [payload]);
  if (error.value) return <section class="steel-panel problems" role="alert"><span class="steel-label">share link</span><p>{error.value}</p><p class="small muted"><a href="#/play">Back to characters</a></p></section>;
  return <p class="muted">Importing shared character…</p>;
}

function View() {
  const r = route.value;
  switch (r.view) {
    case "share": return <ShareImport payload={r.payload} />;
    case "about": return <AboutView />;
    case "create": return <CreateView />;
    case "play": return <PlayView />;
    case "level-up": return <LevelUpView />;
    case "reader": return <ReaderView />;
    case "write": return <WriteView />;
    case "content": return <ContentView />;
    default: return <p class="muted">Not found. <a href="#/play">Back to characters</a></p>;
  }
}
