import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedTaxes() {

  const taxes = [
    {
      nominal: "0",
      notes: "Bebas Pajak",
      isActive: false,
    },
    {
      nominal: "11",
      notes: "PPN 11%",
      isActive: true, // Set PPN 11% sebagai aktif
    },
    {
      nominal: "12",
      notes: "PPN 12%",
      isActive: false,
    },
  ];

  try {
    // Delete existing taxes if any
    await prisma.taxs.deleteMany({});

    // Create new taxes
    for (const tax of taxes) {
      await prisma.taxs.create({
        data: tax,
      });
    }

  } catch (error) {
    console.error("❌ Error seeding taxes:", error);
    throw error;
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedTaxes()
    .catch(e => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
