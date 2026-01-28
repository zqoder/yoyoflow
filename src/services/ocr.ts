import { api } from "@/lib/api";
import { ServiceConfig } from "@/store/services";

export interface OcrCallbacks {
  onSuccess: (text: string) => void;
  onError: (error: Error) => void;
}

export async function extractTextFromImage(
  service: ServiceConfig,
  imageBase64: string,
  callbacks: OcrCallbacks,
) {
  const { onSuccess, onError } = callbacks;

  try {
    if (service.id === "siliconflow_ocr") {
      const response = await api.post(
        "https://api.siliconflow.cn/v1/chat/completions",
        {
          headers: {
            Authorization: `Bearer ${service.apiKey}`,
          },
          json: {
            model: service.model,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Please extract all text from this image exactly as it appears. 
Rules:
1. Output ONLY the extracted text.
2. Do not add any explanations, prefixes, or suffixes.
3. Preserve the original line breaks and layout as much as possible.
4. If there is no text, output nothing.`,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageBase64,
                    },
                  },
                ],
              },
            ],
            stream: false,
            max_tokens: 2048,
          },
          timeout: 60000,
        },
      );

      const data = await response.json<any>();
      const content = data.choices?.[0]?.message?.content || "";
      onSuccess(content.trim());
    } else {
      // Mock or other services
      setTimeout(() => {
        onSuccess("[OCR Mock Result] Sample Text From Image");
      }, 3000);
    }
  } catch (err) {
    console.error("OCR Error:", err);
    onError(err instanceof Error ? err : new Error("OCR Failed"));
  }
}
