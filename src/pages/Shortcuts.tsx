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

type ShortcutField = "main" | "inputTranslate" | "selectionTranslate";

export default function Shortcuts() {
  const {
    shortcut,
    setShortcut,
    inputTranslateShortcut,
    setInputTranslateShortcut,
    selectionTranslateShortcut,
    setSelectionTranslateShortcut,
  } = useSettingsStore();
  const [activeField, setActiveField] = useState<ShortcutField | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mainInputRef = useRef<HTMLInputElement>(null);
  const translateInputRef = useRef<HTMLInputElement>(null);
  const selectionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeField === "main" && mainInputRef.current) {
      mainInputRef.current.focus();
    } else if (activeField === "inputTranslate" && translateInputRef.current) {
      translateInputRef.current.focus();
    } else if (
      activeField === "selectionTranslate" &&
      selectionInputRef.current
    ) {
      selectionInputRef.current.focus();
    }
  }, [activeField]);

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: ShortcutField,
  ) => {
    if (activeField !== field) return;

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
        if (field === "main") {
          await setShortcut(newShortcut);
        } else if (field === "inputTranslate") {
          await setInputTranslateShortcut(newShortcut);
        } else {
          await setSelectionTranslateShortcut(newShortcut);
        }
        setActiveField(null);
        if (field === "main") mainInputRef.current?.blur();
        else if (field === "inputTranslate") translateInputRef.current?.blur();
        else selectionInputRef.current?.blur();
      } catch (err) {
        setError("设置失败：快捷键可能被占用或不支持");
      }
    }
  };

  const handleBlur = (field: ShortcutField) => {
    if (activeField === field) {
      setActiveField(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Main Shortcut */}
      <Item variant="outline" className="bg-muted/50">
        <ItemContent>
          <ItemTitle>呼出主窗口</ItemTitle>
          <Input
            ref={mainInputRef}
            id="shortcut-input-main"
            value={
              activeField === "main"
                ? "请按键盘设置快捷键..."
                : shortcut || "未设置"
            }
            readOnly
            className={`cursor-pointer my-2 ${activeField === "main" ? "border-primary ring-2 ring-primary/20" : ""}`}
            onClick={() => setActiveField("main")}
            onKeyDown={(e) => handleKeyDown(e, "main")}
            onBlur={() => handleBlur("main")}
          />
          {activeField === "main" && error && (
            <p className="text-sm text-destructive mt-1">{error}</p>
          )}
          <ItemDescription>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>点击输入框开始录制快捷键。支持组合键，如</span>
              <div className="flex gap-1">
                <Kbd>⌘</Kbd>
                <span>+</span>
                <Kbd>⇧</Kbd>
                <span>+</span>
                <Kbd>U</Kbd>
              </div>
            </div>
          </ItemDescription>
        </ItemContent>
      </Item>

      {/* Input Translate Shortcut */}
      <Item variant="outline" className="bg-muted/50">
        <ItemContent>
          <ItemTitle>输入翻译</ItemTitle>
          <Input
            ref={translateInputRef}
            id="shortcut-input-translate"
            value={
              activeField === "inputTranslate"
                ? "请按键盘设置快捷键..."
                : inputTranslateShortcut || "未设置"
            }
            readOnly
            className={`cursor-pointer my-2 ${activeField === "inputTranslate" ? "border-primary ring-2 ring-primary/20" : ""}`}
            onClick={() => setActiveField("inputTranslate")}
            onKeyDown={(e) => handleKeyDown(e, "inputTranslate")}
            onBlur={() => handleBlur("inputTranslate")}
          />
          {activeField === "inputTranslate" && error && (
            <p className="text-sm text-destructive mt-1">{error}</p>
          )}
          <ItemDescription>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>点击输入框开始录制快捷键。支持组合键，如</span>
              <div className="flex gap-1">
                <Kbd>⌃</Kbd>
                <span>+</span>
                <Kbd>A</Kbd>
              </div>
            </div>
          </ItemDescription>
        </ItemContent>
      </Item>
      {/* Selection Translate Shortcut */}
      <Item variant="outline" className="bg-muted/50">
        <ItemContent>
          <ItemTitle>划词翻译</ItemTitle>
          <Input
            ref={selectionInputRef}
            id="shortcut-input-selection"
            value={
              activeField === "selectionTranslate"
                ? "请按键盘设置快捷键..."
                : selectionTranslateShortcut || "未设置"
            }
            readOnly
            className={`cursor-pointer my-2 ${activeField === "selectionTranslate" ? "border-primary ring-2 ring-primary/20" : ""}`}
            onClick={() => setActiveField("selectionTranslate")}
            onKeyDown={(e) => handleKeyDown(e, "selectionTranslate")}
            onBlur={() => handleBlur("selectionTranslate")}
          />
          {activeField === "selectionTranslate" && error && (
            <p className="text-sm text-destructive mt-1">{error}</p>
          )}
          <ItemDescription>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>点击输入框开始录制快捷键。支持组合键，如</span>
              <div className="flex gap-1">
                <Kbd>⌃</Kbd>
                <span>+</span>
                <Kbd>S</Kbd>
              </div>
            </div>
          </ItemDescription>
        </ItemContent>
      </Item>
    </div>
  );
}
