import ky from "ky";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Volume2, Check, RotateCw, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
    // ... existing translate logic ...

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
                    content: `你是一个专业的翻译助手。请将用户输入的文本从${sourceLangLabel}翻译成${targetLangLabel}。
请注意：
1. 仅输出翻译后的结果，不要包含任何解释、寒暄或额外的文本。
2. 保持原文的语气和格式。
3. 如果遇到驼峰命名法或者下划线连接的专有名词，请拆分翻译。
4. 如果遇到无法翻译的专有名词，请保留原文。`,
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
                // if (dataStr === "[DONE]") continue;

                try {
                  const data = JSON.parse(dataStr);

                  // Handle Anthropic-style stream events
                  switch (data.type) {
                    case "message_start":
                      // Message started, optionally handle message metadata
                      break;

                    case "content_block_start":
                      // Content block started
                      if (data.content_block?.text) {
                        setTranslatedText(
                          (prev) => prev + data.content_block.text,
                        );
                      }
                      break;

                    case "content_block_delta":
                      // Content updates
                      if (
                        data.delta?.type === "text_delta" &&
                        data.delta?.text
                      ) {
                        setTranslatedText((prev) => prev + data.delta.text);
                      }
                      break;

                    case "message_delta":
                      // Message updates (e.g. stop reason)
                      break;

                    case "message_stop":
                      // Message finished
                      break;

                    case "ping":
                      // Keep-alive
                      break;

                    default:
                      // Fallback for OpenAI-style format (if API returns mixed formats)
                      if (data.choices?.[0]?.delta?.content) {
                        setTranslatedText(
                          (prev) => prev + data.choices[0].delta.content,
                        );
                      }
                      break;
                  }
                } catch (e) {
                  console.warn("Failed to parse SSE data:", e);
                }
              }
            }
          }
        } else {
          // Mock for other services
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (!abortController.signal.aborted) {
            setTranslatedText(
              `[${service.name}] [${sourceLangLabel} -> ${targetLangLabel}] ${text}`,
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

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleSpeak = async () => {
    if (!translatedText) return;

    if (false) {
      if (isSpeaking) return;
      setIsSpeaking(true);
      try {
        const response = await ky.post(
          "https://api.siliconflow.cn/v1/audio/speech",
          {
            headers: {
              Authorization: `Bearer ${service.apiKey}`,
              "Content-Type": "application/json",
            },
            json: {
              model: "FunAudioLLM/SenseVoiceSmall",
              input: translatedText,
            },
            timeout: 60000,
          },
        );

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (err) {
        console.error("Failed to speak text via API: ", err);
        setIsSpeaking(false);
        // Fallback to browser TTS if API fails?
        // For now, just log error as user explicitly requested API usage
      }
    } else {
      // Fallback for other services
      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = targetLang;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const isSmall = className?.includes("text-sm");

  return (
    <Card className={`bg-muted/20 ${className || ""}`}>
      <CardHeader className={`py-2 px-4 space-y-0 ${!isCollapsed ? "border-b" : ""} flex flex-row items-center justify-between ${isSmall ? "py-1 px-3" : ""}`}>
        <CardTitle className={`text-sm font-medium text-muted-foreground ${isSmall ? "text-xs" : ""}`}>
          {service.name}
        </CardTitle>
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
        <CardContent className={`p-4 relative min-h-[50px] ${isSmall ? "p-3" : ""}`}>
        {isLoading && !translatedText ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <RotateCw className="h-4 w-4 animate-spin mr-2" />
            正在翻译...
          </div>
        ) : error ? (
          <div className="text-destructive text-sm">
            翻译失败: {error instanceof Error ? error.message : "未知错误"}
          </div>
        ) : (
          <div className={`whitespace-pre-wrap ${isSmall ? "text-sm" : "text-base"}`}>{translatedText}</div>
        )}

        {!isLoading && !error && translatedText && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${isSmall ? "h-6 w-6" : ""}`}
              onClick={handleSpeak}
              disabled={isSpeaking}
              title="朗读"
            >
              {isSpeaking ? (
                <RotateCw className={`h-4 w-4 animate-spin ${isSmall ? "h-3 w-3" : ""}`} />
              ) : (
                <Volume2 className={`h-4 w-4 ${isSmall ? "h-3 w-3" : ""}`} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${isSmall ? "h-6 w-6" : ""}`}
              onClick={handleCopy}
              title="复制"
            >
              {copied ? (
                <Check className={`h-4 w-4 text-green-500 ${isSmall ? "h-3 w-3" : ""}`} />
              ) : (
                <Copy className={`h-4 w-4 ${isSmall ? "h-3 w-3" : ""}`} />
              )}
            </Button>
          </div>
        )}
        </CardContent>
      )}
    </Card>
  );
}
