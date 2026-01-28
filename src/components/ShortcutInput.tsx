import { useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";

interface ShortcutInputProps {
  title: string;
  value: string | null;
  onChange: (newValue: string) => Promise<void>;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  description?: React.ReactNode;
}

export function ShortcutInput({
  title,
  value,
  onChange,
  isActive,
  onActivate,
  onDeactivate,
  description,
}: ShortcutInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isActive) return;

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
        await onChange(newShortcut);
        onDeactivate();
        inputRef.current?.blur();
      } catch (err) {
        setError("设置失败：快捷键可能被占用或不支持");
      }
    }
  };

  const handleBlur = () => {
    onDeactivate();
  };

  return (
    <Item variant="outline" className="bg-muted/50">
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <Input
          ref={inputRef}
          value={isActive ? "请按键盘设置快捷键..." : value || "未设置"}
          readOnly
          className={`cursor-pointer my-2 ${isActive ? "border-primary ring-2 ring-primary/20" : ""}`}
          onClick={onActivate}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        {isActive && error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}
        {description && <ItemDescription>{description}</ItemDescription>}
      </ItemContent>
    </Item>
  );
}
