import { PrismaClient } from "@prisma/client";
import { v4 as uuid } from "uuid";

export async function seedUsers(prisma: PrismaClient) {
  const usersToCreate = [
    {
      id: "owner123",
      email: "owner@indana.com",
      name: "Owner User",
      password: "password123",
      role: "OWNER" as const,
      phone: "+62812345678",
      address: "Jakarta",
      isActive: true,
      updatedAt: new Date(),
    },
    {
      id: "admin123",
      email: "admin@indana.com",
      name: "Admin User",
      password: "password123",
      role: "ADMIN" as const,
      phone: "+62812345679",
      address: "Jakarta",
      isActive: true,
      updatedAt: new Date(),
    },
    {
      id: "warehouse123",
      email: "warehouse@indana.com",
      name: "Warehouse User",
      password: "password123",
      role: "WAREHOUSE" as const,
      phone: "+62812345680",
      address: "Jakarta",
      isActive: true,
      updatedAt: new Date(),
    },
    {
      id: "sales123",
      email: "sales@indana.com",
      name: "Sales User",
      password: "password123",
      role: "SALES" as const,
      phone: "+62812345681",
      address: "Jakarta",
      isActive: true,
      updatedAt: new Date(),
    },
    {
      id: "helper123",
      email: "helper@indana.com",
      name: "Helper User",
      password: "password123",
      role: "HELPER" as const,
      phone: "+62812345682",
      address: "Jakarta",
      isActive: true,
      updatedAt: new Date(),
    },
    {
      id: "keuangan123",
      email: "keuangan@indana.com",
      name: "Keuangan User",
      password: "password123",
      role: "KEUANGAN" as const,
      phone: "+62812345683",
      address: "Jakarta",
      isActive: true,
      updatedAt: new Date(),
    },
  ];

  for (const userData of usersToCreate) {
    await prisma.users.create({ data: userData });
  }
  return prisma.users.findMany();
}
