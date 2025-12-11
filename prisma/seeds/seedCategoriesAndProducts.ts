import { PrismaClient } from "@prisma/client";
import { v4 as uuid } from "uuid";

export async function seedCategoriesAndProducts(prisma: PrismaClient) {
  // Get active tax
  const activeTax = await prisma.taxs.findFirst({
    where: { isActive: true },
  });

  if (!activeTax) {
    throw new Error("No active tax found. Please seed taxes first.");
  }

  const taxRate = parseFloat(activeTax.nominal) / 100; // Convert percentage to decimal

  const oilCategory = await prisma.categories.create({
    data: {
      id: uuid(),
      code: "KTG/04/2025/0001",
      name: "Minyak",
      description: "Berbagai jenis minyak goreng",
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const productsToCreate = [
    {
      id: uuid(),
      code: "PDK/04/2025/0001",
      name: "Minyak Indana 250 ml",
      description: "Minyak goreng Indana kemasan 250ml",
      unit: "Krat",
      price: 60000, // Rp 5,000 per botol x 12 botol = Rp 60,000 per krat
      cost: 54000, // Cost margin ~90%
      sellingPrice: Math.round(60000 * (1 + taxRate)), // Auto-calculate with tax
      minStock: 20,
      currentStock: 100,
      bottlesPerCrate: 12, // 12 botol per krat untuk ukuran di bawah 800ml
      salaryPerBottle: 100, // Rp 100 per botol
      categoryId: oilCategory.id,
      taxId: activeTax.id, // Link to active tax
      updatedAt: new Date(),
    },
    {
      id: uuid(),
      code: "PDK/04/2025/0002",
      name: "Minyak Indana 500 ml",
      description: "Minyak goreng Indana kemasan 500ml",
      unit: "Krat",
      price: 120000, // Rp 10,000 per botol x 12 botol = Rp 120,000 per krat
      cost: 108000, // Cost margin ~90%
      sellingPrice: Math.round(120000 * (1 + taxRate)), // Auto-calculate with tax
      minStock: 20,
      currentStock: 100,
      bottlesPerCrate: 12, // 12 botol per krat untuk ukuran di bawah 800ml
      salaryPerBottle: 150, // Rp 150 per botol
      categoryId: oilCategory.id,
      taxId: activeTax.id, // Link to active tax
      updatedAt: new Date(),
    },
    {
      id: uuid(),
      code: "PDK/04/2025/0003",
      name: "Minyak Indana 800 ml",
      description: "Minyak goreng Indana kemasan 800ml",
      unit: "Krat",
      price: 384000, // Rp 16,000 per botol x 24 botol = Rp 384,000 per krat
      cost: 345600, // Cost margin ~90%
      sellingPrice: Math.round(384000 * (1 + taxRate)), // Auto-calculate with tax
      minStock: 15,
      currentStock: 100,
      bottlesPerCrate: 24, // 24 botol per krat untuk ukuran 800ml ke atas
      salaryPerBottle: 200, // Rp 200 per botol
      categoryId: oilCategory.id,
      taxId: activeTax.id, // Link to active tax
      updatedAt: new Date(),
    },
    {
      id: uuid(),
      code: "PDK/04/2025/0004",
      name: "Minyak Indana 900 ml",
      description: "Minyak goreng Indana kemasan 900ml",
      unit: "Krat",
      price: 432000, // Rp 18,000 per botol x 24 botol = Rp 432,000 per krat
      cost: 388800, // Cost margin ~90%
      sellingPrice: Math.round(432000 * (1 + taxRate)), // Auto-calculate with tax
      minStock: 15,
      currentStock: 100,
      bottlesPerCrate: 24, // 24 botol per krat untuk ukuran 800ml ke atas
      salaryPerBottle: 250, // Rp 250 per botol
      categoryId: oilCategory.id,
      taxId: activeTax.id, // Link to active tax
      updatedAt: new Date(),
    },
    {
      id: uuid(),
      code: "PDK/04/2025/0005",
      name: "Minyak Indana 1 Liter",
      description: "Minyak goreng Indana kemasan 1 Liter",
      unit: "Krat",
      price: 480000, // Rp 20,000 per botol x 24 botol = Rp 480,000 per krat
      cost: 432000, // Cost margin ~90%
      sellingPrice: Math.round(480000 * (1 + taxRate)), // Auto-calculate with tax
      minStock: 15,
      currentStock: 100,
      bottlesPerCrate: 24, // 24 botol per krat untuk ukuran 800ml ke atas
      salaryPerBottle: 300, // Rp 300 per botol
      categoryId: oilCategory.id,
      taxId: activeTax.id, // Link to active tax
      updatedAt: new Date(),
    },
    {
      id: uuid(),
      code: "PDK/04/2025/0006",
      name: "Minyak Kita 1 Liter",
      description: "Minyak goreng Kita kemasan 1 Liter - brand alternatif",
      unit: "Krat",
      price: 432000, // Rp 18,000 per botol x 24 botol = Rp 432,000 per krat (lebih murah dari Indana)
      cost: 388800, // Cost margin ~90%
      sellingPrice: Math.round(432000 * (1 + taxRate)), // Auto-calculate with tax
      minStock: 15,
      currentStock: 100,
      bottlesPerCrate: 24, // 24 botol per krat untuk ukuran 800ml ke atas
      salaryPerBottle: 250, // Rp 250 per botol
      categoryId: oilCategory.id,
      taxId: activeTax.id, // Link to active tax
      updatedAt: new Date(),
    },
  ];

  for (const productData of productsToCreate) {
    await prisma.products.create({ data: productData });
  }

  return prisma.products.findMany();
}
