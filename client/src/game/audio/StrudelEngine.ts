// src/game/audio/StrudelEngine.ts
import { initStrudel } from "@strudel/web";

let strudelReady = false;
let initPromise: Promise<void> | null = null;

// Strudel attaches its functions (note, hush, rev, etc.) to the global scope
// after initStrudel() runs. We'll wrap that in a helper.
export async function ensureStrudelInitialized() {
  if (strudelReady) return;

  if (!initPromise) {
    initPromise = (async () => {
      await initStrudel();
      strudelReady = true;
    })();
  }

  return initPromise;
}

// These are declared so TS doesn't freak out about the globals.
// At runtime, Strudel provides them after initStrudel().
declare global {
  // eslint-disable-next-line no-var
  var note: (pattern: string) => any;
  // eslint-disable-next-line no-var
  var hush: () => void;
  // eslint-disable-next-line no-var
  var rev: any;
}
