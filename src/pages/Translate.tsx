import { useState, useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { Textarea } from "@/components/ui/textarea";
import { TranslationItem } from "@/components/TranslationItem";
import { useServiceStore } from "@/store/services";
import { useVocabularyStore } from "@/store/vocabulary";
import { useHistoryStore } from "@/store/history";
import {
  LANGUAGES,
  detectLanguage,
  getAutoTargetLanguage,
} from "@/lib/languages";
import { ControlBar } from "@/components/ControlBar";
import type { TranslationResult, VocabularyEntry } from "@/lib/types";

export default function Translate() {
  const [inputText, setInputText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [translationRequestId, setTranslationRequestId] = useState(0);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");

  useEffect(() => {
    if (sourceLang === "auto" && inputText.trim()) {
      setTargetLang(getAutoTargetLanguage(inputText));
    }
  }, [inputText, sourceLang]);

  const services = useServiceStore((state) => state.services);
  const activeServices = services.filter(
    (s) => s.enabled && s.type === "text-translation",
  );

  const { isFavorited, addEntry, removeByKey } = useVocabularyStore(
    useShallow((state) => ({
      isFavorited: state.isFavorited,
      addEntry: state.addEntry,
      removeByKey: state.removeByKey,
      version: state.version,
    })),
  );
  const addHistory = useHistoryStore((state) => state.addEntry);

  const historySavedRef = useRef(false);
  const submittedTextRef = useRef(submittedText);
  submittedTextRef.current = submittedText;

  const handleSwapLanguages = () => {
    if (sourceLang === "auto") {
      setSourceLang(targetLang);
      setTargetLang("zh");
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
    historySavedRef.current = false;
    setSubmittedText(inputText);
    setTranslationRequestId((current) => current + 1);
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

  const handleToggleFavorite = (entry: Omit<VocabularyEntry, "id" | "createdAt">) => {
    if (isFavorited(entry.text, entry.sourceLang, entry.targetLang)) {
      removeByKey(entry.text, entry.sourceLang, entry.targetLang);
    } else {
      addEntry({
        ...entry,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      });
    }
  };

  const handleFirstComplete = (result: TranslationResult, serviceName: string) => {
    if (historySavedRef.current) return;
    const text = submittedTextRef.current;
    if (!text) return;
    historySavedRef.current = true;
    void addHistory({
      id: crypto.randomUUID(),
      text,
      translationResult: result,
      sourceLang: effectiveSourceLang,
      sourceLangLabel: effectiveSourceLangLabel || "",
      targetLang,
      targetLangLabel: targetLangLabel || "",
      serviceName,
      createdAt: Date.now(),
    }).catch((err) => {
      historySavedRef.current = false;
      console.error("Failed to save translation history:", err);
    });
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4">
      <div className="relative">
        <Textarea
          placeholder="请输入需要翻译的文本..."
          className="min-h-[150px] resize-none text-base"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
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

      <ControlBar
        sourceLang={sourceLang}
        targetLang={targetLang}
        onSourceChange={setSourceLang}
        onTargetChange={setTargetLang}
        onSwap={handleSwapLanguages}
        onTranslate={handleTranslate}
      />

      <div className="flex flex-col gap-4">
        {submittedText && activeServices.length > 0 ? (
          activeServices.map((service) => {
            const fav = isFavorited(submittedText, effectiveSourceLang, targetLang);
            return (
              <TranslationItem
                key={service.id}
                service={service}
                text={submittedText}
                sourceLang={effectiveSourceLang}
                targetLang={targetLang}
                sourceLangLabel={effectiveSourceLangLabel || ""}
                targetLangLabel={targetLangLabel || ""}
                requestId={translationRequestId}
                isFavorited={fav}
                onToggleFavorite={handleToggleFavorite}
                onFirstComplete={handleFirstComplete}
              />
            );
          })
        ) : submittedText && activeServices.length === 0 ? (
          <div className="relative flex min-h-[150px] flex-col rounded-md border bg-muted/20 p-4 justify-center items-center text-muted-foreground">
            未启用任何翻译服务，请在"服务"设置中启用。
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
