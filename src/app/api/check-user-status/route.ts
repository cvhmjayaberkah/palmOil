import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ isActive: false, message: "Not authenticated" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: { isActive: true }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ isActive: false, message: "Account deactivated" }, { status: 403 });
    }

    return NextResponse.json({ isActive: true });
  } catch (error) {
    console.error("Error checking user status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
