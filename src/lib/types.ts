export interface WordDefinition {
  pos: string;
  meaning: string;
  example: {
    source: string;
    target: string;
  };
}

export interface TranslationResult {
  phonetic?: string;
  definitions?: WordDefinition[];
  translation: string;
  contextual_analysis?: string;
}

export interface VocabularyEntry {
  id: string;
  text: string;
  translation: string;
  phonetic?: string;
  definitions?: WordDefinition[];
  contextual_analysis?: string;
  sourceLang: string;
  sourceLangLabel: string;
  targetLang: string;
  targetLangLabel: string;
  serviceName: string;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  text: string;
  translationResult?: TranslationResult;
  sourceLang: string;
  sourceLangLabel: string;
  targetLang: string;
  targetLangLabel: string;
  serviceName: string;
  createdAt: number;
}
