import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDailySummary, createDailySummary, getTodaySummary, getUserSummaryLanguage } from "@/lib/summary-generator";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body to check if force regeneration is requested
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const providedContent = body.content;
    const providedItemCount = body.itemCount;

    // Check if summary already exists for today
    const existingSummary = await getTodaySummary(session.user.id);

    if (existingSummary && !force && !providedContent) {
      return NextResponse.json({ summary: existingSummary });
    }

    // Get user's summary language preference
    const language = await getUserSummaryLanguage(session.user.id);

    let content: string;
    let itemCount: number;

    // If content is provided (from streaming endpoint), use it directly
    if (providedContent) {
      content = providedContent;
      itemCount = providedItemCount || 0;
    } else {
      // Otherwise, generate summary
      const result = await generateDailySummary(session.user.id, language);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error || "Failed to generate summary",
            summary: null
          },
          { status: 200 } // Return 200 instead of 500 to allow UI to display the error message
        );
      }

      content = result.content!;
      itemCount = result.itemCount || 0;
    }

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
    console.error("Failed to generate summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
