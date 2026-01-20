import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let userId: string | undefined;
  const { id: itemId } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.logApiRequestError('PATCH', `/api/items/${itemId}/read`, new Error('Unauthorized'), undefined, Date.now() - startTime);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;
    logger.logApiRequestStart('PATCH', `/api/items/${itemId}/read`, userId);

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { feed: true }
    });

    if (!item) {
      logger.warn('Item not found for read status update', { userId, itemId });
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.feed.userId !== session.user.id) {
      logger.warn('Unauthorized attempt to update item read status', { userId, itemId, feedUserId: item.feed.userId });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { read } = body;

    if (typeof read !== "boolean") {
      logger.warn('Invalid read status value', { userId, itemId, read });
      return NextResponse.json(
        { error: "Invalid read status" },
        { status: 400 }
      );
    }

    logger.info('Updating item read status', { userId, itemId, read });

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { read }
    });

    logger.logApiRequestSuccess('PATCH', `/api/items/${itemId}/read`, userId, Date.now() - startTime, { read, itemTitle: updatedItem.title });
    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    logger.logApiRequestError('PATCH', `/api/items/${itemId}/read`, error as Error, userId, Date.now() - startTime);
    return NextResponse.json(
      { error: "Failed to update read status" },
      { status: 500 }
    );
  }
}
