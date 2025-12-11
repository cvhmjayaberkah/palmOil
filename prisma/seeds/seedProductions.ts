import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedProductions() {

  try {
    // Get some products for production
    const products = await prisma.products.findMany({
      take: 5,
      select: { id: true, name: true, code: true },
    });

    if (products.length === 0) {
      return;
    }

    // Get a user for production
    const user = await prisma.users.findFirst({
      where: { role: { in: ["OWNER", "WAREHOUSE", "ADMIN"] } },
    });

    if (!user) {
      return;
    }

    // Create dummy productions for different months
    const productions = [
      // January 2025
      {
        code: "PRD/01/2025/001",
        productionDate: new Date("2025-01-05"),
        notes: "Produksi awal tahun",
        producedById: user.id,
        items: [
          {
            productId: products[0].id,
            quantity: 600, // 25 crates × 24 bottles
            salaryPerBottle: 450,
            notes: "Target awal tahun",
          },
        ],
      },
      {
        code: "PRD/01/2025/002",
        productionDate: new Date("2025-01-15"),
        notes: "Produksi tengah bulan Januari",
        producedById: user.id,
        items: [
          {
            productId: products[1].id,
            quantity: 480, // 20 crates × 24 bottles
            salaryPerBottle: 500,
            notes: "Batch reguler",
          },
          {
            productId: products[2].id,
            quantity: 360, // 15 crates × 24 bottles
            salaryPerBottle: 550,
            notes: "Produk premium",
          },
        ],
      },
      {
        code: "PRD/01/2025/003",
        productionDate: new Date("2025-01-28"),
        notes: "Produksi akhir Januari",
        producedById: user.id,
        items: [
          {
            productId: products[3].id,
            quantity: 720, // 30 crates × 24 bottles
            salaryPerBottle: 475,
            notes: "Persiapan Februari",
          },
        ],
      },

      // February 2025
      {
        code: "PRD/02/2025/001",
        productionDate: new Date("2025-02-03"),
        notes: "Produksi awal Februari",
        producedById: user.id,
        items: [
          {
            productId: products[0].id,
            quantity: 840, // 35 crates × 24 bottles
            salaryPerBottle: 480,
            notes: "Boost produksi",
          },
        ],
      },
      {
        code: "PRD/02/2025/002",
        productionDate: new Date("2025-02-14"),
        notes: "Produksi Valentine",
        producedById: user.id,
        items: [
          {
            productId: products[4].id,
            quantity: 480, // 20 crates × 24 bottles
            salaryPerBottle: 600,
            notes: "Edisi spesial Valentine",
          },
          {
            productId: products[1].id,
            quantity: 360, // 15 crates × 24 bottles
            salaryPerBottle: 520,
            notes: "Varian reguler",
          },
        ],
      },

      // March 2025
      {
        code: "PRD/03/2025/001",
        productionDate: new Date("2025-03-10"),
        notes: "Produksi musim panas",
        producedById: user.id,
        items: [
          {
            productId: products[2].id,
            quantity: 960, // 40 crates × 24 bottles
            salaryPerBottle: 525,
            notes: "Persiapan musim panas",
          },
        ],
      },
      {
        code: "PRD/03/2025/003",
        productionDate: new Date("2025-03-25"),
        notes: "Produksi akhir kuartal 1",
        producedById: user.id,
        items: [
          {
            productId: products[0].id,
            quantity: 600, // 25 crates × 24 bottles
            salaryPerBottle: 500,
            notes: "Target kuartal",
          },
          {
            productId: products[3].id,
            quantity: 480, // 20 crates × 24 bottles
            salaryPerBottle: 575,
            notes: "Stok cadangan",
          },
        ],
      },

      // April 2025
      {
        code: "PRD/04/2025/001",
        productionDate: new Date("2025-04-08"),
        notes: "Produksi awal kuartal 2",
        producedById: user.id,
        items: [
          {
            productId: products[1].id,
            quantity: 720, // 30 crates × 24 bottles
            salaryPerBottle: 510,
            notes: "Fresh start Q2",
          },
        ],
      },
      {
        code: "PRD/04/2025/002",
        productionDate: new Date("2025-04-22"),
        notes: "Produksi Earth Day",
        producedById: user.id,
        items: [
          {
            productId: products[4].id,
            quantity: 480, // 20 crates × 24 bottles
            salaryPerBottle: 580,
            notes: "Edisi ramah lingkungan",
          },
          {
            productId: products[2].id,
            quantity: 360, // 15 crates × 24 bottles
            salaryPerBottle: 540,
            notes: "Kemasan eco-friendly",
          },
        ],
      },

      // May 2025
      {
        code: "PRD/05/2025/001",
        productionDate: new Date("2025-05-01"),
        notes: "Produksi May Day",
        producedById: user.id,
        items: [
          {
            productId: products[0].id,
            quantity: 1200, // 50 crates × 24 bottles
            salaryPerBottle: 520,
            notes: "Libur nasional boost",
          },
        ],
      },
      {
        code: "PRD/05/2025/002",
        productionDate: new Date("2025-05-17"),
        notes: "Produksi tengah Mei",
        producedById: user.id,
        items: [
          {
            productId: products[3].id,
            quantity: 840, // 35 crates × 24 bottles
            salaryPerBottle: 495,
            notes: "Steady production",
          },
        ],
      },

      // June 2025
      {
        code: "PRD/06/2025/001",
        productionDate: new Date("2025-06-05"),
        notes: "Produksi musim liburan",
        producedById: user.id,
        items: [
          {
            productId: products[1].id,
            quantity: 960, // 40 crates × 24 bottles
            salaryPerBottle: 530,
            notes: "Persiapan liburan sekolah",
          },
          {
            productId: products[4].id,
            quantity: 480, // 20 crates × 24 bottles
            salaryPerBottle: 590,
            notes: "Varian premium liburan",
          },
        ],
      },
      {
        code: "PRD/06/2025/002",
        productionDate: new Date("2025-06-28"),
        notes: "Produksi akhir semester",
        producedById: user.id,
        items: [
          {
            productId: products[2].id,
            quantity: 720, // 30 crates × 24 bottles
            salaryPerBottle: 515,
            notes: "Closing semester",
          },
        ],
      },

      // July 2025
      {
        code: "PRD/07/2025/001",
        productionDate: new Date("2025-07-12"),
        notes: "Produksi peak summer",
        producedById: user.id,
        items: [
          {
            productId: products[0].id,
            quantity: 1440, // 60 crates × 24 bottles
            salaryPerBottle: 540,
            notes: "Peak summer demand",
          },
        ],
      },
      {
        code: "PRD/07/2025/002",
        productionDate: new Date("2025-07-25"),
        notes: "Produksi akhir Juli",
        producedById: user.id,
        items: [
          {
            productId: products[3].id,
            quantity: 600, // 25 crates × 24 bottles
            salaryPerBottle: 525,
            notes: "Persiapan Agustus",
          },
          {
            productId: products[1].id,
            quantity: 480, // 20 crates × 24 bottles
            salaryPerBottle: 505,
            notes: "Stok reguler",
          },
        ],
      },

      // August 2025 (current month - existing data)
      {
        code: "PRD/08/2025/001",
        productionDate: new Date("2025-08-15"),
        notes: "Produksi rutin mingguan",
        producedById: user.id,
        items: [
          {
            productId: products[0].id,
            quantity: 480, // 20 crates × 24 bottles
            salaryPerBottle: 500,
            notes: "Produksi normal",
          },
          {
            productId: products[1].id,
            quantity: 240, // 10 crates × 24 bottles
            salaryPerBottle: 600,
            notes: "Produksi tambahan",
          },
        ],
      },
      {
        code: "PRD/08/2025/002",
        productionDate: new Date("2025-08-16"),
        notes: "Produksi untuk order khusus",
        producedById: user.id,
        items: [
          {
            productId: products[1].id,
            quantity: 720, // 30 crates × 24 bottles
            salaryPerBottle: 550,
            notes: "Order besar",
          },
        ],
      },
      {
        code: "PRD/08/2025/003",
        productionDate: new Date("2025-08-18"),
        notes: "Produksi weekend",
        producedById: user.id,
        items: [
          {
            productId: products[2].id,
            quantity: 360, // 15 crates × 24 bottles
            salaryPerBottle: 450,
            notes: "Produksi akhir pekan",
          },
          {
            productId: products[3].id,
            quantity: 600, // 25 crates × 24 bottles
            salaryPerBottle: 700,
            notes: "Varian premium",
          },
        ],
      },
      {
        code: "PRD/08/2025/004",
        productionDate: new Date("2025-08-20"),
        notes: "Produksi reguler",
        producedById: user.id,
        items: [
          {
            productId: products[0].id,
            quantity: 1200, // 50 crates × 24 bottles
            salaryPerBottle: 500,
            notes: "Batch besar",
          },
        ],
      },
      {
        code: "PRD/08/2025/005",
        productionDate: new Date("2025-08-21"),
        notes: "Produksi menjelang akhir bulan",
        producedById: user.id,
        items: [
          {
            productId: products[4].id,
            quantity: 480, // 20 crates × 24 bottles
            salaryPerBottle: 550,
            notes: "Target bulanan",
          },
          {
            productId: products[1].id,
            quantity: 240, // 10 crates × 24 bottles
            salaryPerBottle: 600,
            notes: "Stok tambahan",
          },
        ],
      },
      {
        code: "PRD/08/2025/006",
        productionDate: new Date("2025-08-22"),
        notes: "Produksi hari ini",
        producedById: user.id,
        items: [
          {
            productId: products[2].id,
            quantity: 960, // 40 crates × 24 bottles
            salaryPerBottle: 480,
            notes: "Produksi harian",
          },
        ],
      },
    ];

    // Create productions with items
    for (const productionData of productions) {
      const { items, ...production } = productionData;

      const createdProduction = await prisma.productions.create({
        data: {
          ...production,
          items: {
            create: items.map((item) => ({
              ...item,
              notes: item.notes || "",
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Update product stock and create stock movements
      for (const item of createdProduction.items) {
        // Get current product stock
        const product = await prisma.products.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
        });

        const previousStock = product?.currentStock || 0;
        const newStock = previousStock + item.quantity;

        // Update product stock
        await prisma.products.update({
          where: { id: item.productId },
          data: {
            currentStock: newStock,
          },
        });

        // Create stock movement
        await prisma.stockMovements.create({
          data: {
            productId: item.productId,
            userId: production.producedById,
            type: "PRODUCTION_IN",
            quantity: item.quantity,
            previousStock: previousStock,
            newStock: newStock,
            reference: `Produksi ${createdProduction.code}`,
            notes: `Produksi item: ${item.notes}`,
            productionItemsId: item.id,
          },
        });
      }
    }
  } catch (error) {
    console.error("❌ Error seeding productions:", error);
    throw error;
  }
}

export default seedProductions;
