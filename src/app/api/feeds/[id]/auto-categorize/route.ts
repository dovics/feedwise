import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { categorizeFeedById } from "@/lib/openai-categorizer";
import { logger } from "@/lib/logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.logApiRequestError('POST', '/api/feeds/[id]/auto-categorize', new Error('Unauthorized'), undefined, Date.now() - startTime);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;
    const { id: feedId } = await params;

    logger.logApiRequestStart('POST', `/api/feeds/${feedId}/auto-categorize`, userId);

    const tags = await categorizeFeedById(feedId);

    if (tags) {
      logger.logApiRequestSuccess('POST', `/api/feeds/${feedId}/auto-categorize`, userId, Date.now() - startTime, { feedId, tags });
      return NextResponse.json({
        success: true,
        tags,
        message: "标签已自动更新"
      });
    } else {
      logger.logApiRequestError('POST', `/api/feeds/${feedId}/auto-categorize`, new Error('OpenAI configuration not set or categorization failed'), userId, Date.now() - startTime);
      return NextResponse.json(
        { error: "自动分类失败：请检查 OpenAI 配置或稍后重试" },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.logApiRequestError('POST', '/api/feeds/[id]/auto-categorize', error as Error, userId, Date.now() - startTime);
    return NextResponse.json(
      { error: "自动分类失败：" + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}
