import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";
import { TranslationItem } from "@/components/TranslationItem";
import { useServiceStore } from "@/store/services";

const LANGUAGES = [
  { value: "auto", label: "自动检测" },
  { value: "zh", label: "中文" },
  { value: "en", label: "英语" },
  { value: "ja", label: "日语" },
  { value: "ko", label: "韩语" },
  { value: "fr", label: "法语" },
  { value: "de", label: "德语" },
  { value: "es", label: "西班牙语" },
  { value: "ru", label: "俄语" },
];

export default function Translate() {
  const [inputText, setInputText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");
  const services = useServiceStore((state) => state.services);
  const activeServices = services.filter((s) => s.enabled);

  const handleSwapLanguages = () => {
    if (sourceLang === "auto") {
      setSourceLang(targetLang);
      setTargetLang("zh"); // Default or previous source
    } else {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
    }
  };

  const detectLanguage = (text: string) => {
    if (!text.trim()) return "auto";
    const sample = text.slice(0, 50);
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) return "ja"; // Japanese Kana
    if (/[\uac00-\ud7af]/.test(sample)) return "ko"; // Korean Hangul
    if (/[\u0400-\u04FF]/.test(sample)) return "ru"; // Cyrillic
    if (/[\u4e00-\u9fa5]/.test(sample)) return "zh"; // Chinese Characters
    return "en"; // Default to English/Latin
  };

  const detectedLangCode =
    sourceLang === "auto" && inputText ? detectLanguage(inputText) : null;
  const detectedLangLabel = detectedLangCode
    ? LANGUAGES.find((l) => l.value === detectedLangCode)?.label
    : null;

  const handleTranslate = () => {
    if (!inputText.trim()) return;
    setSubmittedText(inputText);
  };

  const effectiveSourceLang =
    sourceLang === "auto" && submittedText
      ? detectLanguage(submittedText)
      : sourceLang;
  const effectiveSourceLangLabel =
    LANGUAGES.find((l) => l.value === effectiveSourceLang)?.label ||
    effectiveSourceLang;
  const targetLangLabel =
    LANGUAGES.find((l) => l.value === targetLang)?.label || targetLang;

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4">
      {/* Input Area */}
      <div className="relative">
        <Textarea
          placeholder="请输入需要翻译的文本..."
          className="min-h-[150px] resize-none text-base"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleTranslate();
            }
          }}
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground flex gap-3">
          {sourceLang === "auto" && detectedLangLabel && (
            <span>检测为: {detectedLangLabel}</span>
          )}
          <span>{inputText.length} 字符</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between rounded-lg bg-muted/30 p-2">
        <div className="flex items-center gap-2">
          <Select value={sourceLang} onValueChange={setSourceLang}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="选择语言" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwapLanguages}
            className="rounded-full hover:bg-muted"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>

          <Select value={targetLang} onValueChange={setTargetLang}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="选择语言" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.filter((l) => l.value !== "auto").map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleTranslate} size="sm">
          翻译
        </Button>
      </div>

      {/* Result Area */}
      <div className="flex flex-col gap-4">
        {submittedText && activeServices.length > 0 ? (
          activeServices.map((service) => (
            <TranslationItem
              key={service.id}
              service={service}
              text={submittedText}
              sourceLang={effectiveSourceLang}
              targetLang={targetLang}
              sourceLangLabel={effectiveSourceLangLabel || ""}
              targetLangLabel={targetLangLabel || ""}
            />
          ))
        ) : submittedText && activeServices.length === 0 ? (
          <div className="relative flex min-h-[150px] flex-col rounded-md border bg-muted/20 p-4 justify-center items-center text-muted-foreground">
            {/* Fallback local mock if no services active, or just show message */}
            <TranslationItem
              key="default"
              service={{
                id: "default",
                name: "本地模拟",
                enabled: true,
                apiKey: "",
                model: "default",
              }}
              text={submittedText}
              sourceLang={effectiveSourceLang}
              targetLang={targetLang}
              sourceLangLabel={effectiveSourceLangLabel || ""}
              targetLangLabel={targetLangLabel || ""}
            />
          </div>
        ) : (
          <div className="relative flex min-h-[150px] flex-col rounded-md border bg-muted/20 p-4 justify-center items-center text-muted-foreground">
            翻译结果将显示在这里...
          </div>
        )}
      </div>
    </div>
  );
}
