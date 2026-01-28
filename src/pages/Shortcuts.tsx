import { useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { useSettingsStore } from "@/store/settings";
import { ShortcutInput } from "@/components/ShortcutInput";

type ShortcutField =
  | "main"
  | "inputTranslate"
  | "selectionTranslate"
  | "screenshotTranslate";

export default function Shortcuts() {
  const {
    shortcut,
    setShortcut,
    inputTranslateShortcut,
    setInputTranslateShortcut,
    selectionTranslateShortcut,
    setSelectionTranslateShortcut,
    screenshotTranslateShortcut,
    setScreenshotTranslateShortcut,
  } = useSettingsStore();
  const [activeField, setActiveField] = useState<ShortcutField | null>(null);

  const renderDescription = (keys: string[]) => (
    <div className="text-sm text-muted-foreground flex items-center gap-2">
      <span>点击输入框开始录制快捷键。支持组合键，如</span>
      <div className="flex gap-1">
        {keys.map((key, index) => (
          <div key={key} className="flex items-center gap-1">
            <Kbd>{key}</Kbd>
            {index < keys.length - 1 && <span>+</span>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Main Shortcut */}
      <ShortcutInput
        title="呼出主窗口"
        value={shortcut}
        onChange={setShortcut}
        isActive={activeField === "main"}
        onActivate={() => setActiveField("main")}
        onDeactivate={() => setActiveField(null)}
        description={renderDescription(["⌘", "⇧", "U"])}
      />

      {/* Input Translate Shortcut */}
      <ShortcutInput
        title="输入翻译"
        value={inputTranslateShortcut}
        onChange={setInputTranslateShortcut}
        isActive={activeField === "inputTranslate"}
        onActivate={() => setActiveField("inputTranslate")}
        onDeactivate={() => setActiveField(null)}
        description={renderDescription(["⌃", "A"])}
      />

      {/* Screenshot Translate Shortcut */}
      <ShortcutInput
        title="截图翻译"
        value={screenshotTranslateShortcut}
        onChange={setScreenshotTranslateShortcut}
        isActive={activeField === "screenshotTranslate"}
        onActivate={() => setActiveField("screenshotTranslate")}
        onDeactivate={() => setActiveField(null)}
        description={renderDescription(["⌃", "S"])}
      />

      {/* Selection Translate Shortcut */}
      <ShortcutInput
        title="划词翻译"
        value={selectionTranslateShortcut}
        onChange={setSelectionTranslateShortcut}
        isActive={activeField === "selectionTranslate"}
        onActivate={() => setActiveField("selectionTranslate")}
        onDeactivate={() => setActiveField(null)}
        description={renderDescription(["⌃", "D"])}
      />
    </div>
  );
}

