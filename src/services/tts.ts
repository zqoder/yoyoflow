import { api } from "@/lib/api";

/**
 * 将文本转换为语音并返回 Blob URL
 * @param text 要朗读的文本
 * @returns 音频 Blob URL
 */
export async function speakText(text: string): Promise<string> {
  const response = await api.get("https://dict.youdao.com/dictvoice", {
    searchParams: {
      audio: text,
      type: 2,
    },
    timeout: 60000,
    useBackend: true,
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
