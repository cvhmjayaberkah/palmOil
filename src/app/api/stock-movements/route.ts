// app/api/stock-movements/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build where condition based on filters
    let whereCondition: any = {};
    
    if (startDate || endDate) {
      whereCondition.movementDate = {};
      
      if (startDate) {
        whereCondition.movementDate.gte = new Date(startDate);
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // Include full end date
        whereCondition.movementDate.lte = endDateTime;
      }
    } else {
      // Default to last 30 days if no filter specified
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      whereCondition.movementDate = {
        gte: thirtyDaysAgo,
      };
    }
    
    const stockMovements = await db.stockMovements.findMany({
      where: whereCondition,
      include: {
        products: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: true,
            currentStock: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        movementDate: "asc", // Order chronologically for proper calculation
      },
    });

    return NextResponse.json(stockMovements);
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 }
    );
  }
}
