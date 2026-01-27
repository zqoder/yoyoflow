import ky from "ky";
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
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { ServiceConfig } from "@/store/services";

interface TranslationItemProps {
  service: ServiceConfig;
  text: string;
  sourceLang: string;
  targetLang: string;
  sourceLangLabel: string;
  targetLangLabel: string;
  className?: string;
}

interface WordDefinition {
  pos: string;
  meaning: string;
  example: {
    source: string;
    target: string;
  };
}

interface TranslationResult {
  phonetic?: string;
  definitions?: WordDefinition[];
  translation: string;
  contextual_analysis?: string;
}

export function TranslationItem({
  service,
  text,
  targetLang,
  sourceLangLabel,
  targetLangLabel,
  className,
}: TranslationItemProps) {
  const [copied, setCopied] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [retryCount, setRetryCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!text.trim()) {
      setTranslatedText("");
      return;
    }

    const translate = async () => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setError(null);
      setTranslatedText("");

      try {
        if (service.id === "siliconflow") {
          const response = await ky.post(
            "https://api.siliconflow.cn/v1/messages",
            {
              headers: {
                Authorization: `Bearer ${service.apiKey}`,
              },
              json: {
                model: service.model,
                messages: [
                  {
                    role: "system",
                    content: `You are a professional multilingual translation engine. translate the text from ${sourceLangLabel} to ${targetLangLabel}.
RULES:
1. Only output the translated text, without any explanations, greetings, or extra text.
2. Preserve the original tone and format.
3. If encountering camelCase or snake_case words, translate each part separately.
4. If encountering unknown words, keep them as-is.
5. For single words: provide translation, phonetics, definitions grouped by part of speech, and example sentences.  
6. For sentences/phrases:  provide translation only.  
7. All responses must be in Simplified Chinese language.  
8. For English, Use American phonetics for phonetic symbols. 
9. For Chinese, Use standard Pinyin for phonetic symbols (with tone marks) 
10. For other languages, use their native phonetic systems for phonetic symbols
11. Do not output languages other than those requested 
12. Consider context when analyzing words.  
13. Output raw JSON without markdown code blocks. 
14. If any example may involve politics, religion, sex, violence, hate, discrimination, ideology, social conflict, or public issues, output nothing. No substitution. No explanation. No expansion. 
15. SINGLE WORD OUTPUT: {"phonetic": "/həˈləʊ/", "definitions": [{"pos": "excl.", "meaning": "Simplified Chinese translation for current pos", "example": {"source": "Hello, how are you today?", "target": "Simplified Chinese example"}}],  "translation": "translation in Simplified Chinese",  "contextual_analysis": "contextual analysis use Simplified Chinese language"}
16. SENTENCE/PHRASE OUTPUT: {"translation": "translation in Simplified Chinese"}`,
                  },
                  {
                    role: "user",
                    content: text,
                  },
                ],
                stream: true,
              },
              timeout: 60000,
              signal: abortController.signal,
            },
          );

          if (!response.body) throw new Error("No response body");
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data:")) {
                const dataStr = line.slice(5);

                try {
                  const data = JSON.parse(dataStr);

                  // Handle Anthropic-style stream events
                  switch (data.type) {
                    case "message_start":
                      break;

                    case "content_block_start":
                      if (data.content_block?.text) {
                        setTranslatedText(
                          (prev) => prev + data.content_block.text,
                        );
                      }
                      break;

                    case "content_block_delta":
                      if (
                        data.delta?.type === "text_delta" &&
                        data.delta?.text
                      ) {
                        setTranslatedText((prev) => prev + data.delta.text);
                      }
                      break;

                    case "message_delta":
                      break;

                    case "message_stop":
                      break;

                    case "ping":
                      break;

                    default:
                      // Fallback for OpenAI-style format
                      if (data.choices?.[0]?.delta?.content) {
                        setTranslatedText(
                          (prev) => prev + data.choices[0].delta.content,
                        );
                      }
                      break;
                  }
                } catch (e) {
                  // Ignore parse errors for partial chunks
                }
              }
            }
          }
        } else {
          // Mock for other services
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (!abortController.signal.aborted) {
            setTranslatedText(
              JSON.stringify({
                translation: `[${service.name}] ${text}`,
              }),
            );
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    translate();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [text, service, sourceLangLabel, targetLangLabel, retryCount]);

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

  const handleSpeak = async () => {
    const textToSpeak = parsedResult?.phonetic
      ? text
      : parsedResult?.translation;

    if (!textToSpeak) return;

    // ... existing speak logic using textToSpeak ...
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = targetLang;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const isSmall = className?.includes("text-sm");

  return (
    <Card className={`bg-muted/20 ${className || ""}`}>
      <CardHeader
        className={`py-2 px-4 space-y-0 ${!isCollapsed ? "border-b" : ""} flex flex-row items-center justify-between ${isSmall ? "py-1 px-3" : ""}`}
      >
        <div className="flex items-center gap-2">
          <CardTitle
            className={`text-sm font-medium text-muted-foreground ${isSmall ? "text-xs" : ""}`}
          >
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
                    {parsedResult?.definitions &&
                      parsedResult.definitions?.length > 0 && (
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
