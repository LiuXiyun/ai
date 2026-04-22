import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    platform?: string;
    url?: string;
    description?: string;
    category?: string;
    price?: number;
  };

  if (!body.name || !body.platform) {
    return NextResponse.json(
      { error: "name and platform are required" },
      { status: 400 },
    );
  }

  const item = await prisma.product.create({
    data: {
      name: body.name,
      platform: body.platform,
      url: body.url || null,
      description: body.description || null,
      category: body.category || null,
      price: typeof body.price === "number" ? body.price : null,
    },
  });

  return NextResponse.json({ item });
}

