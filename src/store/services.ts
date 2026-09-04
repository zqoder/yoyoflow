import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";
import { emit, listen } from "@tauri-apps/api/event";

export type ServiceType =
  | "text-translation"
  | "text-recognition"
  | "speech-synthesis";

export type ServiceKind = "builtin" | "custom";
export type ServiceProtocol = "builtin" | "openai-chat";

export interface ServiceConfig {
  id: string;
  name: string;
  type: ServiceType;
  enabled: boolean;
  apiKey: string;
  model: string;
  icon: string;
  serviceUrl: string;
  kind: ServiceKind;
  protocol: ServiceProtocol;
  baseUrl?: string;
  stream?: boolean;
  timeoutMs?: number;
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
    kind: "builtin",
    protocol: "builtin",
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
    kind: "builtin",
    protocol: "builtin",
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
    kind: "builtin",
    protocol: "builtin",
  },
  {
    id: "siliconflow_ocr",
    name: "硅基流动(OCR)",
    type: "text-recognition",
    enabled: false,
    apiKey: "",
    model: "PaddlePaddle/PaddleOCR-VL-1.5",
    icon: "siliconflow.png",
    serviceUrl: "https://cloud.siliconflow.cn/me/account/ak",
    kind: "builtin",
    protocol: "builtin",
  },
];

const normalizeSavedService = (service: ServiceConfig): ServiceConfig => ({
  ...service,
  kind: service.kind ?? "builtin",
  protocol: service.protocol ?? "builtin",
});

interface ServiceState {
  services: ServiceConfig[];
  activeServiceType: ServiceType;
  store: Store | null;
  initStore: () => Promise<void>;
  setActiveServiceType: (type: ServiceType) => void;
  refreshServices: () => Promise<void>;
  updateService: <K extends keyof ServiceConfig>(
    id: string,
    field: K,
    value: ServiceConfig[K],
  ) => Promise<void>;
  saveCustomService: (service: ServiceConfig) => Promise<void>;
  removeCustomService: (id: string) => Promise<void>;
}

export const useServiceStore = create<ServiceState>((set, get) => {
  const persistServices = async (services: ServiceConfig[]) => {
    let store = get().store;
    if (!store) {
      store = await Store.load("services.json");
      set({ store });
    }
    await store.set("services", services);
    await store.save();
    await emit("services-updated");
  };

  return {
    services: DEFAULT_SERVICES,
    activeServiceType: "text-translation",
    store: null,

    initStore: async () => {
      try {
        let store = get().store;
        if (!store) {
          store = await Store.load("services.json");
          set({ store });
          await listen("services-updated", async () => {
            await get().refreshServices();
          });
        }
        await get().refreshServices();
      } catch (err) {
        console.error("Failed to initialize store:", err);
      }
    },

    setActiveServiceType: (type) => set({ activeServiceType: type }),

    refreshServices: async () => {
      try {
        const store = get().store ?? (await Store.load("services.json"));
        if (!get().store) set({ store });

        const savedServices =
          (await store.get<ServiceConfig[]>("services")) ?? [];
        const normalizedSaved = savedServices.map(normalizeSavedService);
        const builtinIds = new Set(DEFAULT_SERVICES.map((service) => service.id));
        const mergedBuiltin = DEFAULT_SERVICES.map((defaults) => {
          const saved = normalizedSaved.find(
            (service) => service.id === defaults.id,
          );
          return saved ? { ...defaults, ...saved, kind: "builtin" as const } : defaults;
        });
        const customServices = normalizedSaved.filter(
          (service) =>
            service.kind === "custom" && !builtinIds.has(service.id),
        );
        const merged = [...mergedBuiltin, ...customServices];

        if (JSON.stringify(merged) !== JSON.stringify(get().services)) {
          set({ services: merged });
        }
        if (savedServices.length === 0) {
          await store.set("services", merged);
          await store.save();
        }
      } catch (err) {
        console.error("Failed to refresh services:", err);
      }
    },

    updateService: async (id, field, value) => {
      const services = get().services.map((service) =>
        service.id === id ? { ...service, [field]: value } : service,
      );
      set({ services });
      await persistServices(services);
    },

    saveCustomService: async (service) => {
      const normalized: ServiceConfig = {
        ...service,
        id: service.id || `custom_${crypto.randomUUID()}`,
        type: "text-translation",
        kind: "custom",
        protocol: "openai-chat",
        icon: service.icon || "",
        serviceUrl: "",
      };
      const exists = get().services.some((item) => item.id === normalized.id);
      const services = exists
        ? get().services.map((item) =>
            item.id === normalized.id ? normalized : item,
          )
        : [...get().services, normalized];
      set({ services });
      await persistServices(services);
    },

    removeCustomService: async (id) => {
      const target = get().services.find((service) => service.id === id);
      if (!target || target.kind !== "custom") return;
      const services = get().services.filter((service) => service.id !== id);
      set({ services });
      await persistServices(services);
    },
  };
});
