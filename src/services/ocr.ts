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
      const isPaddleOcr = service.model.startsWith(
        "PaddlePaddle/PaddleOCR-VL",
      );
      const prompt = isPaddleOcr
        ? "OCR:"
        : `Extract all text from this image exactly as it appears.

Rules:
1. Output only the extracted text.
2. Do not add explanations, prefixes, or suffixes.
3. Preserve the original line breaks and layout as much as possible.
4. If there is no text, output nothing.`;

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
                    type: "image_url",
                    image_url: {
                      url: imageBase64,
                      detail: "high",
                    },
                  },
                  {
                    type: "text",
                    text: prompt,
                  },
                ],
              },
            ],
            stream: false,
            temperature: 0,
            max_tokens: 4096,
          },
          timeout: 60000,
        },
      );

      const data = await response.json<{
        choices?: Array<{
          finish_reason?: string;
          message?: { content?: string };
        }>;
      }>();
      const choice = data.choices?.[0];
      const content = choice?.message?.content?.trim() ?? "";

      if (choice?.finish_reason === "length") {
        throw new Error("OCR 输出过长，识别结果被模型截断，请缩小截图范围");
      }
      if (!content) {
        throw new Error("OCR 模型未返回可识别文本");
      }

      onSuccess(content);
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
