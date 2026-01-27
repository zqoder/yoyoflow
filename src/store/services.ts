import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";
import { emit, listen } from "@tauri-apps/api/event";

export interface ServiceConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey: string;
  model: string;
}

export const AVAILABLE_MODELS: Record<string, string[]> = {
  siliconflow: ["Qwen/Qwen3-8B"],
};

export const DEFAULT_SERVICES: ServiceConfig[] = [
  {
    id: "siliconflow",
    name: "硅基流动",
    enabled: false,
    apiKey: "",
    model: "Qwen/Qwen3-8B",
  },
];

interface ServiceState {
  services: ServiceConfig[];
  store: Store | null;
  initStore: () => Promise<void>;
  refreshServices: () => Promise<void>;
  updateService: (
    id: string,
    field: keyof ServiceConfig,
    value: string | boolean,
  ) => Promise<void>;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: DEFAULT_SERVICES,
  store: null,
  initStore: async () => {
    try {
      // Prevent multiple initializations if store is already loaded? 
      // Actually we might want to allow re-init or check if store exists.
      // But for simplicity, let's just load.
      let store = get().store;
      if (!store) {
        store = await Store.load("services.json");
        set({ store });
        
        // Listen for updates from other windows
        await listen("services-updated", async () => {
            await get().refreshServices();
        });
      }

      await get().refreshServices();
    } catch (err) {
      console.error("Failed to initialize store:", err);
    }
  },
  refreshServices: async () => {
    const { store } = get();
    if (!store) return;
    
    try {
        // Force reload from disk is not directly available on store instance easily without reload()
        // But store.get() should return latest if we assume the file on disk changed?
        // Actually tauri-plugin-store maintains an in-memory state. 
        // If another window updated the file, this window's store instance might be stale 
        // unless we reload the store or re-read the file.
        // For Tauri v2 store, load() returns a new handle or existing one.
        // Let's try reloading the store from file path to be safe, or just trust get() if it syncs.
        // A safer bet is to re-load the store instance to ensure we get fresh data from disk.
        // However, Store.load returns the *same* instance if already loaded in this window.
        // We might need to call load again to ensure it reads from disk if changed externally?
        // Actually, let's assume get() works or we need a way to reload.
        // Looking at tauri-plugin-store docs (mental check), it auto-saves but auto-load?
        // Let's re-invoke load to be sure.
        
        // Re-load to ensure sync with disk
        const freshStore = await Store.load("services.json"); 
        // Note: if Store.load doesn't refresh from disk if already loaded, this might be an issue.
        // But typically for cross-window, we rely on the file.
        
        const savedServices = await freshStore.get<ServiceConfig[]>("services");
        if (savedServices) {
            const merged = DEFAULT_SERVICES.map((def) => {
            const saved = savedServices.find(
                (s: ServiceConfig) => s.id === def.id,
            );
            return saved ? { ...def, ...saved } : def;
            });
            set({ services: merged });
        } else {
            // Initial save if empty
            await freshStore.set("services", DEFAULT_SERVICES);
            await freshStore.save();
        }
    } catch (err) {
        console.error("Failed to refresh services:", err);
    }
  },
  updateService: async (id, field, value) => {
    const { services, store } = get();
    const newServices = services.map((s) =>
      s.id === id ? { ...s, [field]: value } : s,
    );
    set({ services: newServices });

    if (store) {
      await store.set("services", newServices);
      await store.save();
      // Notify other windows
      await emit("services-updated");
    }
  },
}));
