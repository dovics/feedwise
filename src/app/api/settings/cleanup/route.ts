import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        itemRetentionDays: true,
        itemRetentionOnlyRead: true,
        lastItemCleanup: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      itemRetentionDays: user.itemRetentionDays,
      itemRetentionOnlyRead: user.itemRetentionOnlyRead,
      lastItemCleanup: user.lastItemCleanup
    });
  } catch (error) {
    console.error("Failed to fetch cleanup settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch cleanup settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { itemRetentionDays, itemRetentionOnlyRead } = body;

    // Validate itemRetentionDays
    if (typeof itemRetentionDays !== "number" || itemRetentionDays < -1) {
      return NextResponse.json(
        { error: "Invalid itemRetentionDays value. Must be -1 (disabled) or a positive number." },
        { status: 400 }
      );
    }

    // Validate itemRetentionOnlyRead
    if (typeof itemRetentionOnlyRead !== "boolean") {
      return NextResponse.json(
        { error: "Invalid itemRetentionOnlyRead value. Must be a boolean." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        itemRetentionDays,
        itemRetentionOnlyRead
      },
      select: {
        itemRetentionDays: true,
        itemRetentionOnlyRead: true,
        lastItemCleanup: true
      }
    });

    return NextResponse.json({
      itemRetentionDays: user.itemRetentionDays,
      itemRetentionOnlyRead: user.itemRetentionOnlyRead,
      lastItemCleanup: user.lastItemCleanup
    });
  } catch (error) {
    console.error("Failed to update cleanup settings:", error);
    return NextResponse.json(
      { error: "Failed to update cleanup settings" },
      { status: 500 }
    );
  }
}
