"use client";
import { ManagementHeader } from "@/components/ui";
import React, { useState, useEffect, use } from "react";
import {
  Button,
  Input,
  Select,
  FormField,
  InputCheckbox,
} from "@/components/ui";
import { updateUser, getUserById, deleteUser } from "@/lib/actions/user";
import { UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export default function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    role: "",
    password: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const roleOptions = [
    { value: "OWNER", label: "OWNER" },
    { value: "ADMIN", label: "ADMIN" },
    { value: "SALES", label: "SALES" },
    { value: "WAREHOUSE", label: "WAREHOUSE" },
    { value: "HELPER", label: "HELPER" },
    { value: "KEUANGAN", label: "KEUANGAN" },
  ];

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getUserById(resolvedParams.id);
        if (userData) {
          setUser(userData);
          setFormData({
            name: userData.name,
            email: userData.email,
            role: userData.role,
            password: "",
            isActive: userData.isActive,
          });
        } else {
          toast.error("User not found");
          router.push("/management/users");
        }
      } catch (error) {
        toast.error("Failed to fetch user data");
        router.push("/management/users");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [resolvedParams.id, router]);

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors({ ...formErrors, [field]: undefined });
    }
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
    if (value) {
      setFormErrors({ ...formErrors, role: undefined });
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!formData.email.includes("@")) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.role) {
      errors.role = "Role is required";
    }

    if (formData.password && formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.warning("Please check the form for errors");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateUser({
        id: resolvedParams.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role as UserRole,
        password: formData.password.trim() || undefined,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success(`User "${formData.name.trim()}" updated successfully!`);
        router.push("/management/users");
      } else {
        toast.error(result.error || "Failed to update user");
        setFormErrors({
          name: result.error,
        });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("An unexpected error occurred");
      setFormErrors({ name: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteUser(resolvedParams.id);

      if (result.success) {
        toast.success(`User "${user?.name}" deleted successfully!`);
        router.push("/management/users");
      } else {
        toast.error(result.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Edit User"
          mainPageName="/management/users"
          allowedRoles={["ADMIN", "OWNER"]}
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Loading user data...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Edit User"
          mainPageName="/management/users"
          allowedRoles={["ADMIN", "OWNER"]}
        />
        <div className="flex items-center justify-center py-12">
          <span className="text-red-600 dark:text-red-400">User not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Edit User"
        mainPageName="/management/users"
        allowedRoles={["ADMIN", "OWNER"]}
      />
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
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                maxLength={100}
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
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                maxLength={255}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="password"
              errorMessage={formErrors.password}
            >
              <Input
                type="password"
                name="password"
                placeholder="Leave empty to keep current password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to keep the current password
              </p>
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
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/management/users")}
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting || isDeleting}
              >
                Delete User
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="flex-1"
              >
                {isSubmitting ? "Updating..." : "Update User"}
              </Button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Delete User Confirmation
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to delete user "{user?.name}"? This
                    action cannot be undone.
                  </p>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleDeleteUser}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
