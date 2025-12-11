"use server";

import { signIn } from "@/lib/auth";
import db from "@/lib/db";

export async function handleSignIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Basic validation
  if (!email || !password) {
    return {
      success: false,
      message: "Email and password are required",
    };
  }

  if (!email.includes("@")) {
    return {
      success: false,
      message: "Please enter a valid email address",
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      message: "Password must be at least 6 characters long",
    };
  }

  try {
    // Check if user exists first
    const existingUser = await db.users.findFirst({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!existingUser) {
      return {
        success: false,
        message: "No account found with this email address",
      };
    }

    // Check if account is active
    if (!existingUser.isActive) {
      return {
        success: false,
        message:
          "Your account has been deactivated. Please contact administrator",
      };
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      // More specific error handling based on the error type
      if (result.error === "CredentialsSignin") {
        return {
          success: false,
          message: "Incorrect password. Please try again",
        };
      }

      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    return {
      success: true,
      message: "Sign in successful",
    };
  } catch (error: any) {
    console.error("Sign in error:", error);

    // Handle specific error types
    if (error.message?.includes("Invalid credentials")) {
      return {
        success: false,
        message: "Incorrect password. Please try again",
      };
    }

    if (error.message?.includes("User not found")) {
      return {
        success: false,
        message: "Akun tidak ditemukan. Silakan periksa email Anda",
      };
    }

    return {
      success: false,
      message: "Password atau email salah",
    };
  }
}
