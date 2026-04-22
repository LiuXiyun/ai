import { NextResponse } from "next/server";

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function isTextModel(id: string) {
  const deny = [
    "image",
    "dall-e",
    "sora",
    "audio",
    "realtime",
    "transcribe",
    "tts",
    "embedding",
    "moderation",
    "whisper",
  ];
  if (deny.some((k) => id.includes(k))) return false;
  if (id.startsWith("gpt-")) return true;
  if (id === "o1" || id.startsWith("o1-")) return true;
  if (id === "o3" || id.startsWith("o3-")) return true;
  if (id === "o4-mini" || id.startsWith("o4-mini-")) return true;
  if (id === "davinci-002" || id === "babbage-002") return true;
  return false;
}

function buildChatBody(model: string, input: string) {
  const base: any = {
    model,
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "你是一个耐心的中文助手。请用简体中文回答，尽量清晰、短句、易理解。",
      },
      { role: "user", content: input },
    ],
  };

  // 部分模型（如 gpt-5-mini 系列）不支持自定义 temperature，只能用默认值
  if (!model.startsWith("gpt-5-mini")) {
    base.temperature = 0;
  }

  return base;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    input?: unknown;
    model?: unknown;
  };
  const input = typeof body.input === "string" ? body.input.trim() : "";
  if (!input) {
    return NextResponse.json({ error: "input 不能为空" }, { status: 400 });
  }

  const modelRaw = typeof body.model === "string" ? body.model.trim() : "";
  const model = modelRaw || "gpt-4.1-mini";
  if (!isTextModel(model)) {
    return NextResponse.json(
      { error: "model 不支持（仅允许文本相关模型）" },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "未配置 OPENAI_API_KEY（请在 .env 里填写）" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sse(event, data)));
      };

      send("status", { phase: "queued", message: "已提交，准备连接模型…" });

      try {
        const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(buildChatBody(model, input)),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          send("error", {
            message: text || `上游请求失败（${upstream.status}）`,
          });
          controller.close();
          return;
        }

        send("status", { phase: "streaming", message: "已连接，开始接收输出…" });

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // OpenAI stream is SSE-like: lines start with "data: ..."
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part
              .split("\n")
              .find((l) => l.startsWith("data: ")) ?? "";
            if (!line) continue;

            const data = line.slice("data: ".length).trim();
            if (data === "[DONE]") {
              send("done", { message: "完成" });
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(data) as any;
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length) {
                send("token", { text: delta });
              }
            } catch {
              // ignore malformed chunk
            }
          }
        }

        send("done", { message: "完成" });
        controller.close();
      } catch (e) {
        send("error", { message: e instanceof Error ? e.message : "未知错误" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

