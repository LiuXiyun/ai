import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.strategyAnalysis.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        keyword: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("Strategy history error:", e);
    return NextResponse.json(
      { error: "获取历史记录失败" },
      { status: 500 },
    );
  }
}
