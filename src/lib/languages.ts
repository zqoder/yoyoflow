export const LANGUAGES = [
  { value: "auto", label: "自动检测" },
  { value: "zh", label: "中文", prompt: "Simplified Chinese" },
  { value: "en", label: "英语", prompt: "English" },
  { value: "ja", label: "日语", prompt: "Japanese" },
  { value: "ko", label: "韩语", prompt: "Korean" },
  { value: "fr", label: "法语", prompt: "French" },
  { value: "de", label: "德语", prompt: "German" },
  { value: "es", label: "西班牙语", prompt: "Spanish" },
  { value: "ru", label: "俄语", prompt: "Russian" },
];

export const detectLanguage = (text: string) => {
  if (!text.trim()) return "auto";
  const sample = text.slice(0, 50);
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) return "ja"; // Japanese Kana
  if (/[\uac00-\ud7af]/.test(sample)) return "ko"; // Korean Hangul
  if (/[\u0400-\u04FF]/.test(sample)) return "ru"; // Cyrillic
  if (/[\u4e00-\u9fa5]/.test(sample)) return "zh"; // Chinese Characters
  return "en"; // Default to English/Latin
};

export const getAutoTargetLanguage = (text: string) =>
  detectLanguage(text) === "zh" ? "en" : "zh";
