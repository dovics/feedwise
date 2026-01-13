import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTodaySummary } from "@/lib/summary-generator";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await getTodaySummary(session.user.id);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Failed to fetch today's summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch today's summary" },
      { status: 500 }
    );
  }
}
