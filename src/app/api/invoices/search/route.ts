// app/api/invoices/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAvailableInvoices } from "@/lib/actions/swaps";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    const invoices = await getAvailableInvoices(query || undefined);

    return NextResponse.json({
      success: true,
      data: invoices,
    });
  } catch (error: any) {
    console.error("Error in search invoices API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mencari invoice",
      },
      { status: 500 }
    );
  }
}
