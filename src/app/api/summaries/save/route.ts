import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDailySummary, getTodaySummary, getUserSummaryLanguage } from "@/lib/summary-generator";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const content = body.content;
    const itemCount = body.itemCount || 0;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Check if summary already exists for today
    const existingSummary = await getTodaySummary(session.user.id);

    // Get user's summary language preference
    const language = await getUserSummaryLanguage(session.user.id);

    let summary;

    if (existingSummary && force) {
      // Update existing summary
      summary = await prisma.dailySummary.update({
        where: {
          userId_date: {
            userId: session.user.id,
            date: existingSummary.date
          }
        },
        data: {
          content: content,
          language: language
        }
      });
    } else {
      // Create new summary
      summary = await createDailySummary(session.user.id, content, language, itemCount);
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Failed to save summary:", error);
    return NextResponse.json(
      { error: "Failed to save summary" },
      { status: 500 }
    );
  }
}
