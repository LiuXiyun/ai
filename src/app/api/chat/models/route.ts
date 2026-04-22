import { NextResponse } from "next/server";

type Cache = { expiresAt: number; items: string[] };

function isTextModel(id: string) {
  // 只保留“文本对话/推理/代码”相关，排除图片/音频/实时/嵌入/审核/视频等
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

  // 允许的文本家族（尽量覆盖你 key 下的文本模型）
  if (id.startsWith("gpt-")) return true;
  if (id === "o1" || id.startsWith("o1-")) return true;
  if (id === "o3" || id.startsWith("o3-")) return true;
  if (id === "o4-mini" || id.startsWith("o4-mini-")) return true;

  // 传统文本模型（可选）
  if (id === "davinci-002" || id === "babbage-002") return true;

  return false;
}

async function fetchModels(apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const items = (json?.data ?? [])
    .map((m: any) => String(m?.id ?? ""))
    .filter((id: string) => id && isTextModel(id))
    .sort((a: string, b: string) => a.localeCompare(b));
  return items as string[];
}

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "未配置 OPENAI_API_KEY（请在 .env 里填写）" },
      { status: 400 },
    );
  }

  const g = globalThis as unknown as { __chatModelsCache?: Cache };
  const now = Date.now();
  const cached = g.__chatModelsCache;
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({ items: cached.items, cached: true });
  }

  const items = await fetchModels(apiKey);
  if (!items) {
    return NextResponse.json({ error: "获取模型列表失败" }, { status: 502 });
  }

  g.__chatModelsCache = {
    items,
    expiresAt: now + 10 * 60 * 1000, // 10 分钟缓存
  };

  return NextResponse.json({ items, cached: false });
}

