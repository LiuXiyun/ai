import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json(
      { error: "productId is required" },
      { status: 400 },
    );
  }

  const items = await prisma.post.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

