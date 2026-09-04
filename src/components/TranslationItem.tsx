import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Volume2,
  Check,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { ServiceConfig } from "@/store/services";
import { translateText } from "@/services/translation";
import { detectLanguage } from "@/lib/languages";
import type { TranslationResult, VocabularyEntry } from "@/lib/types";

const ICONS = import.meta.glob("@/assets/*.png", { eager: true, as: "url" });

interface TranslationItemProps {
  service: ServiceConfig;
  text: string;
  sourceLang: string;
  targetLang: string;
  sourceLangLabel: string;
  targetLangLabel: string;
  requestId: number;
  className?: string;
  isFavorited?: boolean;
  onToggleFavorite?: (entry: Omit<VocabularyEntry, "id" | "createdAt">) => void;
  onFirstComplete?: (result: TranslationResult, serviceName: string) => void;
}

export function TranslationItem({
  service,
  text,
  sourceLang,
  targetLang,
  sourceLangLabel,
  targetLangLabel,
  requestId,
  className,
  isFavorited,
  onToggleFavorite,
  onFirstComplete,
}: TranslationItemProps) {
  const [copied, setCopied] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const activeRequestRef = useRef(0);

  const [retryCount, setRetryCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const onFirstCompleteRef = useRef(onFirstComplete);
  useEffect(() => {
    onFirstCompleteRef.current = onFirstComplete;
  });

  const onFirstCompleteCalledRef = useRef(false);
  useEffect(() => {
    onFirstCompleteCalledRef.current = false;
  }, [requestId]);

  const prevLoadingRef = useRef(isLoading);

  useEffect(() => {
    const activeRequest = ++activeRequestRef.current;

    if (!text.trim()) {
      setTranslatedText("");
      setIsLoading(false);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    const translate = async () => {
      setIsLoading(true);
      setError(null);
      setTranslatedText("");

      await translateText(
        {
          service,
          text,
          sourceLangLabel,
          targetLangLabel,
          signal: abortController.signal,
        },
        {
          onUpdate: (chunk) => {
            if (activeRequestRef.current === activeRequest) {
              setTranslatedText((prev) => prev + chunk);
            }
          },
          onError: (err) => {
            if (activeRequestRef.current === activeRequest) {
              setError(err);
              setIsLoading(false);
            }
          },
          onComplete: () => {
            if (
              activeRequestRef.current === activeRequest &&
              !abortController.signal.aborted
            ) {
              setIsLoading(false);
            }
          },
        },
      );
    };

    void translate();

    return () => {
      if (activeRequestRef.current === activeRequest) {
        activeRequestRef.current += 1;
      }
      abortController.abort();
    };
  }, [
    text,
    service.id,
    service.model,
    service.apiKey,
    sourceLangLabel,
    targetLangLabel,
    retryCount,
    requestId,
  ]);

  const parsedResult = useMemo<TranslationResult | null>(() => {
    if (!translatedText) return null;
    const trimmed = translatedText.trim();

    try {
      if (trimmed.startsWith("{")) {
        // Try parsing full JSON first
        try {
          return JSON.parse(trimmed);
        } catch (e) {
          // If failed, try partial parsing using regex
          const partial: TranslationResult = { translation: "" };

          // Extract translation
          const translationMatch = trimmed.match(
            /"translation"\s*:\s*"((?:[^"\\]|\\.)*)/,
          );
          if (translationMatch) {
            partial.translation = translationMatch[1];
          }

          // Extract phonetic
          const phoneticMatch = trimmed.match(
            /"phonetic"\s*:\s*"((?:[^"\\]|\\.)*)/,
          );
          if (phoneticMatch) {
            partial.phonetic = phoneticMatch[1];
          }

          // Extract contextual_analysis
          const contextMatch = trimmed.match(
            /"contextual_analysis"\s*:\s*"((?:[^"\\]|\\.)*)/,
          );
          if (contextMatch) {
            partial.contextual_analysis = contextMatch[1];
          }

          // Return partial result if any field found, otherwise return empty translation to show loading/empty state instead of raw JSON
          return partial;
        }
      }
      return { translation: translatedText };
    } catch (e) {
      return { translation: translatedText };
    }
  }, [translatedText]);

  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isLoading;

    if (
      wasLoading &&
      !isLoading &&
      !error &&
      parsedResult?.translation &&
      !onFirstCompleteCalledRef.current
    ) {
      onFirstCompleteCalledRef.current = true;
      onFirstCompleteRef.current?.(parsedResult, service.name);
    }
  }, [error, isLoading, parsedResult, service.name]);

  const handleCopy = async () => {
    if (!parsedResult?.translation) return;
    try {
      await navigator.clipboard.writeText(parsedResult.translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleSpeak = () => {
    const textToSpeak =
      parsedResult?.phonetic && targetLang !== "en"
        ? text
        : parsedResult?.translation;

    if (!textToSpeak || isSpeaking) return;

    if (!("speechSynthesis" in window)) {
      console.error("Speech synthesis is not supported by this WebView");
      return;
    }

    const language = parsedResult?.phonetic
      ? targetLang === "en"
        ? "en"
        : sourceLang === "auto"
          ? detectLanguage(textToSpeak)
          : sourceLang
      : targetLang;
    const languageTags: Record<string, string> = {
      zh: "zh-CN",
      en: "en-US",
      ja: "ja-JP",
      ko: "ko-KR",
      fr: "fr-FR",
      de: "de-DE",
      es: "es-ES",
      ru: "ru-RU",
    };
    const languageTag = languageTags[language] ?? language;
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    utterance.lang = languageTag;
    const languagePrefix = languageTag.split("-")[0].toLowerCase();
    utterance.voice =
      synth
        .getVoices()
        .find((voice) => voice.lang.toLowerCase() === languageTag.toLowerCase()) ??
      synth
        .getVoices()
        .find((voice) =>
          voice.lang.toLowerCase().startsWith(`${languagePrefix}-`),
        ) ??
      null;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      setIsSpeaking(false);
    };

    synth.cancel();
    setIsSpeaking(true);
    synth.speak(utterance);
  };

  const handleFavorite = () => {
    if (!parsedResult?.translation || !onToggleFavorite) return;
    onToggleFavorite({
      text,
      translation: parsedResult.translation,
      phonetic: parsedResult.phonetic,
      definitions: parsedResult.definitions,
      contextual_analysis: parsedResult.contextual_analysis,
      sourceLang,
      sourceLangLabel,
      targetLang,
      targetLangLabel,
      serviceName: service.name,
    });
  };

  const isSmall = className?.includes("text-sm");

  return (
    <Card className={`bg-muted/20 ${className || ""}`}>
      <CardHeader
        className={`py-2 px-4 space-y-0 ${!isCollapsed ? "border-b" : ""} flex flex-row items-center justify-between ${isSmall ? "py-1 px-3" : ""}`}
      >
        <div className="flex items-center gap-2">
          <CardTitle
            className={`text-sm font-medium text-muted-foreground flex items-center gap-2 ${isSmall ? "text-xs" : ""}`}
          >
            <img
              src={
                Object.entries(ICONS).find(([path]) =>
                  path.endsWith(service.icon),
                )?.[1] || ""
              }
              alt={service.name}
              className={`h-4 w-4 ${isSmall ? "h-3 w-3" : ""}`}
            />
            {service.name}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {!!error && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setRetryCount((prev) => prev + 1);
              }}
              title="重试"
            >
              <RotateCw className="h-3 w-3" />
            </Button>
          )}
          {!isLoading && !error && parsedResult && parsedResult.translation && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${isSmall ? "h-5 w-5" : ""}`}
                onClick={handleSpeak}
                disabled={isSpeaking}
                title="朗读"
              >
                {isSpeaking ? (
                  <RotateCw
                    className={`h-3 w-3 animate-spin ${isSmall ? "h-2.5 w-2.5" : ""}`}
                  />
                ) : (
                  <Volume2
                    className={`h-3 w-3 ${isSmall ? "h-2.5 w-2.5" : ""}`}
                  />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${isSmall ? "h-5 w-5" : ""}`}
                onClick={handleCopy}
                title="复制"
              >
                {copied ? (
                  <Check
                    className={`h-3 w-3 text-green-500 ${isSmall ? "h-2.5 w-2.5" : ""}`}
                  />
                ) : (
                  <Copy className={`h-3 w-3 ${isSmall ? "h-2.5 w-2.5" : ""}`} />
                )}
              </Button>
              {onToggleFavorite && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${isSmall ? "h-5 w-5" : ""}`}
                  onClick={handleFavorite}
                  title={isFavorited ? "取消收藏" : "收藏"}
                >
                  {isFavorited ? (
                    <Star
                      className={`h-3 w-3 text-yellow-400 fill-current ${isSmall ? "h-2.5 w-2.5" : ""}`}
                    />
                  ) : (
                    <Star className={`h-3 w-3 ${isSmall ? "h-2.5 w-2.5" : ""}`} />
                  )}
                </Button>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${isSmall ? "h-5 w-5" : ""}`}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "展开" : "折叠"}
          >
            {isCollapsed ? (
              <ChevronDown className={`h-4 w-4 ${isSmall ? "h-3 w-3" : ""}`} />
            ) : (
              <ChevronUp className={`h-4 w-4 ${isSmall ? "h-3 w-3" : ""}`} />
            )}
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <>
          <CardContent className={`p-4 min-h-[50px] ${isSmall ? "p-3" : ""}`}>
            {isLoading && !translatedText ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <RotateCw className="h-4 w-4 animate-spin mr-2" />
                正在翻译...
              </div>
            ) : error ? (
              <div className="text-destructive text-sm">
                翻译失败: {error instanceof Error ? error.message : "未知错误"}
              </div>
            ) : parsedResult ? (
              <div className="flex flex-col gap-2">
                {/* Main Translation & Phonetic */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`font-medium ${isSmall ? "text-sm" : "text-lg"}`}
                    >
                      {parsedResult.translation}
                    </span>
                    {parsedResult.phonetic && targetLang !== "en" && (
                      <span
                        className={`font-medium ${isSmall ? "text-sm" : "text-lg"}`}
                      >
                        {text}
                      </span>
                    )}
                    {parsedResult.phonetic && (
                      <span className="text-muted-foreground font-mono text-sm">
                        {parsedResult.phonetic}
                      </span>
                    )}
                  </div>
                </div>

                {/* Definitions (Single Word Mode) */}
                {parsedResult.definitions &&
                  parsedResult.definitions.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {parsedResult.definitions.map((def, index) => (
                        <div
                          key={index}
                          className="flex flex-col gap-1 text-sm"
                        >
                          <div className="flex gap-2">
                            <span className="font-semibold italic text-muted-foreground min-w-[3em]">
                              {def.pos}
                            </span>
                            <span>{def.meaning}</span>
                          </div>
                          {def.example && (
                            <div className="pl-[calc(3em+0.5rem)] text-muted-foreground text-xs flex flex-col gap-0.5">
                              <span>{def.example.source}</span>
                              <span>{def.example.target}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ) : (
              // Fallback while streaming/parsing
              <div
                className={`whitespace-pre-wrap ${isSmall ? "text-sm" : "text-base"}`}
              >
                {translatedText}
              </div>
            )}
          </CardContent>
          {/* Contextual Analysis Footer */}
          {parsedResult?.contextual_analysis && (
            <CardFooter className={`px-4 pb-4 ${isSmall ? "p-3" : ""}`}>
              <div className="w-full text-xs text-muted-foreground bg-muted/50 rounded">
                <span className="font-semibold">语境分析：</span>
                {parsedResult.contextual_analysis}
              </div>
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
}
