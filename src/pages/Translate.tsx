import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { TranslationItem } from "@/components/TranslationItem";
import { useServiceStore } from "@/store/services";
import { LANGUAGES, detectLanguage } from "@/lib/languages";
import { ControlBar } from "@/components/ControlBar";

export default function Translate() {
  const [inputText, setInputText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");
  const services = useServiceStore((state) => state.services);
  const activeServices = services.filter(
    (s) => s.enabled && s.type === "text-translation",
  );

  const handleSwapLanguages = () => {
    if (sourceLang === "auto") {
      setSourceLang(targetLang);
      setTargetLang("zh"); // Default or previous source
    } else {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
    }
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
    LANGUAGES.find((l) => l.value === effectiveSourceLang)?.prompt ||
    effectiveSourceLang;
  const targetLangLabel =
    LANGUAGES.find((l) => l.value === targetLang)?.prompt || targetLang;

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
      <ControlBar
        sourceLang={sourceLang}
        targetLang={targetLang}
        onSourceChange={setSourceLang}
        onTargetChange={setTargetLang}
        onSwap={handleSwapLanguages}
        onTranslate={handleTranslate}
      />

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
            未启用任何翻译服务，请在“服务”设置中启用。
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
