import { signal, useSignal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import { loadContent, type HomebrewStore, type Loaded } from "../../src/content-store.js";
import { AppContext, type AppServices } from "./app-context.js";
import { PRODUCT_NAME } from "./notice.js";
import { navigate, route } from "./router.js";
import { AboutView } from "./views/about.js";
import { CreateView } from "./views/create.js";
import { PlayView } from "./views/play.js";

const TABS: { view: string; label: string; glyph: string; hash: string }[] = [
  { view: "play", label: "Play", glyph: "◆", hash: "#/play" },
  { view: "create", label: "Create", glyph: "✦", hash: "#/create" },
  { view: "level-up", label: "Level Up", glyph: "▲", hash: "#/level-up" },
  { view: "reader", label: "Reader", glyph: "❖", hash: "#/reader" },
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
  useEffect(() => { void services.reload(); }, [services]);
  const r = route.value;
  const theme = useSignal(document.documentElement.getAttribute("data-theme") ?? "slate");
  const toggleTheme = () => { theme.value = theme.value === "slate" ? "light" : "slate"; document.documentElement.setAttribute("data-theme", theme.value); try { storage.setItem("nimble-sheet:theme", theme.value); } catch { /* ignore */ } };
  useEffect(() => { try { const t = storage.getItem("nimble-sheet:theme"); if (t) { theme.value = t; document.documentElement.setAttribute("data-theme", t); } } catch { /* ignore */ } }, []);
  return (
    <AppContext.Provider value={services}>
      <div class="app">
        <header class="app__header">
          <span class="steel-h1">{PRODUCT_NAME}</span>
          <button type="button" class="steel-btn" onClick={toggleTheme} aria-label="toggle theme">{theme.value === "slate" ? "☾" : "☀"}</button>
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
          <View />
        </main>
      </div>
    </AppContext.Provider>
  );
}

const placeholder = signal(true);
function View() {
  const r = route.value;
  switch (r.view) {
    case "about": return <AboutView />;
    case "create": return <CreateView />;
    case "play": return <PlayView />;
    default: return <p class="muted">{placeholder.value ? `${r.view}: coming in a later task` : ""}</p>;
  }
}
