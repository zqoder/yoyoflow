import { useHistoryStore } from "@/store/history";
import { useShallow } from "zustand/shallow";
import { Button } from "@/components/ui/button";
import { History, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/date";

export default function HistoryPage() {
  const { entries, clearHistory } = useHistoryStore(useShallow((state) => ({
    entries: state.entries,
    clearHistory: state.clearHistory,
  })));
  const [showConfirm, setShowConfirm] = useState(false);

  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  const handleClear = async () => {
    await clearHistory();
    setShowConfirm(false);
  };

  if (sorted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <History className="h-12 w-12" />
        <p className="text-sm">暂无历史记录</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">历史记录</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            共 {entries.length} 条
          </span>
          {!showConfirm ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              清空
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">确认清空？</span>
              <Button
                variant="destructive"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={handleClear}
              >
                确认
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setShowConfirm(false)}
              >
                取消
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto">
        {sorted.map((entry) => {
          const translationPreview = entry.translationResult?.translation
            ? entry.translationResult.translation.length > 30
              ? entry.translationResult.translation.slice(0, 30) + "..."
              : entry.translationResult.translation
            : null;

          return (
            <div
              key={entry.id}
              className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium truncate">
                    {entry.text}
                  </span>
                  {translationPreview && (
                    <>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ·
                      </span>
                      <span className="text-sm text-muted-foreground truncate">
                        {translationPreview}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {entry.sourceLangLabel} → {entry.targetLangLabel}
                  </span>
                  <span>·</span>
                  <span>{entry.serviceName}</span>
                  <span>·</span>
                  <span>{formatDate(entry.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
