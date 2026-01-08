import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const markAllReadSchema = z.object({
  feedId: z.string().optional(),
  tag: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { feedId, tag } = markAllReadSchema.parse(body);

    const where: any = {
      feed: {
        userId: session.user.id
      },
      read: false
    };

    if (feedId) {
      where.feed.id = feedId;
    }

    if (tag) {
      where.feed.tags = {
        has: tag
      };
    }

    const result = await prisma.item.updateMany({
      where,
      data: {
        read: true
      }
    });

    return NextResponse.json({
      count: result.count,
      message: `已将 ${result.count} 篇文章标记为已读`
    });
  } catch (error) {
    console.error("Mark all as read error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "无效的输入数据" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "批量标记已读失败：" + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}
