import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Pin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ControlBar } from "@/components/ControlBar";
import { LANGUAGES, detectLanguage } from "@/lib/languages";
import { useServiceStore } from "@/store/services";
import { TranslationItem } from "@/components/TranslationItem";
import { extractTextFromImage } from "@/services/ocr";

export default function ShortcutTranslate() {
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isPinned, setIsPinned] = useState(false);
  const isPinnedRef = useRef(false);

  const services = useServiceStore((state) => state.services);
  const refreshServices = useServiceStore((state) => state.refreshServices);
  const activeServices = services.filter(
    (s) => s.enabled && s.type === "text-translation",
  );

  const togglePin = async () => {
    const newState = !isPinned;
    setIsPinned(newState);
    isPinnedRef.current = newState;
    await getCurrentWindow().setAlwaysOnTop(newState);
  };

  const handleSwapLanguages = () => {
    if (sourceLang === "auto") {
      setSourceLang(targetLang);
      setTargetLang("zh"); // Default or previous source
    } else {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
    }
  };

  const handleTranslate = () => {
    if (!text.trim()) return;
    setSubmittedText(text);
  };

  const detectedLangCode =
    sourceLang === "auto" && text ? detectLanguage(text) : null;
  const detectedLangLabel = detectedLangCode
    ? LANGUAGES.find((l) => l.value === detectedLangCode)?.label
    : null;

  const effectiveSourceLang =
    sourceLang === "auto" && submittedText
      ? detectLanguage(submittedText)
      : sourceLang;
  const effectiveSourceLangLabel =
    LANGUAGES.find((l) => l.value === effectiveSourceLang)?.prompt ||
    effectiveSourceLang;
  const targetLangLabel =
    LANGUAGES.find((l) => l.value === targetLang)?.prompt || targetLang;

  const handleClose = async () => {
    setText("");
    setSubmittedText("");
    await getCurrentWindow().hide();
  };

  // Close window on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto focus when window gets focus
  useEffect(() => {
    // Focus when component mounts
    inputRef.current?.focus();

    // Listen for focus event
    const unlistenFocus = getCurrentWindow().listen("tauri://focus", () => {
      inputRef.current?.focus();
      // Select all text when refocused
      // inputRef.current?.select();
      // Refresh services configuration
      refreshServices();
    });

    // Close window on blur
    // Using a small delay to prevent closing when switching focus within the window
    const unlistenBlur = getCurrentWindow().listen("tauri://blur", () => {
      // Check if the document still has focus (e.g. interacting with internal elements)
      // But since tauri://blur means the window lost focus, we should just hide it.
      // However, sometimes it triggers unexpectedly.
      // Let's try to verify if we really lost focus.
      if (!isPinnedRef.current) {
        handleClose();
      }
    });

    // Listen for selection translate event
    const unlistenSelection = getCurrentWindow().listen<string>(
      "selection-translate",
      (event) => {
        const selectedText = event.payload;
        if (selectedText) {
          setText(selectedText);
          setSubmittedText(selectedText);
          // If we want to ensure window is visible and focused (backend handles it too)
          getCurrentWindow().show();
          getCurrentWindow().setFocus();
        }
      },
    );

    // Listen for screenshot captured event
    const unlistenScreenshot = getCurrentWindow().listen<string>(
      "screenshot-captured",
      async (event) => {
        const imageBase64 = event.payload;
        if (!imageBase64) return;

        setIsOcrLoading(true);
        setText("正在提取文字...");
        setSubmittedText("");

        // Find OCR service
        const ocrService = services.find(
          (s) => s.enabled && s.type === "text-recognition",
        );

        if (!ocrService) {
          setText("未启用 OCR 服务，请在设置中配置并启用。");
          setIsOcrLoading(false);
          return;
        }

        await extractTextFromImage(ocrService, imageBase64, {
          onSuccess: (extractedText) => {
            setText(extractedText);
            setSubmittedText(extractedText);
            setIsOcrLoading(false);
          },
          onError: (err) => {
            setText(`OCR 失败: ${err.message}`);
            setIsOcrLoading(false);
          },
        });
      },
    );

    return () => {
      unlistenFocus.then((f) => f());
      unlistenBlur.then((f) => f());
      unlistenSelection.then((f) => f());
      unlistenScreenshot.then((f) => f());
    };
  }, [services]);

  // Auto resize textarea based on content
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text]);

  return (
    <div className="h-screen w-full bg-transparent flex items-center justify-center">
      <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
        {/* Header / Button Group */}
        <div
          className="flex items-center justify-end px-3 py-1 border-b bg-muted/30"
          data-tauri-drag-region
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 hover:bg-transparent",
                isPinned
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={togglePin}
            >
              <Pin className={cn("h-4 w-4", isPinned && "fill-current")} />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-3 border-b flex-shrink-0 relative">
          <Textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要翻译的文本..."
            className="min-h-[50px] resize-none border-none shadow-none focus-visible:ring-0 px-0 py-0 pb-2 text-sm bg-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleTranslate();
              }
            }}
          />
          <div className="absolute bottom-0 right-3 text-xs text-muted-foreground flex gap-3 pointer-events-none">
            {isOcrLoading && (
              <div className="flex items-center gap-1 text-primary animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>OCR 识别中...</span>
              </div>
            )}
            {sourceLang === "auto" && detectedLangLabel && (
              <span>检测为: {detectedLangLabel}</span>
            )}
            <span>{text.length} 字符</span>
          </div>
        </div>

        <ControlBar
          sourceLang={sourceLang}
          targetLang={targetLang}
          onSourceChange={setSourceLang}
          onTargetChange={setTargetLang}
          onSwap={handleSwapLanguages}
          onTranslate={handleTranslate}
          size="sm"
          className="border-b rounded-none bg-background px-3 py-2"
        />

        <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-4 text-sm">
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
                className="text-sm"
              />
            ))
          ) : submittedText && activeServices.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              未启用任何翻译服务，请在“服务”设置中启用。
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
