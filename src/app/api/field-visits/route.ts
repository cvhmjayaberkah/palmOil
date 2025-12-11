import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const {
      salesId,
      customerId,
      storeName,
      storeAddress,
      storePhone,
      storeCity,
      visitPurpose,
      notes,
      latitude,
      longitude,
      // photos, // COMMENTED OUT: Fitur foto dinonaktifkan sementara
    } = data;

    // DUMMY PHOTO: Menggunakan gambar default karena fitur upload foto dinonaktifkan sementara
    const photos = ["/logocv.png"];

    // Validate required fields (GPS sekarang opsional)
    if (
      !salesId ||
      (!customerId && !storeName) ||
      !visitPurpose
      // GPS opsional - tidak perlu validasi latitude/longitude
      // !latitude ||
      // !longitude
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Additional validation for new customers
    if (!customerId && storeName) {
      if (!storeAddress || !storePhone || !storeCity) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Nama, alamat, nomor telepon, dan kota wajib diisi untuk toko baru",
          },
          { status: 400 }
        );
      }
    }

    let finalCustomerId: string = customerId || "";

    // If storeName is provided instead of customerId, create new customer
    if (!customerId && storeName) {
      // Create new customer (treated as "toko")
      const newCustomer = await db.customers.create({
        data: {
          name: storeName,
          address:
            storeAddress?.trim() ||
            `Alamat belum diverifikasi (${new Date().toLocaleDateString()})`,
          phone: storePhone?.trim() || null,
          city: storeCity?.trim() || "Kota belum diverifikasi",
          code: `CUST-${Date.now()}`,
          latitude: latitude || null, // GPS opsional
          longitude: longitude || null, // GPS opsional
        },
      });
      finalCustomerId = newCustomer.id;
    }

    // Create field visit
    const fieldVisit = await db.fieldVisit.create({
      data: {
        salesId: salesId,
        customerId: finalCustomerId,
        storeId: null,
        visitPurpose: visitPurpose,
        notes: notes || null,
        latitude: latitude || 0, // GPS opsional, default 0
        longitude: longitude || 0, // GPS opsional, default 0
        photos: photos || [],
        checkInTime: new Date(),
        visitDate: new Date(),
      },
      include: {
        sales: true,
        customer: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: fieldVisit,
      customerCreated: !customerId && storeName ? true : false,
      message:
        !customerId && storeName
          ? "Check-in berhasil disimpan! Toko baru telah ditambahkan ke database."
          : "Check-in berhasil disimpan ke database!",
    });
  } catch (error) {
    console.error("Error creating field visit:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const salesId = url.searchParams.get("salesId");

    const fieldVisits = await db.fieldVisit.findMany({
      where: salesId ? { salesId } : {},
      include: {
        sales: {
          select: {
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: fieldVisits,
    });
  } catch (error) {
    console.error("Error fetching field visits:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        data: [],
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const visitId = url.searchParams.get("visitId");
    const deleteAll = url.searchParams.get("deleteAll") === "true";

    if (deleteAll) {
      // Delete all visits
      const visits = await db.fieldVisit.findMany({
        select: { photos: true },
      });

      await db.fieldVisit.deleteMany({});

      // Delete all photos from filesystem
      const fs = require("fs").promises;
      const path = require("path");

      for (const visit of visits) {
        if (visit.photos && visit.photos.length > 0) {
          for (const photoUrl of visit.photos) {
            try {
              const filename = photoUrl.split("/").pop();
              if (filename) {
                const filePath = path.join(
                  process.cwd(),
                  "public",
                  "uploads",
                  filename
                );
                await fs.unlink(filePath);
              }
            } catch (fileError) {
              console.warn(
                `Failed to delete photo file: ${photoUrl}`,
                fileError
              );
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "All visits and photos deleted successfully",
      });
    } else if (visitId) {
      // Delete single visit
      const visit = await db.fieldVisit.findUnique({
        where: { id: visitId },
        select: { photos: true },
      });

      if (!visit) {
        return NextResponse.json(
          {
            success: false,
            error: "Visit not found",
          },
          { status: 404 }
        );
      }

      await db.fieldVisit.delete({
        where: { id: visitId },
      });

      // Delete photos from filesystem
      if (visit.photos && visit.photos.length > 0) {
        const fs = require("fs").promises;
        const path = require("path");

        for (const photoUrl of visit.photos) {
          try {
            const filename = photoUrl.split("/").pop();
            if (filename) {
              const filePath = path.join(
                process.cwd(),
                "public",
                "uploads",
                filename
              );
              await fs.unlink(filePath);
            }
          } catch (fileError) {
            console.warn(`Failed to delete photo file: ${photoUrl}`, fileError);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Visit and photos deleted successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Missing visitId or deleteAll parameter",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error deleting field visit(s):", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete visit(s)",
      },
      { status: 500 }
    );
  }
}
