import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, attendanceLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 });
    }

    const userList = await db.select().from(users).where(eq(users.id, userId));
    if (userList.length === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const user = userList[0];
    const logs = await db
      .select()
      .from(attendanceLogs)
      .where(eq(attendanceLogs.userId, userId))
      .orderBy(desc(attendanceLogs.timestamp))
      .limit(20);

    return NextResponse.json({
      success: true,
      user,
      recentLogs: logs,
    });
  } catch (error: unknown) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 });
    }

    const body = await req.json();
    const { name, role, department, shiftStart, shiftEnd, photoUrl, faceEmbedding, isActive, phone } = body;

    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (department !== undefined) updates.department = department;
    if (shiftStart !== undefined) updates.shiftStart = shiftStart;
    if (shiftEnd !== undefined) updates.shiftEnd = shiftEnd;
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;
    if (faceEmbedding !== undefined) updates.faceEmbedding = faceEmbedding;
    if (isActive !== undefined) updates.isActive = isActive;
    if (phone !== undefined) updates.phone = phone;

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Employee profile updated successfully",
    });
  } catch (error: unknown) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 });
    }

    await db.delete(attendanceLogs).where(eq(attendanceLogs.userId, userId));
    const [deleted] = await db.delete(users).where(eq(users.id, userId)).returning();

    if (!deleted) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Employee ${deleted.name} removed successfully`,
    });
  } catch (error: unknown) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: 500 }
    );
  }
}
