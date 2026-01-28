import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

interface SettingsState {
  shortcut: string;
  inputTranslateShortcut: string;
  selectionTranslateShortcut: string;
  screenshotTranslateShortcut: string;
  store: Store | null;
  initStore: () => Promise<void>;
  setShortcut: (shortcut: string) => Promise<void>;
  setInputTranslateShortcut: (shortcut: string) => Promise<void>;
  setSelectionTranslateShortcut: (shortcut: string) => Promise<void>;
  setScreenshotTranslateShortcut: (shortcut: string) => Promise<void>;
}

const DEFAULT_SHORTCUT = "CommandOrControl+Shift+U";
const DEFAULT_INPUT_TRANSLATE_SHORTCUT = "Control+A";
const DEFAULT_SELECTION_TRANSLATE_SHORTCUT = "Control+D";
const DEFAULT_SCREENSHOT_TRANSLATE_SHORTCUT = "Control+S";

async function updateShortcuts(
  mainShortcut: string,
  inputTranslateShortcut: string,
  selectionTranslateShortcut: string,
  screenshotTranslateShortcut: string,
) {
  try {
    await invoke("update_shortcuts", {
      mainShortcut,
      inputTranslateShortcut,
      selectionTranslateShortcut,
      screenshotTranslateShortcut,
    });
  } catch (err) {
    console.error(`Failed to update shortcuts:`, err);
    throw err;
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  shortcut: DEFAULT_SHORTCUT,
  inputTranslateShortcut: DEFAULT_INPUT_TRANSLATE_SHORTCUT,
  selectionTranslateShortcut: DEFAULT_SELECTION_TRANSLATE_SHORTCUT,
  screenshotTranslateShortcut: DEFAULT_SCREENSHOT_TRANSLATE_SHORTCUT,
  store: null,
  initStore: async () => {
    try {
      const store = await Store.load("settings.json");
      set({ store });

      const savedShortcut = await store.get<string>("shortcut");
      const initialShortcut = savedShortcut || DEFAULT_SHORTCUT;

      const savedInputTranslateShortcut = await store.get<string>(
        "inputTranslateShortcut",
      );
      const initialInputTranslateShortcut =
        savedInputTranslateShortcut || DEFAULT_INPUT_TRANSLATE_SHORTCUT;

      const savedSelectionTranslateShortcut = await store.get<string>(
        "selectionTranslateShortcut",
      );
      const initialSelectionTranslateShortcut =
        savedSelectionTranslateShortcut || DEFAULT_SELECTION_TRANSLATE_SHORTCUT;

      const savedScreenshotTranslateShortcut = await store.get<string>(
        "screenshotTranslateShortcut",
      );
      const initialScreenshotTranslateShortcut =
        savedScreenshotTranslateShortcut || DEFAULT_SCREENSHOT_TRANSLATE_SHORTCUT;

      set({
        shortcut: initialShortcut,
        inputTranslateShortcut: initialInputTranslateShortcut,
        selectionTranslateShortcut: initialSelectionTranslateShortcut,
        screenshotTranslateShortcut: initialScreenshotTranslateShortcut,
      });

      if (!savedShortcut) {
        await store.set("shortcut", DEFAULT_SHORTCUT);
      }

      if (!savedInputTranslateShortcut) {
        await store.set(
          "inputTranslateShortcut",
          DEFAULT_INPUT_TRANSLATE_SHORTCUT,
        );
      }

      if (!savedSelectionTranslateShortcut) {
        await store.set(
          "selectionTranslateShortcut",
          DEFAULT_SELECTION_TRANSLATE_SHORTCUT,
        );
      }

      if (!savedScreenshotTranslateShortcut) {
        await store.set(
          "screenshotTranslateShortcut",
          DEFAULT_SCREENSHOT_TRANSLATE_SHORTCUT,
        );
      }

      if (
        !savedShortcut ||
        !savedInputTranslateShortcut ||
        !savedSelectionTranslateShortcut ||
        !savedScreenshotTranslateShortcut
      ) {
        await store.save();
      }

      // Register shortcuts
      await updateShortcuts(
        initialShortcut,
        initialInputTranslateShortcut,
        initialSelectionTranslateShortcut,
        initialScreenshotTranslateShortcut,
      );
    } catch (err) {
      console.error("Failed to initialize settings store:", err);
    }
  },
  setShortcut: async (newShortcut: string) => {
    const {
      shortcut,
      inputTranslateShortcut,
      selectionTranslateShortcut,
      screenshotTranslateShortcut,
      store,
    } = get();
    if (shortcut === newShortcut) return;

    try {
      // Register new shortcuts
      await updateShortcuts(
        newShortcut,
        inputTranslateShortcut,
        selectionTranslateShortcut,
        screenshotTranslateShortcut,
      );

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
    const {
      shortcut,
      inputTranslateShortcut,
      selectionTranslateShortcut,
      screenshotTranslateShortcut,
      store,
    } = get();
    if (inputTranslateShortcut === newShortcut) return;

    try {
      // Register new shortcuts
      await updateShortcuts(
        shortcut,
        newShortcut,
        selectionTranslateShortcut,
        screenshotTranslateShortcut,
      );

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
  setSelectionTranslateShortcut: async (newShortcut: string) => {
    const {
      shortcut,
      inputTranslateShortcut,
      selectionTranslateShortcut,
      screenshotTranslateShortcut,
      store,
    } = get();
    if (selectionTranslateShortcut === newShortcut) return;

    try {
      // Register new shortcuts
      await updateShortcuts(
        shortcut,
        inputTranslateShortcut,
        newShortcut,
        screenshotTranslateShortcut,
      );

      set({ selectionTranslateShortcut: newShortcut });

      if (store) {
        await store.set("selectionTranslateShortcut", newShortcut);
        await store.save();
      }
    } catch (err) {
      console.error("Failed to set selection translate shortcut:", err);
      throw err;
    }
  },
  setScreenshotTranslateShortcut: async (newShortcut: string) => {
    const {
      shortcut,
      inputTranslateShortcut,
      selectionTranslateShortcut,
      screenshotTranslateShortcut,
      store,
    } = get();
    if (screenshotTranslateShortcut === newShortcut) return;

    try {
      // Register new shortcuts
      await updateShortcuts(
        shortcut,
        inputTranslateShortcut,
        selectionTranslateShortcut,
        newShortcut,
      );

      set({ screenshotTranslateShortcut: newShortcut });

      if (store) {
        await store.set("screenshotTranslateShortcut", newShortcut);
        await store.save();
      }
    } catch (err) {
      console.error("Failed to set screenshot translate shortcut:", err);
      throw err;
    }
  },
}));
