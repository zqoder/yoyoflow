import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useServiceStore,
  AVAILABLE_MODELS,
  type ServiceConfig,
} from "@/store/services";
import { testCustomTranslationService } from "@/services/translation";

const ICONS = import.meta.glob("@/assets/*.png", { eager: true, as: "url" });

interface CustomServiceDraft {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  stream: boolean;
}

const EMPTY_CUSTOM_SERVICE: CustomServiceDraft = {
  id: "",
  name: "",
  baseUrl: "",
  model: "",
  apiKey: "",
  enabled: true,
  stream: true,
};

export default function Service() {
  const {
    services,
    updateService,
    saveCustomService,
    removeCustomService,
    activeServiceType,
  } = useServiceStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CustomServiceDraft>(EMPTY_CUSTOM_SERVICE);
  const [formError, setFormError] = useState("");
  const [testState, setTestState] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testMessage, setTestMessage] = useState("");

  const filteredServices = services.filter((s) => s.type === activeServiceType);

  const resetEditor = () => {
    setIsEditing(false);
    setDraft(EMPTY_CUSTOM_SERVICE);
    setFormError("");
    setTestState("idle");
    setTestMessage("");
  };

  useEffect(() => {
    const openCreateEditor = () => {
      setDraft(EMPTY_CUSTOM_SERVICE);
      setIsEditing(true);
      setFormError("");
      setTestState("idle");
      setTestMessage("");
    };

    window.addEventListener(
      "yoyoflow:open-custom-service-editor",
      openCreateEditor,
    );
    return () =>
      window.removeEventListener(
        "yoyoflow:open-custom-service-editor",
        openCreateEditor,
      );
  }, []);

  const openEditEditor = (service: ServiceConfig) => {
    setDraft({
      id: service.id,
      name: service.name,
      baseUrl: service.baseUrl ?? "",
      model: service.model,
      apiKey: service.apiKey,
      enabled: service.enabled,
      stream: service.stream ?? true,
    });
    setIsEditing(true);
    setFormError("");
    setTestState("idle");
    setTestMessage("");
  };

  const buildServiceConfig = (): ServiceConfig => ({
    id: draft.id || `custom_${crypto.randomUUID()}`,
    name: draft.name.trim(),
    type: "text-translation",
    enabled: draft.enabled,
    apiKey: draft.apiKey.trim(),
    model: draft.model.trim(),
    icon: "",
    serviceUrl: "",
    kind: "custom",
    protocol: "openai-chat",
    baseUrl: draft.baseUrl.trim(),
    stream: draft.stream,
    timeoutMs: 60000,
  });

  const validateDraft = () => {
    if (!draft.name.trim() || !draft.baseUrl.trim() || !draft.model.trim()) {
      setFormError("服务名称、API 地址和模型名称不能为空");
      return false;
    }
    try {
      new URL(draft.baseUrl.trim());
    } catch {
      setFormError("API 地址格式无效");
      return false;
    }
    setFormError("");
    return true;
  };

  const handleTest = async () => {
    if (!validateDraft()) return;
    setTestState("testing");
    setTestMessage("正在连接服务...");
    try {
      const result = await testCustomTranslationService(buildServiceConfig());
      setTestState("success");
      setTestMessage(`连接成功：${result.slice(0, 80)}`);
    } catch (error) {
      setTestState("error");
      setTestMessage(
        error instanceof Error ? error.message : "连接测试失败",
      );
    }
  };

  const handleSave = async () => {
    if (!validateDraft()) return;
    await saveCustomService(buildServiceConfig());
    resetEditor();
  };

  const handleDelete = async (service: ServiceConfig) => {
    if (!window.confirm(`确定删除自定义服务“${service.name}”吗？`)) return;
    await removeCustomService(service.id);
  };

  return (
    <div className="grid gap-4 p-4 grid-cols-1">
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {draft.id ? "编辑自定义服务" : "添加自定义服务"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="custom-name">服务名称</Label>
              <Input
                id="custom-name"
                value={draft.name}
                placeholder="例如：本地 Ollama"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-base-url">API 地址</Label>
              <Input
                id="custom-base-url"
                value={draft.baseUrl}
                placeholder="https://api.example.com/v1 或 http://localhost:11434/v1"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    baseUrl: event.target.value,
                  }))
                }
              />
              <span className="text-xs text-muted-foreground">
                按 OpenAI Chat Completions 协议调用；如未包含路径，将自动追加 /chat/completions。
              </span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-model">模型名称</Label>
              <Input
                id="custom-model"
                value={draft.model}
                placeholder="例如：qwen3:8b"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    model: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-api-key">API Key（本地服务可留空）</Label>
              <PasswordInput
                id="custom-api-key"
                value={draft.apiKey}
                placeholder="Bearer Token"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    apiKey: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="custom-stream">流式响应</Label>
                <p className="text-xs text-muted-foreground">
                  服务不支持 SSE 时请关闭。
                </p>
              </div>
              <Switch
                id="custom-stream"
                checked={draft.stream}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, stream: checked }))
                }
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            {testState !== "idle" && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  testState === "error"
                    ? "text-destructive"
                    : testState === "success"
                      ? "text-green-600"
                      : "text-muted-foreground"
                }`}
              >
                {testState === "testing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testState === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="break-all">{testMessage}</span>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="ghost" onClick={resetEditor}>
              取消
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testState === "testing"}
            >
              测试连接
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </CardFooter>
        </Card>
      )}

      {filteredServices.length > 0 ? (
        filteredServices.map((service) => {
          const iconUrl = service.icon
            ? Object.entries(ICONS).find(([path]) =>
                path.endsWith(service.icon),
              )?.[1]
            : undefined;
          return (
            <Card key={service.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
                <CardTitle className="text-base font-medium flex items-center gap-2 min-w-0">
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={service.name}
                      className="h-4 w-4"
                    />
                  ) : (
                    <span className="h-5 w-5 rounded bg-primary/10 text-primary text-[10px] flex items-center justify-center">
                      自
                    </span>
                  )}
                  <span className="truncate">{service.name}</span>
                  {service.kind === "custom" && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      OpenAI 兼容
                    </span>
                  )}
                  {service.serviceUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 text-muted-foreground hover:text-primary"
                      onClick={() => openUrl(service.serviceUrl)}
                      title="获取 API Key"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {service.kind === "custom" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditEditor(service)}
                        title="编辑"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(service)}
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <Switch
                    checked={service.enabled}
                    onCheckedChange={(checked) =>
                      updateService(service.id, "enabled", checked)
                    }
                  />
                </div>
              </CardHeader>
              <CardFooter className="pt-6 flex-col gap-4 items-start">
                {service.kind === "custom" ? (
                  <>
                    <div className="flex w-full items-start gap-4 text-sm">
                      <span className="w-20 shrink-0 text-muted-foreground">
                        API 地址
                      </span>
                      <span className="break-all">{service.baseUrl}</span>
                    </div>
                    <div className="flex w-full items-center gap-4 text-sm">
                      <span className="w-20 shrink-0 text-muted-foreground">
                        Model
                      </span>
                      <span>{service.model}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex w-full items-center gap-4">
                      <Label
                        htmlFor={`model-${service.id}`}
                        className="w-20 shrink-0"
                      >
                        Model
                      </Label>
                      <Select
                        value={service.model}
                        onValueChange={(value) =>
                          updateService(service.id, "model", value)
                        }
                      >
                        <SelectTrigger
                          id={`model-${service.id}`}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_MODELS[service.id]?.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex w-full items-center gap-4">
                      <Label
                        htmlFor={`api-key-${service.id}`}
                        className="w-20 shrink-0"
                      >
                        API Key
                      </Label>
                      <PasswordInput
                        id={`api-key-${service.id}`}
                        placeholder={`Enter ${service.name} API Key`}
                        value={service.apiKey}
                        onChange={(event) =>
                          updateService(service.id, "apiKey", event.target.value)
                        }
                      />
                    </div>
                  </>
                )}
              </CardFooter>
            </Card>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
          暂无
          {activeServiceType === "text-translation"
            ? "翻译"
            : activeServiceType === "text-recognition"
              ? "识别"
              : "语音"}
          服务
        </div>
      )}
    </div>
  );
}
