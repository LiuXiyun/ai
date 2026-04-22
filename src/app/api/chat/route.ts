import { NextResponse } from "next/server";

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

async function chatWithOpenAI(input: string, model: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false as const,
      status: 400,
      error: "未配置 OPENAI_API_KEY（请在 .env 里填写）",
    };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildChatBody(model, input)),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false as const,
      status: res.status,
      error: text || "调用 OpenAI 失败",
    };
  }

  const json = (await res.json()) as any;
  const output = json?.choices?.[0]?.message?.content;
  if (typeof output !== "string" || !output.trim()) {
    return {
      ok: false as const,
      status: 502,
      error: "模型未返回有效文本",
    };
  }

  return { ok: true as const, output: output.trim() };
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

  const result = await chatWithOpenAI(input, model);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ output: result.output });
}

