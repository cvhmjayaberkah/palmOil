import { NextRequest, NextResponse } from "next/server";
import { createSalesTarget } from "@/lib/actions/sales-targets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await createSalesTarget(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("🔥 API: Error in POST handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
