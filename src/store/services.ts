import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";

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
      const store = await Store.load("services.json");
      set({ store });

      const savedServices = await store.get<ServiceConfig[]>("services");
      if (savedServices) {
        const merged = DEFAULT_SERVICES.map((def) => {
          const saved = savedServices.find(
            (s: ServiceConfig) => s.id === def.id,
          );
          return saved ? { ...def, ...saved } : def;
        });
        set({ services: merged });
      } else {
        await store.set("services", DEFAULT_SERVICES);
        await store.save();
      }
    } catch (err) {
      console.error("Failed to initialize store:", err);
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
    }
  },
}));
