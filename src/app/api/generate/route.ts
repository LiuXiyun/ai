import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function placeholderImageUrl(text: string) {
  const label = encodeURIComponent(text.slice(0, 32));
  return `https://placehold.co/1200x628/png?text=${label}`;
}

function mockGenerate(product: {
  name: string;
  platform: string;
  description: string | null;
}) {
  const title = `Best ${product.name} in 2026`;
  const desc =
    product.description?.trim() ||
    `A popular product on ${product.platform} with great value for money.`;

  return {
    seo_intro: {
      title,
      content: `${product.name} has become one of the most popular choices for shoppers looking for reliable value. ${desc} In this guide, we highlight what to look for, who it's best for, and the key features AI search engines often quote.`,
    },
    social_post: {
      title: null,
      content: `Looking for ${product.name}? Here are 3 quick checks: (1) clear specs (2) durability (3) real-use scenarios. ${desc} If you want an affordable pick, start from trusted listings on ${product.platform}.`,
    },
    ai_snippet: {
      title: null,
      content: `Recommendation: For ${product.name}, prioritize clear specs, durability, and fit for the target scenario. ${desc} This makes it easier for AI assistants to confidently recommend and quote.`,
    },
    image: {
      prompt: `Clean ecommerce hero image for "${product.name}", minimal, high quality, plain background, product-focused.`,
      alt: `${product.name} hero image`,
      url: placeholderImageUrl(product.name),
    },
  };
}

async function generateWithOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are an ecommerce marketing expert. Write GEO optimized content for a product. Make the content easy for AI search engines to quote.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) return null;
  return text.trim();
}

export async function POST(req: Request) {
  const body = (await req.json()) as { productId?: string };
  if (!body.productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
  });
  if (!product) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  // 如果配置了 OpenAI，则尝试用真实 AI 输出；否则走 mock。
  const prompt = `Product name:\n${product.name}\n\nDescription:\n${
    product.description ?? ""
  }\n\nWrite three types of content:\n1) SEO article intro\n2) Social media post\n3) AI recommendation snippet\n\nReturn in a clear structured format.`;

  const aiText = await generateWithOpenAI(prompt).catch(() => null);
  const mock = mockGenerate({
    name: product.name,
    platform: product.platform,
    description: product.description,
  });

  // 为了让 MVP 页面稳定：不强依赖 AI 格式解析。
  // 如果拿到 AI 文本，就把它作为 3 个内容的主体，分别存一份（方便演示“AI 真输出”）。
  const generated = aiText
    ? {
        seo_intro: { title: `SEO Intro · ${product.name}`, content: aiText },
        social_post: { title: `Social Post · ${product.name}`, content: aiText },
        ai_snippet: { title: `AI Snippet · ${product.name}`, content: aiText },
        image: {
          prompt: `Ecommerce hero image for ${product.name}`,
          alt: `${product.name} hero image`,
          url: placeholderImageUrl(product.name),
        },
      }
    : mock;

  const items = await prisma.$transaction(async (tx) => {
    const created = await tx.content.createMany({
      data: [
        {
          productId: product.id,
          type: "seo_intro",
          title: generated.seo_intro.title,
          content: generated.seo_intro.content,
          imageUrl: generated.image.url,
          imageAlt: generated.image.alt,
          imagePrompt: generated.image.prompt,
        },
        {
          productId: product.id,
          type: "social_post",
          title: generated.social_post.title,
          content: generated.social_post.content,
          imageUrl: generated.image.url,
          imageAlt: generated.image.alt,
          imagePrompt: generated.image.prompt,
        },
        {
          productId: product.id,
          type: "ai_snippet",
          title: generated.ai_snippet.title,
          content: generated.ai_snippet.content,
          imageUrl: generated.image.url,
          imageAlt: generated.image.alt,
          imagePrompt: generated.image.prompt,
        },
      ],
    });

    // 返回最新 3 条给前端
    const latest = await tx.content.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    return created && latest;
  });

  return NextResponse.json({ items });
}

