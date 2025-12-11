import { PrismaClient } from "@prisma/client";
import { v4 as uuid } from "uuid";

export async function seedCustomers(prisma: PrismaClient) {
  const customersToCreate = [
    {
      id: uuid(),
      code: "CUST001",
      name: "Pelanggan Jaya Abadi",
      email: "customer1@example.com",
      phone: "+6281211112222",
      address: "Jl. Merdeka No. 10, Bandung",
      city: "Bandung",
      latitude: -6.9175,
      longitude: 107.6191,
      creditLimit: 5000000,
      updatedAt: new Date(),
    },
    {
      id: uuid(),
      code: "CUST002",
      name: "Toko Maju Mundur",
      email: "customer2@example.com",
      phone: "+6281233334444",
      address: "Jl. Pahlawan No. 25, Surabaya",
      city: "Surabaya",
      latitude: -7.2575,
      longitude: 112.7521,
      creditLimit: 3000000,
      updatedAt: new Date(),
    },
    {
      id: uuid(),
      code: "CUST003",
      name: "Warung Sejahtera",
      email: "customer3@example.com",
      phone: "+6281255556666",
      address: "Jl. Sudirman No. 50, Yogyakarta",
      city: "Yogyakarta",
      latitude: -7.7956,
      longitude: 110.3695,
      creditLimit: 2000000,
      updatedAt: new Date(),
    },
    {
      id: uuid(),
      code: "CUST004",
      name: "Toko Modern Sejati",
      email: "customer4@example.com",
      phone: "+6281277778888",
      address: "Jl. Asia Afrika No. 75, Jakarta",
      city: "Jakarta",
      latitude: -6.2088,
      longitude: 106.8456,
      creditLimit: 7500000,
      updatedAt: new Date(),
    },
  ];

  for (const customerData of customersToCreate) {
    await prisma.customers.create({ data: customerData });
  }
  return prisma.customers.findMany();
}
