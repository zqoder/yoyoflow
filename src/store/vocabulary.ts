import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";
import { emit, listen } from "@tauri-apps/api/event";
import type { VocabularyEntry } from "@/lib/types";

function makeKey(text: string, sourceLang: string, targetLang: string): string {
  return `${text}:${sourceLang}:${targetLang}`;
}

interface VocabularyState {
  entries: VocabularyEntry[];
  version: number;
  store: Store | null;
  initStore: () => Promise<void>;
  refreshVocabulary: () => Promise<void>;
  addEntry: (entry: VocabularyEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  removeByKey: (text: string, sourceLang: string, targetLang: string) => Promise<void>;
  isFavorited: (text: string, sourceLang: string, targetLang: string) => boolean;
}

const favoritedMap = new Map<string, boolean>();

function rebuildFavoritedMap(entries: VocabularyEntry[]) {
  favoritedMap.clear();
  for (const entry of entries) {
    favoritedMap.set(makeKey(entry.text, entry.sourceLang, entry.targetLang), true);
  }
}

export const useVocabularyStore = create<VocabularyState>((set, get) => ({
  entries: [],
  version: 0,
  store: null,

  initStore: async () => {
    try {
      let store = get().store;
      if (!store) {
        store = await Store.load("vocabulary.json");
        set({ store });

        await listen("vocabulary-updated", async () => {
          await get().refreshVocabulary();
        });
      }

      await get().refreshVocabulary();
    } catch (err) {
      console.error("Failed to initialize vocabulary store:", err);
    }
  },

  refreshVocabulary: async () => {
    const { store } = get();
    if (!store) return;

    try {
      const freshStore = await Store.load("vocabulary.json");
      const saved = await freshStore.get<VocabularyEntry[]>("entries");
      const entries = saved || [];
      rebuildFavoritedMap(entries);

      if (JSON.stringify(entries) !== JSON.stringify(get().entries)) {
        set({ entries, version: get().version + 1 });
      }
    } catch (err) {
      console.error("Failed to refresh vocabulary:", err);
    }
  },

  addEntry: async (entry: VocabularyEntry) => {
    const { entries: prev, store } = get();
    const key = makeKey(entry.text, entry.sourceLang, entry.targetLang);
    if (favoritedMap.has(key)) return;

    const entries = [...prev, entry];
    favoritedMap.set(key, true);
    set({ entries, version: get().version + 1 });

    if (store) {
      await store.set("entries", entries);
      await store.save();
      await emit("vocabulary-updated");
    }
  },

  removeEntry: async (id: string) => {
    const { entries: prev, store } = get();
    const target = prev.find((e) => e.id === id);
    const entries = prev.filter((e) => e.id !== id);

    if (target) {
      favoritedMap.delete(makeKey(target.text, target.sourceLang, target.targetLang));
    }

    set({ entries, version: get().version + 1 });

    if (store) {
      await store.set("entries", entries);
      await store.save();
      await emit("vocabulary-updated");
    }
  },

  removeByKey: async (text: string, sourceLang: string, targetLang: string) => {
    const { entries: prev, store } = get();
    const key = makeKey(text, sourceLang, targetLang);
    const entries = prev.filter((e) => makeKey(e.text, e.sourceLang, e.targetLang) !== key);
    favoritedMap.delete(key);

    set({ entries, version: get().version + 1 });

    if (store) {
      await store.set("entries", entries);
      await store.save();
      await emit("vocabulary-updated");
    }
  },

  isFavorited: (text: string, sourceLang: string, targetLang: string) => {
    return favoritedMap.has(makeKey(text, sourceLang, targetLang));
  },
}));
