
export const LANGUAGES = [
  { value: "auto", label: "自动检测" },
  { value: "zh", label: "中文" },
  { value: "en", label: "英语" },
  { value: "ja", label: "日语" },
  { value: "ko", label: "韩语" },
  { value: "fr", label: "法语" },
  { value: "de", label: "德语" },
  { value: "es", label: "西班牙语" },
  { value: "ru", label: "俄语" },
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
