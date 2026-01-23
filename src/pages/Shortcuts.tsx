import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { useSettingsStore } from "@/store/settings";

export default function Shortcuts() {
  const { shortcut, setShortcut } = useSettingsStore();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRecording && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRecording]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecording) return;
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    const modifiers: string[] = [];
    if (e.metaKey) modifiers.push("Command");
    if (e.ctrlKey) modifiers.push("Control");
    if (e.altKey) modifiers.push("Alt");
    if (e.shiftKey) modifiers.push("Shift");

    // If the key itself is a modifier, don't add it as the main key
    const isModifier = ["Meta", "Control", "Alt", "Shift"].includes(e.key);

    if (!isModifier) {
      let keyName = e.code;
      if (keyName.startsWith("Key")) keyName = keyName.slice(3);
      else if (keyName.startsWith("Digit")) keyName = keyName.slice(5);
      else if (keyName.startsWith("Arrow")) keyName = keyName.slice(5);

      const newShortcut = [...modifiers, keyName].join("+");

      try {
        await setShortcut(newShortcut);
        setIsRecording(false);
        inputRef.current?.blur();
      } catch (err) {
        setError("设置失败：快捷键可能被占用或不支持");
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Item variant="outline" className="bg-muted">
        <ItemContent>
          <ItemTitle>呼出主窗口</ItemTitle>
          <Input
            ref={inputRef}
            id="shortcut-input"
            value={isRecording ? "请按键盘设置快捷键..." : shortcut || "未设置"}
            readOnly
            className={`cursor-pointer my-2 ${isRecording ? "border-primary ring-2 ring-primary/20" : ""}`}
            onClick={() => setIsRecording(true)}
            onKeyDown={handleKeyDown}
            onBlur={() => setIsRecording(false)}
          />
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          <ItemDescription>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>点击输入框开始录制快捷键。支持组合键，如</span>
              <div className="flex gap-1">
                <Kbd>Command</Kbd>
                <span>+</span>
                <Kbd>Shift</Kbd>
                <span>+</span>
                <Kbd>U</Kbd>
              </div>
            </div>
          </ItemDescription>
        </ItemContent>
      </Item>
    </div>
  );
}
