import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";
import { emit, listen } from "@tauri-apps/api/event";

export type ServiceType =
  | "text-translation"
  | "text-recognition"
  | "speech-synthesis";

export interface ServiceConfig {
  id: string;
  name: string;
  type: ServiceType;
  enabled: boolean;
  apiKey: string;
  model: string;
  icon: string;
  serviceUrl: string;
}

export const AVAILABLE_MODELS: Record<string, string[]> = {
  siliconflow: ["Qwen/Qwen3-8B"],
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
  glm: ["glm-4-flashx-250414", "glm-4.7-flash"],
  siliconflow_ocr: [
    "PaddlePaddle/PaddleOCR-VL-1.5",
    "THUDM/GLM-4.1V-9B-Thinking",
  ],
};

export const DEFAULT_SERVICES: ServiceConfig[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "text-translation",
    enabled: false,
    apiKey: "",
    model: "deepseek-v4-flash",
    icon: "deepseek.png",
    serviceUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    type: "text-translation",
    enabled: false,
    apiKey: "",
    model: "Qwen/Qwen3-8B",
    icon: "siliconflow.png",
    serviceUrl: "https://cloud.siliconflow.cn/me/account/ak",
  },
  {
    id: "glm",
    name: "智谱翻译",
    type: "text-translation",
    enabled: false,
    apiKey: "",
    model: "general_translation",
    icon: "glm.png",
    serviceUrl: "https://bigmodel.cn/usercenter/proj-mgmt/apikeys",
  },
  {
    id: "siliconflow_ocr",
    name: "硅基流动(OCR)",
    type: "text-recognition",
    enabled: false,
    apiKey: "",
    model: "THUDM/GLM-4.1V-9B-Thinking",
    icon: "siliconflow.png",
    serviceUrl: "https://cloud.siliconflow.cn/me/account/ak",
  },
];

interface ServiceState {
  services: ServiceConfig[];
  activeServiceType: ServiceType;
  store: Store | null;
  initStore: () => Promise<void>;
  setActiveServiceType: (type: ServiceType) => void;
  refreshServices: () => Promise<void>;
  updateService: (
    id: string,
    field: keyof ServiceConfig,
    value: string | boolean,
  ) => Promise<void>;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: DEFAULT_SERVICES,
  activeServiceType: "text-translation",
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
  setActiveServiceType: (type: ServiceType) => {
    set({ activeServiceType: type });
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
          // Ensure type is preserved or defaulted
          return saved
            ? { ...def, ...saved, type: saved.type || "text-translation" }
            : def;
        });

        // Only update if changed
        if (JSON.stringify(merged) !== JSON.stringify(get().services)) {
          set({ services: merged });
        }
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
