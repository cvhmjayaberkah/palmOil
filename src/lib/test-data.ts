import db from "@/lib/db";

export async function createTestUsers() {
  try {
    // Create test sales users
    const testUsers = [
      {
        id: "sales_user_1",
        email: "sales@indana-oil.com",
        name: "Sales Representative 1",
        password: "password123", // In production, this should be hashed
        role: "SALES" as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "sales_user_2",
        email: "sales2@indana-oil.com",
        name: "Sales Representative 2",
        password: "password123", // In production, this should be hashed
        role: "SALES" as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "admin_user_1",
        email: "admin@indana-oil.com",
        name: "Admin User",
        password: "password123", // In production, this should be hashed
        role: "ADMIN" as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const userData of testUsers) {
      await db.users.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          role: userData.role,
          isActive: userData.isActive,
          updatedAt: new Date(),
        },
        create: userData,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating test users:", error);
    return { success: false, error };
  }
}

export async function createTestCustomers() {
  try {
    const testCustomers = [
      {
        id: "customer_1",
        code: "CUST001",
        name: "PT. Sumber Makmur",
        email: "sumber.makmur@example.com",
        phone: "021-1234567",
        address: "Jl. Sudirman No. 123, Jakarta Pusat",
        city: "Jakarta",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "customer_2",
        code: "CUST002",
        name: "CV. Berkah Jaya",
        email: "berkah.jaya@example.com",
        phone: "022-7890123",
        address: "Jl. Asia Afrika No. 456, Bandung",
        city: "Bandung",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const customerData of testCustomers) {
      await db.customers.upsert({
        where: { code: customerData.code },
        update: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          city: customerData.city,
          isActive: customerData.isActive,
          updatedAt: new Date(),
        },
        create: customerData,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating test customers:", error);
    return { success: false, error };
  }
}

// Combined function to setup all test data
export async function setupTestData() {
  const usersResult = await createTestUsers();
  const customersResult = await createTestCustomers();

  return {
    success: usersResult.success && customersResult.success,
    usersResult,
    customersResult,
  };
}
