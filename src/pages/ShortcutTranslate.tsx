import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function ShortcutTranslate() {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Close window on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        getCurrentWindow().hide();
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
      inputRef.current?.select();
    });

    // Close window on blur
    // Using a small delay to prevent closing when switching focus within the window
    const unlistenBlur = getCurrentWindow().listen("tauri://blur", () => {
      // Check if the document still has focus (e.g. interacting with internal elements)
      // But since tauri://blur means the window lost focus, we should just hide it.
      // However, sometimes it triggers unexpectedly.
      // Let's try to verify if we really lost focus.
      getCurrentWindow().hide();
    });

    return () => {
      unlistenFocus.then((f) => f());
      unlistenBlur.then((f) => f());
    };
  }, []);

  return (
    <div className="h-screen w-full bg-transparent flex items-center justify-center p-2">
      <div className="w-full h-full bg-background text-foreground rounded-xl border shadow-xl flex flex-col overflow-hidden">
        {/* Header / Button Group */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b bg-muted/30"
          data-tauri-drag-region
        >
          <div className="flex items-center gap-2">
            {/* Placeholder for future buttons */}
            <span className="text-xs text-muted-foreground font-medium select-none">
              Shortcut Translate
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => getCurrentWindow().hide()}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-3 border-b flex-shrink-0">
          <Textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要翻译的文本..."
            className="min-h-[100px] resize-none border-none shadow-none focus-visible:ring-0 px-0 py-0 bg-transparent"
          />
        </div>
        <div className="flex-1 p-3 overflow-y-auto">
          {/* TODO: Display translation results here */}
        </div>
      </div>
    </div>
  );
}
