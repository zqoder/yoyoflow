import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";

interface ControlBarProps {
  sourceLang: string;
  targetLang: string;
  onSourceChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onSwap: () => void;
  onTranslate?: () => void;
  hideTranslateButton?: boolean;
  size?: "default" | "sm";
  className?: string;
}

export function ControlBar({
  sourceLang,
  targetLang,
  onSourceChange,
  onTargetChange,
  onSwap,
  onTranslate,
  hideTranslateButton = false,
  size = "default",
  className,
}: ControlBarProps) {
  const isSmall = size === "sm";

  return (
    <div
      className={`flex items-center justify-between rounded-lg bg-muted/30 ${isSmall ? "p-1" : "p-2"} ${className || ""}`}
    >
      <div className="flex items-center gap-2">
        <Select value={sourceLang} onValueChange={onSourceChange}>
          <SelectTrigger
            className={`${isSmall ? "w-[90px] h-7 text-xs px-2" : "w-[120px]"}`}
          >
            <SelectValue placeholder="选择语言" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem
                key={lang.value}
                value={lang.value}
                className={isSmall ? "text-xs py-1" : ""}
              >
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSwap}
          className={`rounded-full hover:bg-muted ${isSmall ? "h-6 w-6" : ""}`}
        >
          <ArrowRightLeft className={`${isSmall ? "h-3 w-3" : "h-4 w-4"}`} />
        </Button>

        <Select value={targetLang} onValueChange={onTargetChange}>
          <SelectTrigger
            className={`${isSmall ? "w-[90px] h-7 text-xs px-2" : "w-[120px]"}`}
          >
            <SelectValue placeholder="选择语言" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.filter((l) => l.value !== "auto").map((lang) => (
              <SelectItem
                key={lang.value}
                value={lang.value}
                className={isSmall ? "text-xs py-1" : ""}
              >
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hideTranslateButton && onTranslate && (
        <Button
          onClick={onTranslate}
          size={isSmall ? "sm" : "sm"}
          className={isSmall ? "h-7 text-xs px-2" : ""}
        >
          翻译(⏎)
        </Button>
      )}
    </div>
  );
}
