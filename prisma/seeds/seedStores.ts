import { PrismaClient } from "@prisma/client";
import { v4 as uuid } from "uuid";

export async function seedStores(prisma: PrismaClient) {
  const storesToCreate = [
    {
      id: uuid(),
      name: "Toko Sinar Jaya",
      address: "Jl. Raya Jakarta No. 123, Jakarta",
      phone: "+62211234567",
      latitude: -6.2088,
      longitude: 106.8456,
      updatedAt: new Date(),
    },
    {
      id: uuid(),
      name: "Warung Berkah",
      address: "Jl. Sudirman No. 45, Jakarta",
      phone: "+62212345678",
      latitude: -6.2146,
      longitude: 106.8451,
      updatedAt: new Date(),
    },
    {
      id: uuid(),
      name: "Toko Makmur",
      address: "Jl. Thamrin No. 78, Jakarta",
      phone: "+62213456789",
      latitude: -6.1944,
      longitude: 106.8229,
      updatedAt: new Date(),
    },
  ];

  for (const storeData of storesToCreate) {
    await prisma.store.create({ data: storeData });
  }

}
