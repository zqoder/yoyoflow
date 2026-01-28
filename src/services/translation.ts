import { api } from "@/lib/api";
import { ServiceConfig } from "@/store/services";

export interface TranslationCallbacks {
  onUpdate: (text: string) => void;
  onError: (error: Error) => void;
  onComplete?: () => void;
}

export interface TranslateParams {
  service: ServiceConfig;
  text: string;
  sourceLangLabel: string;
  targetLangLabel: string;
  signal?: AbortSignal;
}

export type StreamParserType = "openai" | "anthropic" | "mixed";

async function handleStreamResponse(
  response: Response,
  parserType: StreamParserType,
  onUpdate: (text: string) => void,
  onComplete?: () => void,
) {
  if (!response.body) throw new Error("No response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data:")) {
          const dataStr = line.slice(5).trim();
          if (!dataStr || dataStr === "[DONE]") continue;

          try {
            const data = JSON.parse(dataStr);

            if (parserType === "mixed" || parserType === "anthropic") {
              // Handle Anthropic-style stream events
              switch (data.type) {
                case "message_start":
                case "message_delta":
                case "message_stop":
                case "ping":
                  // Ignore these events
                  break;

                case "content_block_start":
                  if (data.content_block?.text) {
                    onUpdate(data.content_block.text);
                  }
                  break;

                case "content_block_delta":
                  if (data.delta?.type === "text_delta" && data.delta?.text) {
                    onUpdate(data.delta.text);
                  }
                  break;

                default:
                  // For mixed type, fall through to OpenAI check
                  if (parserType === "mixed") {
                    if (data.choices?.[0]?.delta?.content) {
                      onUpdate(data.choices[0].delta.content);
                    }
                  }
                  break;
              }
            } else if (parserType === "openai") {
              if (data.choices?.[0]?.delta?.content) {
                onUpdate(data.choices[0].delta.content);
              }
            }
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }
    }
  } finally {
    onComplete?.();
  }
}

export async function translateText(
  params: TranslateParams,
  callbacks: TranslationCallbacks,
) {
  const { service, text, sourceLangLabel, targetLangLabel, signal } = params;
  const { onUpdate, onError, onComplete } = callbacks;

  try {
    if (service.id === "siliconflow") {
      const response = await api.post(
        "https://api.siliconflow.cn/v1/messages",
        {
          headers: {
            Authorization: `Bearer ${service.apiKey}`,
          },
          json: {
            model: service.model,
            messages: [
              {
                role: "system",
                content: `You are a professional multilingual translation engine. translate the text from ${sourceLangLabel} to ${targetLangLabel}.
RULES:
1. Only output the translated text, without any explanations, greetings, or extra text.
2. Preserve the original tone and format.
3. If encountering camelCase or snake_case words, translate each part separately.
4. If encountering unknown words, keep them as-is.
5. For single words: provide translation, phonetics, definitions grouped by part of speech, and example sentences.  
6. For sentences/phrases:  provide translation only.
7. All responses must be in Simplified ${targetLangLabel} language.
8. For English, Use American phonetics for phonetic symbols. 
9. For Chinese, Use standard Pinyin for phonetic symbols (with tone marks) 
10. For other languages, use their native phonetic systems for phonetic symbols
11. Consider context when analyzing words.  
12. Output raw JSON without markdown code blocks. 
13. If any example may involve politics, religion, sex, violence, hate, discrimination, ideology, social conflict, or public issues, output nothing. No substitution. No explanation. No expansion. 
14. SINGLE WORD OUTPUT: {"phonetic": "/həˈləʊ/", "definitions": [{"pos": "excl.", "meaning": "${targetLangLabel} translation for current pos", "example": {"source": "Hello, how are you today?", "target": "${targetLangLabel} example"}}],  "translation": "translation in ${targetLangLabel}",  "contextual_analysis": "contextual analysis use ${targetLangLabel} language"}
15. SENTENCE/PHRASE OUTPUT: {"translation": "translation in ${targetLangLabel}"}`,
              },
              {
                role: "user",
                content: text,
              },
            ],
            stream: true,
          },
          timeout: 60000,
          signal,
        },
      );

      await handleStreamResponse(response, "mixed", onUpdate, onComplete);
    } else if (service.id === "glm") {
      const response = await api.post(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        {
          headers: {
            Authorization: `Bearer ${service.apiKey}`,
            "Content-Type": "application/json",
          },
          json: {
            model: service.model, // e.g. "general_translation"
            messages: [
              {
                role: "system",
                content: `# Role Definition 
You are a professional multilingual translation engine that can translate the provided text into ${targetLangLabel}.
# Core Capabilities
1. Input Type Recognition: 
- Single word: Provide dictionary functions (phonetic symbols, part of speech, definitions, example sentences) 
- Phrase/Sentence: Return translation only
2. Context Analysis: 
【Current Context】: ""
# Translation Rules 
1. For word input: 
- Return complete dictionary information 
- Group definitions by part of speech (keep concise, must use Simplified ${targetLangLabel}) 
- Provide contextual analysis - Include natural context examples
2. For phrase/sentence input: 
- Return translation only 
- No additional information allowed 
3. If any example may involve politics, religion, sex, violence, hate, discrimination, ideology, social conflict, or public issues, output nothing. No substitution. No explanation. No expansion.
4. Format Specifications: 
- Strictly follow example JSON structure 
- No Markdown code blocks 
- Use American phonetic symbols for English© words (maintain original system for other languages) 
# Language System Rules
- The output must be entirely in the target language ${targetLangLabel}
- Accurately identify the source language
- For Source language is English, use American phonetic symbols for phonetic symbols
- For Source language is Chinese, Use standard Pinyin for phonetic symbols (with tone marks)
- For other languages, use their native phonetic systems for phonetic symbols
- DO NOT using languages other than those requested
# Output Examples 
【Word Example】: {"phonetic": "/həˈləʊ/", "definitions": [{"pos": "adj.", "meaning": "hello", example": {"source": "Hello, how are you", "target": "你好啊，最近怎么样"}}],  "translation": "你好",  "contextual_analysis": "Analysis of the word's meaning within the provided context"}
【Sentence Example】: {"translation": "This is a test sentence."}
# Strict Prohibitions 
- Mixed output formats
- Missing required fields
- Unrequested additional information- Language system mixing`,
              },
              {
                role: "user",
                content: `Translate the following text into ${targetLangLabel}: ${text}`,
              },
            ],
            stream: true,
            response_format: {
              type: "json_object",
            },
          },
          timeout: 60000,
          signal,
        },
      );

      await handleStreamResponse(response, "openai", onUpdate, onComplete);
    } else {
      // Mock for other services
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!signal?.aborted) {
        onUpdate(
          JSON.stringify({
            translation: `[${service.name}] ${text}`,
          }),
        );
        onComplete?.();
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }
    onError(err instanceof Error ? err : new Error("Unknown error"));
  }
}
