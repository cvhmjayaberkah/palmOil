"use server";

import db from "@/lib/db";
import { CompanyProfiles } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type CompanyProfileFormData = {
  code: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  owner: string;
  bankAccountNumber: string;
  bankAccountNumber2?: string;
  accountType1: string;
  accountType2?: string;
  accountHolderName1?: string;
  accountHolderName2?: string;
  isActive: boolean;
};

// Get all company profiles
export async function getCompanyProfiles(): Promise<CompanyProfiles[]> {
  try {
    const companyProfiles = await db.companyProfiles.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return companyProfiles;
  } catch (error) {
    console.error("Error fetching company profiles:", error);
    throw new Error("Failed to fetch company profiles");
  }
}

// Get company profile by ID
export async function getCompanyProfileById(
  id: string
): Promise<CompanyProfiles | null> {
  try {
    const companyProfile = await db.companyProfiles.findUnique({
      where: { id },
    });

    return companyProfile;
  } catch (error) {
    console.error("Error fetching company profile:", error);
    throw new Error("Failed to fetch company profile");
  }
}

// Get active company profiles only
export async function getActiveCompanyProfiles(): Promise<CompanyProfiles[]> {
  try {
    const companyProfiles = await db.companyProfiles.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return companyProfiles;
  } catch (error) {
    console.error("Error fetching active company profiles:", error);
    throw new Error("Failed to fetch active company profiles");
  }
}

// Create new company profile
export async function createCompanyProfile(data: CompanyProfileFormData) {
  try {
    const companyProfile = await db.companyProfiles.create({
      data: {
        code: data.code,
        name: data.name,
        address: data.address,
        city: data.city,
        phone: data.phone || null,
        owner: data.owner,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountNumber2: data.bankAccountNumber2 || null,
        accountType1: data.accountType1,
        accountType2: data.accountType2 || null,
        accountHolderName1: data.accountHolderName1 || null,
        accountHolderName2: data.accountHolderName2 || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/management/profil");
    return { success: true, data: companyProfile };
  } catch (error) {
    console.error("Error creating company profile:", error);

    // Handle unique constraint error for code
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        success: false,
        error: "Kode profil perusahaan sudah digunakan",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create company profile",
    };
  }
}

// Update company profile
export async function updateCompanyProfile(
  id: string,
  data: CompanyProfileFormData
) {
  try {
    const companyProfile = await db.companyProfiles.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        phone: data.phone || null,
        owner: data.owner,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountNumber2: data.bankAccountNumber2 || null,
        accountType1: data.accountType1,
        accountType2: data.accountType2 || null,
        accountHolderName1: data.accountHolderName1 || null,
        accountHolderName2: data.accountHolderName2 || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/management/profil");
    revalidatePath(`/management/profil/edit/${id}`);
    return { success: true, data: companyProfile };
  } catch (error) {
    console.error("Error updating company profile:", error);

    // Handle unique constraint error for code
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        success: false,
        error: "Kode profil perusahaan sudah digunakan",
      };
    }

    return { success: false, error: "Failed to update company profile" };
  }
}

// Delete company profile
export async function deleteCompanyProfile(id: string) {
  try {
    await db.companyProfiles.delete({
      where: { id },
    });

    revalidatePath("/management/profil");
    return { success: true };
  } catch (error) {
    console.error("Error deleting company profile:", error);
    return { success: false, error: "Failed to delete company profile" };
  }
}

// Toggle company profile active status
export async function toggleCompanyProfileStatus(id: string) {
  try {
    const companyProfile = await db.companyProfiles.findUnique({
      where: { id },
    });

    if (!companyProfile) {
      return { success: false, error: "Company profile not found" };
    }

    const updatedCompanyProfile = await db.companyProfiles.update({
      where: { id },
      data: {
        isActive: !companyProfile.isActive,
      },
    });

    revalidatePath("/management/profil");
    return { success: true, data: updatedCompanyProfile };
  } catch (error) {
    console.error("Error toggling company profile status:", error);
    return { success: false, error: "Failed to toggle company profile status" };
  }
}
