import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

interface SettingsState {
  shortcut: string;
  inputTranslateShortcut: string;
  store: Store | null;
  initStore: () => Promise<void>;
  setShortcut: (shortcut: string) => Promise<void>;
  setInputTranslateShortcut: (shortcut: string) => Promise<void>;
}

const DEFAULT_SHORTCUT = "CommandOrControl+Shift+U";
const DEFAULT_INPUT_TRANSLATE_SHORTCUT = "Control+A";

async function updateShortcuts(mainShortcut: string, inputTranslateShortcut: string) {
  try {
    await invoke("update_shortcuts", { 
        mainShortcut, 
        inputTranslateShortcut 
    });
  } catch (err) {
    console.error(`Failed to update shortcuts:`, err);
    throw err;
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  shortcut: DEFAULT_SHORTCUT,
  inputTranslateShortcut: DEFAULT_INPUT_TRANSLATE_SHORTCUT,
  store: null,
  initStore: async () => {
    try {
      const store = await Store.load("settings.json");
      set({ store });

      const savedShortcut = await store.get<string>("shortcut");
      const initialShortcut = savedShortcut || DEFAULT_SHORTCUT;
      
      const savedInputTranslateShortcut = await store.get<string>("inputTranslateShortcut");
      const initialInputTranslateShortcut = savedInputTranslateShortcut || DEFAULT_INPUT_TRANSLATE_SHORTCUT;

      set({ 
        shortcut: initialShortcut,
        inputTranslateShortcut: initialInputTranslateShortcut
      });

      if (!savedShortcut) {
        await store.set("shortcut", DEFAULT_SHORTCUT);
      }
      
      if (!savedInputTranslateShortcut) {
        await store.set("inputTranslateShortcut", DEFAULT_INPUT_TRANSLATE_SHORTCUT);
      }
      
      if (!savedShortcut || !savedInputTranslateShortcut) {
          await store.save();
      }

      // Register shortcuts
      await updateShortcuts(initialShortcut, initialInputTranslateShortcut);
    } catch (err) {
      console.error("Failed to initialize settings store:", err);
    }
  },
  setShortcut: async (newShortcut: string) => {
    const { shortcut, inputTranslateShortcut, store } = get();
    if (shortcut === newShortcut) return;

    try {
      // Register new shortcuts
      await updateShortcuts(newShortcut, inputTranslateShortcut);

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
  setInputTranslateShortcut: async (newShortcut: string) => {
    const { shortcut, inputTranslateShortcut, store } = get();
    if (inputTranslateShortcut === newShortcut) return;
    
    try {
        // Register new shortcuts
        await updateShortcuts(shortcut, newShortcut);
        
        set({ inputTranslateShortcut: newShortcut });
        
        if (store) {
            await store.set("inputTranslateShortcut", newShortcut);
            await store.save();
        }
    } catch (err) {
      console.error("Failed to set input translate shortcut:", err);
      throw err;
    }
  },
}));
