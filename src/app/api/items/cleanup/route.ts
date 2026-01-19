import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's cleanup settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        itemRetentionDays: true,
        itemRetentionOnlyRead: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if cleanup is disabled (-1 means disabled)
    if (user.itemRetentionDays === -1) {
      return NextResponse.json(
        { error: "Item cleanup is disabled" },
        { status: 400 }
      );
    }

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - user.itemRetentionDays);

    // Build the where clause
    const whereClause: any = {
      feed: {
        userId: session.user.id
      },
      createdAt: {
        lt: cutoffDate
      }
    };

    // Only clean up read items if setting is enabled
    if (user.itemRetentionOnlyRead) {
      whereClause.read = true;
    }

    // Count items to be deleted
    const itemCount = await prisma.item.count({
      where: whereClause
    });

    if (itemCount === 0) {
      // Update last cleanup time even if nothing was deleted
      await prisma.user.update({
        where: { id: session.user.id },
        data: { lastItemCleanup: new Date() }
      });

      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: "No items to clean up"
      });
    }

    // Delete old items
    const deleteResult = await prisma.item.deleteMany({
      where: whereClause
    });

    // Update last cleanup time
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastItemCleanup: new Date() }
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      message: `Successfully deleted ${deleteResult.count} items older than ${user.itemRetentionDays} days`
    });
  } catch (error) {
    console.error("Failed to cleanup items:", error);
    return NextResponse.json(
      { error: "Failed to cleanup items" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's cleanup settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        itemRetentionDays: true,
        itemRetentionOnlyRead: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If cleanup is disabled, return 0
    if (user.itemRetentionDays === -1) {
      return NextResponse.json({
        eligibleCount: 0,
        message: "Item cleanup is disabled"
      });
    }

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - user.itemRetentionDays);

    // Build the where clause
    const whereClause: any = {
      feed: {
        userId: session.user.id
      },
      createdAt: {
        lt: cutoffDate
      }
    };

    // Only count read items if setting is enabled
    if (user.itemRetentionOnlyRead) {
      whereClause.read = true;
    }

    // Count eligible items
    const eligibleCount = await prisma.item.count({
      where: whereClause
    });

    return NextResponse.json({
      eligibleCount,
      cutoffDate: cutoffDate.toISOString(),
      message: `${eligibleCount} items eligible for cleanup`
    });
  } catch (error) {
    console.error("Failed to get cleanup status:", error);
    return NextResponse.json(
      { error: "Failed to get cleanup status" },
      { status: 500 }
    );
  }
}
