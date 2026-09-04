import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { HistoryEntry } from "@/lib/types";

let initPromise: Promise<void> | null = null;

interface HistorySnapshot {
  revision: number;
  entries: HistoryEntry[];
}

interface HistoryState {
  entries: HistoryEntry[];
  initStore: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  addEntry: (entry: HistoryEntry) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => {
  let currentRevision = -1;
  const applySnapshot = (snapshot: HistorySnapshot) => {
    if (snapshot.revision < currentRevision) return;
    currentRevision = snapshot.revision;
    set({ entries: snapshot.entries });
  };

  return {
    entries: [],

    initStore: async () => {
      if (!initPromise) {
        initPromise = (async () => {
          await listen<HistorySnapshot>("history-updated", (event) => {
            applySnapshot(event.payload);
          });
          await get().refreshHistory();
        })();
      }

      try {
        await initPromise;
      } catch (err) {
        initPromise = null;
        console.error("Failed to initialize history store:", err);
      }
    },

    refreshHistory: async () => {
      try {
        const snapshot = await invoke<HistorySnapshot>("get_history_entries");

        applySnapshot(snapshot);
      } catch (err) {
        console.error("Failed to refresh history:", err);
      }
    },

    addEntry: async (entry: HistoryEntry) => {
      const snapshot = await invoke<HistorySnapshot>("append_history_entry", {
        entry,
      });
      applySnapshot(snapshot);
    },

    clearHistory: async () => {
      const snapshot = await invoke<HistorySnapshot>("clear_history_entries");
      applySnapshot(snapshot);
    },
  };
});
