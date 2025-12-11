import { z } from "zod";

export const schema = z.object({
  email: z.string().nonempty("Email is required"), // Remove strict email validation for now
  password: z
    .string()
    .nonempty("Password is required")
    .min(5, "Password must be more than 5 characters")
    .max(32, "Password must be less than 32 characters"),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .min(2, "Name must be at least 2 characters"),
  email: z.string().nonempty("Email is required").email("Invalid email format"),
  password: z
    .string()
    .nonempty("Password is required")
    .min(5, "Password must be more than 5 characters")
    .max(32, "Password must be less than 32 characters"),
});
