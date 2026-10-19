import type { Locator, Page } from "@playwright/test";

/**
 * How a flow interacts with the page. Tests use `instant` (fill, click, done). The demo recording
 * uses `human(page)`: a visible cursor glides to each control, text is typed, captions explain,
 * and pauses let a viewer read. Flows are written once against this interface.
 */
export interface Pace {
  click(target: Locator): Promise<void>;
  fill(target: Locator, text: string): Promise<void>;
  select(target: Locator, value: string): Promise<void>;
  /** A sentence shown to the viewer; a no-op in tests. */
  caption(text: string): Promise<void>;
  /** Beat for the viewer, scaled by DEMO_SPEED (1 = real time); a no-op in tests. */
  pause(ms: number): Promise<void>;
}

export const instant: Pace = {
  click: (t) => t.click(),
  fill: (t, text) => t.fill(text),
  select: async (t, value) => { await t.selectOption(value); },
  caption: async () => {},
  pause: async () => {},
};

const OVERLAY = `
  (() => {
    const css = document.createElement("style");
    css.textContent = \`
      #pw-cursor { position: fixed; z-index: 2147483647; width: 22px; height: 22px; margin: -4px 0 0 -4px; pointer-events: none;
        border-radius: 50%; background: rgba(255, 196, 92, .35); border: 2px solid rgba(255, 196, 92, .95);
        box-shadow: 0 0 0 2px rgba(0,0,0,.35), 0 2px 10px rgba(0,0,0,.5); transition: transform .12s ease; left: -100px; top: -100px; }
      #pw-cursor.down { transform: scale(.6); background: rgba(255, 196, 92, .8); }
      #pw-caption { position: fixed; z-index: 2147483646; left: 50%; bottom: 28px; transform: translateX(-50%); max-width: min(80vw, 56rem);
        padding: .6rem 1.1rem; border-radius: 6px; background: rgba(14, 16, 20, .92); color: #f2ecdf; border: 1px solid rgba(255,196,92,.55);
        font: 500 1.15rem/1.35 "Source Serif 4", Georgia, serif; letter-spacing: .01em; text-align: center; opacity: 0; transition: opacity .25s ease; pointer-events: none; }
      #pw-caption.on { opacity: 1; }
    \`;
    const mount = () => {
      document.head.appendChild(css);
      const c = document.createElement("div"); c.id = "pw-cursor"; document.body.appendChild(c);
      const cap = document.createElement("div"); cap.id = "pw-caption"; document.body.appendChild(cap);
      window.addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
      window.addEventListener("mousedown", () => c.classList.add("down"), true);
      window.addEventListener("mouseup", () => c.classList.remove("down"), true);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
  })();
`;

/** Install the cursor and caption overlay before any page script runs. Call once per page, before the first goto. */
export async function installOverlay(page: Page): Promise<void> {
  await page.addInitScript(OVERLAY);
}

export function human(page: Page, speed = Number(process.env.DEMO_SPEED ?? "1")): Pace {
  const wait = (ms: number) => page.waitForTimeout(ms * speed);
  const glide = async (target: Locator) => {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error("demo: target has no box");
    await page.mouse.move(box.x + Math.min(box.width / 2, 120), box.y + box.height / 2, { steps: 18 });
    await wait(180);
  };
  return {
    click: async (t) => { await glide(t); await page.mouse.down(); await wait(90); await page.mouse.up(); await wait(350); },
    fill: async (t, text) => { await glide(t); await t.click(); await t.fill(""); await t.pressSequentially(text, { delay: 55 * speed }); await wait(400); },
    select: async (t, value) => { await glide(t); await t.selectOption(value); await wait(450); },
    caption: async (text) => {
      await page.evaluate((s) => { const el = document.getElementById("pw-caption"); if (!el) return; el.textContent = s; el.classList.toggle("on", s !== ""); }, text);
      await wait(text ? 900 : 200);
    },
    pause: wait,
  };
}
