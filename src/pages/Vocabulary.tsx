import { useState } from "react";
import { useShallow } from "zustand/shallow";
import { useVocabularyStore } from "@/store/vocabulary";
import { Button } from "@/components/ui/button";
import { Star, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/date";

export default function Vocabulary() {
  const { entries, removeEntry } = useVocabularyStore(useShallow((state) => ({
    entries: state.entries,
    removeEntry: state.removeEntry,
  })));

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRemove = (id: string) => {
    removeEntry(id);
    setConfirmRemoveId(null);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  if (sorted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <BookOpen className="h-12 w-12" />
        <p className="text-sm">生词本为空</p>
        <p className="text-xs">在翻译结果中点击收藏按钮即可添加</p>
      </div>
    );
  }

  const isWord = (entry: (typeof sorted)[0]) =>
    entry.definitions && entry.definitions.length > 0;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">生词本</h2>
        <span className="text-xs text-muted-foreground">
          共 {entries.length} 条
        </span>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto">
        {sorted.map((entry) => {
          const expanded = expandedIds.has(entry.id);
          const confirming = confirmRemoveId === entry.id;

          return (
            <div
              key={entry.id}
              className="rounded-lg border bg-card text-sm"
            >
              <button
                type="button"
                className="w-full p-3 flex items-center justify-between gap-2 text-left hover:bg-muted/30 rounded-lg transition-colors"
                onClick={() => toggleExpand(entry.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-base truncate">
                      {entry.text}
                    </span>
                    {isWord(entry) && entry.phonetic && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.phonetic}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{entry.sourceLangLabel} → {entry.targetLangLabel}</span>
                    <span>·</span>
                    <span>{entry.serviceName}</span>
                    <span>·</span>
                    <span>{formatDate(entry.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {confirming ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">确认取消？</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleRemove(entry.id)}
                      >
                        确认
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setConfirmRemoveId(null)}
                      >
                        取消
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmRemoveId(entry.id);
                        }}
                        title="取消收藏"
                      >
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      </Button>
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </>
                  )}
                </div>
              </button>

              {expanded && (
                <div className="px-3 pb-3 border-t">
                  {isWord(entry) && entry.definitions && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {entry.definitions.map((def, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <div className="flex gap-2">
                            <span className="font-semibold italic text-muted-foreground min-w-[3em]">
                              {def.pos}
                            </span>
                            <span>{def.meaning}</span>
                          </div>
                          {def.example && (
                            <div className="pl-[calc(3em+0.5rem)] text-xs text-muted-foreground flex flex-col gap-0.5">
                              <span>{def.example.source}</span>
                              <span>{def.example.target}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isWord(entry) && (
                    <p className="mt-2 text-muted-foreground">
                      译文：{entry.translation}
                    </p>
                  )}

                  {isWord(entry) && entry.contextual_analysis && (
                    <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                      <span className="font-semibold">语境：</span>
                      {entry.contextual_analysis}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
