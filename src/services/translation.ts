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
  let buffer = "";

  const processLine = (line: string) => {
    if (!line.startsWith("data:")) return;

    const dataStr = line.slice(5).trim();
    if (!dataStr || dataStr === "[DONE]") return;

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
            if (parserType === "mixed" && data.choices?.[0]?.delta?.content) {
              onUpdate(data.choices[0].delta.content);
            }
            break;
        }
      } else if (parserType === "openai") {
        if (data.choices?.[0]?.delta?.content) {
          onUpdate(data.choices[0].delta.content);
        }
      }
    } catch {
      // Ignore malformed server events, but never partial network chunks.
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      lines.forEach(processLine);
    }

    buffer += decoder.decode();
    if (buffer) processLine(buffer);
  } finally {
    onComplete?.();
  }
}

function getCustomServiceEndpoint(service: ServiceConfig) {
  const rawBaseUrl = service.baseUrl?.trim();
  if (!rawBaseUrl) throw new Error("请填写 API 地址");

  const url = new URL(rawBaseUrl);
  const isLoopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(
    url.hostname,
  );
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error("远程服务必须使用 HTTPS，HTTP 仅允许本机地址");
  }

  const normalized = rawBaseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

function getCustomServiceHeaders(service: ServiceConfig) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (service.apiKey.trim()) {
    headers.Authorization = `Bearer ${service.apiKey.trim()}`;
  }
  return headers;
}

function buildCustomTranslationPrompt(
  sourceLangLabel: string,
  targetLangLabel: string,
) {
  return `You are a professional translation engine. Translate from ${sourceLangLabel} to ${targetLangLabel}.
Return raw JSON only, without markdown.
For a phrase or sentence return: {"translation":"..."}.
For a single word return: {"translation":"...","phonetic":"...","definitions":[{"pos":"...","meaning":"...","example":{"source":"...","target":"..."}}],"contextual_analysis":"..."}.
When either side is English, phonetic must be the American English IPA of the English word: for Chinese-to-English use the English translation, and for English-to-Chinese use the English source word. Never return Chinese Pinyin for Chinese-English translation.`;
}

async function translateWithCustomService(
  params: TranslateParams,
  callbacks: TranslationCallbacks,
) {
  const { service, text, sourceLangLabel, targetLangLabel, signal } = params;
  const { onUpdate, onComplete } = callbacks;
  const stream = service.stream ?? true;
  const response = await api.post(getCustomServiceEndpoint(service), {
    headers: getCustomServiceHeaders(service),
    json: {
      model: service.model,
      messages: [
        {
          role: "system",
          content: buildCustomTranslationPrompt(
            sourceLangLabel,
            targetLangLabel,
          ),
        },
        { role: "user", content: text },
      ],
      stream,
      temperature: 0.2,
    },
    timeout: service.timeoutMs ?? 60000,
    signal,
    useBackend: true,
  });

  if (stream) {
    await handleStreamResponse(response, "openai", onUpdate, onComplete);
    return;
  }

  const data = await response.json<{
    choices?: Array<{ message?: { content?: string } }>;
  }>();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("自定义服务未返回有效内容");
  onUpdate(content);
  onComplete?.();
}

export async function testCustomTranslationService(service: ServiceConfig) {
  const response = await api.post(getCustomServiceEndpoint(service), {
    headers: getCustomServiceHeaders(service),
    json: {
      model: service.model,
      messages: [
        {
          role: "user",
          content:
            'Translate "hello" to Chinese. Return only JSON: {"translation":"..."}',
        },
      ],
      stream: false,
      temperature: 0,
      max_tokens: 64,
    },
    timeout: Math.min(service.timeoutMs ?? 30000, 30000),
    useBackend: true,
  });
  const data = await response.json<{
    choices?: Array<{ message?: { content?: string } }>;
  }>();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("连接成功，但服务未返回测试内容");
  return content;
}

export async function translateText(
  params: TranslateParams,
  callbacks: TranslationCallbacks,
) {
  const { service, text, sourceLangLabel, targetLangLabel, signal } = params;
  const { onUpdate, onError, onComplete } = callbacks;

  try {
    if (service.kind === "custom" && service.protocol === "openai-chat") {
      await translateWithCustomService(params, callbacks);
    } else if (service.id === "siliconflow") {
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
8. When either side of a single-word translation is English, phonetic MUST be the American English IPA of the English word.
9. For Chinese-to-English, phonetic describes the English translation; for English-to-Chinese, phonetic describes the English source word.
10. Never output Chinese Pinyin when translating between Chinese and English. For pairs without English, use the source language's native phonetic system.
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
    } else if (service.id === "deepseek") {
      const response = await api.post(
        "https://api.deepseek.com/chat/completions",
        {
          headers: {
            Authorization: `Bearer ${service.apiKey}`,
            "Content-Type": "application/json",
          },
          json: {
            model: service.model,
            messages: [
              {
                role: "system",
                content: `You are a professional multilingual translation engine. Translate the text from ${sourceLangLabel} to ${targetLangLabel}.

# Output Rules
1. For a single word: output a JSON object with phonetic, definitions (grouped by part of speech with examples), translation, and contextual_analysis.
2. For a phrase or sentence: output a JSON object with only the translation field.
3. Output raw JSON without markdown code blocks. No extra text.

# Language Rules
- When either side of a single-word translation is English, phonetic MUST be the American English IPA of the English word.
- Chinese-to-English: phonetic describes the English translation. English-to-Chinese: phonetic describes the English source word.
- Never output Chinese Pinyin for Chinese-English translations. For pairs without English, use the source language's native phonetic system.

# Output Format
Word: {"phonetic": "/həˈləʊ/", "definitions": [{"pos": "excl.", "meaning": "translation in ${targetLangLabel}", "example": {"source": "Hello, how are you?", "target": "example in ${targetLangLabel}"}}], "translation": "translation in ${targetLangLabel}", "contextual_analysis": "analysis in ${targetLangLabel}"}
Phrase/Sentence: {"translation": "translation in ${targetLangLabel}"}`,
              },
              {
                role: "user",
                content: text,
              },
            ],
            stream: true,
            response_format: { type: "json_object" },
          },
          timeout: 60000,
          signal,
        },
      );

      await handleStreamResponse(response, "openai", onUpdate, onComplete);
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
- For translations involving English, phonetic must represent the English word in American IPA.
# Language System Rules
- The output must be entirely in the target language ${targetLangLabel}
- Accurately identify the source language
- When either side of a single-word translation is English, phonetic MUST be the American English IPA of the English word
- Chinese-to-English: phonetic describes the English translation; English-to-Chinese: phonetic describes the English source word
- Never output Chinese Pinyin for Chinese-English translations; for pairs without English, use the source language's native phonetic system
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
