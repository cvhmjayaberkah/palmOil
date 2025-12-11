"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

export async function createUser({
  name,
  email,
  role,
  password,
  isActive = true,
}: {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  isActive?: boolean;
}) {
  // validate required fields
  if (!name || !email || !role || !password) {
    return {
      success: false,
      error: "Field yang diperlukan tidak lengkap",
    };
  }
  try {
    await db.users.create({
      data: {
        name,
        email,
        role: role as UserRole,
        password,
        isActive,
      },
    });
    revalidatePath("/management/users");
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to create user",
    };
  }
}

export async function getUsers() {
  try {
    const users = await db.users.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return users;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}

export async function getSalesUsers() {
  try {
    const salesUsers = await db.users.findMany({
      where: {
        role: "SALES",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return salesUsers;
  } catch (error) {
    console.error("Failed to fetch sales users:", error);
    return [];
  }
}

export async function getUserById(id: string) {
  try {
    const user = await db.users.findUnique({
      where: {
        id,
      },
    });
    return user;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return null;
  }
}

export async function updateUser({
  id,
  name,
  email,
  role,
  password,
  isActive,
}: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  isActive: boolean;
}) {
  // validate required fields
  if (!id || !name || !email || !role) {
    return {
      success: false,
      error: "Missing required fields",
    };
  }

  try {
    const updateData: any = {
      name,
      email,
      role: role as UserRole,
      isActive,
    };

    // Only update password if provided
    if (password && password.trim()) {
      updateData.password = password;
    }

    await db.users.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/management/users");
    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to update user:", error);
    return {
      success: false,
      error: "Failed to update user",
    };
  }
}

export async function toggleUserStatus(id: string) {
  try {
    const user = await db.users.findUnique({
      where: { id },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    await db.users.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    revalidatePath("/management/users");
    return {
      success: true,
      message: `User ${
        !user.isActive ? "activated" : "deactivated"
      } successfully`,
    };
  } catch (error) {
    console.error("Failed to toggle user status:", error);
    return {
      success: false,
      error: "Failed to update user status",
    };
  }
}

export async function deactivateUser(id: string) {
  try {
    await db.users.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/management/users");
    return {
      success: true,
      message: "User deactivated successfully",
    };
  } catch (error) {
    console.error("Failed to deactivate user:", error);
    return {
      success: false,
      error: "Failed to deactivate user",
    };
  }
}

export async function activateUser(id: string) {
  try {
    await db.users.update({
      where: { id },
      data: { isActive: true },
    });

    revalidatePath("/management/users");
    return {
      success: true,
      message: "User activated successfully",
    };
  } catch (error) {
    console.error("Failed to activate user:", error);
    return {
      success: false,
      error: "Failed to activate user",
    };
  }
}

export async function deleteUser(id: string) {
  try {
    // Check if user exists
    const user = await db.users.findUnique({
      where: { id },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Delete the user
    await db.users.delete({
      where: { id },
    });

    revalidatePath("/management/users");
    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return {
      success: false,
      error: "Failed to delete user",
    };
  }
}
