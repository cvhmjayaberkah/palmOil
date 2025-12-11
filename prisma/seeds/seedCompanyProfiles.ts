import { PrismaClient } from "@prisma/client";

export async function seedCompanyProfiles(prisma: PrismaClient) {

  try {
    // Check if company profile already exists
    const existingProfile = await prisma.companyProfiles.findFirst();

    if (existingProfile) {
      return [existingProfile];
    }

    // Create default company profile
    const companyProfile = await prisma.companyProfiles.create({
      data: {
        code: "001",
        name: "CV. HM Jaya Berkah",
        address:
          "Jl. Raya Dumajah Timur Kec. Tanah Merah Kab. Bangkalan Jawa Timur",
        city: "Bangkalan",
        phone: "087753833139",
        owner: "LAILATUL QAMARIYAH",
        bankAccountNumber: "1855999911",
        bankAccountNumber2: "1234567890",
        accountType1: "BCA",
        accountType2: "BRI",
        accountHolderName1: "LAILATUL QAMARIYAH",
        accountHolderName2: "LAILATUL QAMARIYAH",
        isActive: true,
      },
    });

    return [companyProfile];
  } catch (error) {
    console.error("❌ Error seeding company profiles:", error);
    throw error;
  }
}
