import { useHistoryStore } from "@/store/history";
import { useShallow } from "zustand/shallow";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const { entries, clearHistory } = useHistoryStore(useShallow((state) => ({
    entries: state.entries,
    clearHistory: state.clearHistory,
  })));
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClear = async () => {
    await clearHistory();
    setShowConfirm(false);
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">通用设置</h2>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">历史记录</span>
            <span className="text-xs text-muted-foreground">
              已存储 {entries.length} 条
            </span>
          </div>
          {!showConfirm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              清除
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">确认清除？</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClear}
              >
                确认
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(false)}
              >
                取消
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
