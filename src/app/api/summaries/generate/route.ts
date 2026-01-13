import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateDailySummary, createDailySummary, getTodaySummary, getUserSummaryLanguage } from "@/lib/summary-generator";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if summary already exists for today
    const existingSummary = await getTodaySummary(session.user.id);
    if (existingSummary) {
      return NextResponse.json({ summary: existingSummary });
    }

    // Get user's summary language preference
    const language = await getUserSummaryLanguage(session.user.id);

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check if there are any unread items in the last 24 hours
    const itemCount = await prisma.item.count({
      where: {
        read: false,
        pubDate: {
          gte: twentyFourHoursAgo
        },
        feed: {
          userId: session.user.id
        }
      }
    });

    if (itemCount === 0) {
      // No unread items, return null
      return NextResponse.json({ summary: null });
    }

    // Generate summary
    const result = await generateDailySummary(session.user.id, language);

    if (!result.success || !result.content) {
      // Failed to generate, return null (don't show error to user on auto-check)
      return NextResponse.json({ summary: null, error: result.error });
    }

    // Save to database with actual item count
    const summary = await createDailySummary(session.user.id, result.content, language, result.itemCount || itemCount);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Failed to check and generate summary:", error);
    // Return null on error (don't block user login)
    return NextResponse.json({ summary: null });
  }
}
