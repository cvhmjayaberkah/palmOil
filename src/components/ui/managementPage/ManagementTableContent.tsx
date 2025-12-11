"use client";
import React, { useState } from "react";
import {
  Button,
  Input,
  Select,
  FormField,
  InputCheckbox,
  InputDate,
  InputFileUpload,
  InputTextArea,
} from "@/components/ui";

interface FormData {
  name: string;
  email: string;
  category: string;
  dateOfBirth: Date | null;
  description: string;
  fileUpload: FileList | null;
  termsAccepted: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  category?: string;
  dateOfBirth?: string;
  description?: string;
  fileUpload?: string;
  termsAccepted?: string;
}

const ManagementFormContent = () => {
  const selectOptions = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    category: "",
    dateOfBirth: null,
    description: "",
    fileUpload: null,
    termsAccepted: false,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({
    name: "",
    email: "",
    category: "",
    dateOfBirth: "",
    description: "",
    fileUpload: "",
    termsAccepted: "",
  });

  const categoryOptions = [
    { value: "admin", label: "Administrator" },
    { value: "user", label: "User" },
    { value: "moderator", label: "Moderator" },
  ];

  const handleCategoryChange = (value: string) => {
    setFormData({ ...formData, category: value });
    if (value) {
      setFormErrors({ ...formErrors, category: "" });
    } else {
      setFormErrors({ ...formErrors, category: "Please select a category." });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      name: formData.name ? "" : "Name is required",
      email: formData.email ? "" : "Email is required",
      category: formData.category ? "" : "Category is required",
    };

    setFormErrors(errors);
    if (!errors.name && !errors.email && !errors.category) {
      setIsModalOpen(false);
    }
  };

  return (
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
              onChange={e => setFormData({ ...formData, name: e.target.value })}
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
              onChange={e =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </FormField>

          <FormField
            label="Date"
            htmlFor="date"
            required
            errorMessage={formErrors.category}
          >
            <InputDate
              value={formData.dateOfBirth}
              onChange={date => setFormData({ ...formData, dateOfBirth: date })}
              placeholder="Select a date"
              errorMessage={formErrors.dateOfBirth}
            />
          </FormField>

          <FormField
            label="Category"
            htmlFor="category"
            required
            errorMessage={formErrors.category}
          >
            <Select
              options={categoryOptions}
              value={formData.category}
              onChange={handleCategoryChange}
              placeholder="— Select a Category —"
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="description"
            errorMessage={formErrors.description}
          >
            <InputTextArea
              name="description"
              value={formData.description}
              placeholder="Description"
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </FormField>

          <FormField
            label="File Upload"
            htmlFor="fileUpload"
            required
            errorMessage={formErrors.fileUpload}
          >
            <InputFileUpload
              name="fileUpload"
              onChange={e => {
                if (e) {
                  setFormData({ ...formData, fileUpload: e });
                } else {
                  setFormData({ ...formData, fileUpload: null });
                }
              }}
              errorMessage={formErrors.fileUpload}
            />
          </FormField>

          <InputCheckbox
            checked={formData.termsAccepted}
            onChange={e =>
              setFormData({
                ...formData,
                termsAccepted: e.target.checked,
              })
            }
            label="I accept the terms and conditions"
            errorMessage={formErrors.termsAccepted}
          />

          <Button type="submit" className="w-full">
            Submit Form
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ManagementFormContent;
