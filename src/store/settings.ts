import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

interface SettingsState {
  shortcut: string;
  store: Store | null;
  initStore: () => Promise<void>;
  setShortcut: (shortcut: string) => Promise<void>;
}

const DEFAULT_SHORTCUT = "CommandOrControl+Shift+U";

async function updateShortcut(shortcut: string) {
  try {
    await invoke("update_shortcut", { newShortcut: shortcut });
  } catch (err) {
    console.error(`Failed to update shortcut ${shortcut}:`, err);
    throw err;
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  shortcut: DEFAULT_SHORTCUT,
  store: null,
  initStore: async () => {
    try {
      const store = await Store.load("settings.json");
      set({ store });

      const savedShortcut = await store.get<string>("shortcut");
      const initialShortcut = savedShortcut || DEFAULT_SHORTCUT;

      set({ shortcut: initialShortcut });

      if (!savedShortcut) {
        await store.set("shortcut", DEFAULT_SHORTCUT);
        await store.save();
      }

      // Register the shortcut
      await updateShortcut(initialShortcut);
    } catch (err) {
      console.error("Failed to initialize settings store:", err);
    }
  },
  setShortcut: async (newShortcut: string) => {
    const { shortcut, store } = get();
    if (shortcut === newShortcut) return;

    try {
      // Register new shortcut (Rust side handles unregistering old one)
      await updateShortcut(newShortcut);

      set({ shortcut: newShortcut });

      if (store) {
        await store.set("shortcut", newShortcut);
        await store.save();
      }
    } catch (err) {
      console.error("Failed to set shortcut:", err);
      throw err;
    }
  },
}));
