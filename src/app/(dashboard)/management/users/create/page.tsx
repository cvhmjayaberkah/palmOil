"use client";
import { ManagementHeader } from "@/components/ui";
import React, { useState } from "react";
import {
  Button,
  Input,
  Select,
  FormField,
  InputCheckbox,
} from "@/components/ui";
import { createUser } from "@/lib/actions/user";
import { UserRole } from "@prisma/client";

interface FormData {
  name: string;
  email: string;
  role: string;
  password: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  isActive?: string;
}

export default function CreateUserPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    role: "",
    password: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({
    name: "",
    email: "",
    role: "",
    password: "",
  });

  const roleOptions = [
    { value: "OWNER", label: "OWNER" },
    { value: "ADMIN", label: "ADMIN" },
    { value: "SALES", label: "SALES" },
    { value: "WAREHOUSE", label: "WAREHOUSE" },
    { value: "HELPER", label: "HELPER" },
    { value: "KEUANGAN", label: "KEUANGAN" },
  ];

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (typeof value === "string" && value.trim()) {
      setFormErrors({ ...formErrors, [field]: "" });
    } else if (typeof value === "boolean") {
      setFormErrors({ ...formErrors, [field]: "" });
    }
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
    if (value) {
      setFormErrors({ ...formErrors, role: "" });
    } else {
      setFormErrors({ ...formErrors, role: "Please select a role." });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic validation
    const errors: FormErrors = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    if (!formData.password.trim()) errors.password = "Password is required";
    if (!formData.role) errors.role = "Role is required";
    if (formData.password.length < 6)
      errors.password = "Password must be at least 6 characters";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createUser({
        name: formData.name,
        email: formData.email,
        role: formData.role as UserRole,
        password: formData.password,
        isActive: formData.isActive,
      });

      if (result.success) {
        // Handle successful user creation
        alert("User created successfully!");
        // Reset form
        setFormData({
          name: "",
          email: "",
          role: "",
          password: "",
          isActive: true,
        });
        setFormErrors({});
      } else {
        // Handle errors
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      // Handle unexpected errors
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="User Management"
        mainPageName="/management/users"
        allowedRoles={["ADMIN", "OWNER"]}
      />
      {/* <ManagementTableContent /> */}
      <div className="flex flex-col">
        <div className="p-3 md:px-28 md:py-6">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <FormField
              label="Full Name"
              htmlFor="name"
              required
              errorMessage={formErrors.name}
            >
              <Input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </FormField>

            <FormField
              label="Email Address"
              htmlFor="email"
              required
              errorMessage={formErrors.email}
            >
              <Input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="password"
              required
              errorMessage={formErrors.password}
            >
              <Input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
            </FormField>

            <FormField
              label="Role"
              htmlFor="role"
              required
              errorMessage={formErrors.role}
            >
              <Select
                options={roleOptions}
                value={formData.role}
                onChange={handleRoleChange}
                placeholder="— Select a Role —"
              />
            </FormField>

            <FormField
              label="Account Status"
              htmlFor="isActive"
              errorMessage={formErrors.isActive}
            >
              <InputCheckbox
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  handleInputChange("isActive", e.target.checked)
                }
                label="Active Account"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deactivated users will not be able to login
              </p>
            </FormField>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Creating..." : "Buat user"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
