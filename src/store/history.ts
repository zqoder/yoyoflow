import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";
import { emit, listen } from "@tauri-apps/api/event";
import type { HistoryEntry } from "@/lib/types";

const MAX_HISTORY = 500;

interface HistoryState {
  entries: HistoryEntry[];
  store: Store | null;
  initStore: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  addEntry: (entry: HistoryEntry) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  store: null,

  initStore: async () => {
    try {
      let store = get().store;
      if (!store) {
        store = await Store.load("history.json");
        set({ store });

        await listen("history-updated", async () => {
          await get().refreshHistory();
        });
      }

      await get().refreshHistory();
    } catch (err) {
      console.error("Failed to initialize history store:", err);
    }
  },

  refreshHistory: async () => {
    const { store } = get();
    if (!store) return;

    try {
      const freshStore = await Store.load("history.json");
      const saved = await freshStore.get<HistoryEntry[]>("entries");
      const entries = saved || [];

      if (JSON.stringify(entries) !== JSON.stringify(get().entries)) {
        set({ entries });
      }
    } catch (err) {
      console.error("Failed to refresh history:", err);
    }
  },

  addEntry: async (entry: HistoryEntry) => {
    const { entries: prev, store } = get();
    const entries = [...prev, entry].slice(-MAX_HISTORY);
    set({ entries });

    if (store) {
      await store.set("entries", entries);
      await store.save();
      await emit("history-updated");
    }
  },

  clearHistory: async () => {
    const { store } = get();
    set({ entries: [] });

    if (store) {
      await store.set("entries", []);
      await store.save();
      await emit("history-updated");
    }
  },
}));
