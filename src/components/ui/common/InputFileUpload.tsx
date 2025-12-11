"use client";
import React, { useState } from "react";
import { FaTrash } from "react-icons/fa"; // Import delete icon

interface InputFileUploadProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (files: FileList | null) => void; // Custom onChange prop
  errorMessage?: string;
  className?: string;
  name: string;
  fileTypes?: string[]; // Optional prop for accepted file types
}

const InputFileUpload: React.FC<InputFileUploadProps> = ({
  onChange,
  errorMessage,
  className = "",
  name,
  fileTypes, // Accepts optional file types
  ...props
}) => {
  const hasError = errorMessage && errorMessage.length > 0;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files && files.length > 0) {
      const file = files[0];

      // Validate file type if fileTypes are provided
      if (fileTypes && !fileTypes.includes(file.type)) {
        alert(`Invalid file type. Allowed types: ${fileTypes.join(", ")}`);
        setSelectedFile(null); // Reset selected file
        if (onChange) onChange(null); // Call onChange with null
        return;
      }

      setSelectedFile(file); // Get the first selected file
      if (onChange) onChange(files); // Call onChange with the selected file(s)
    }
  };

  const handleFileDelete = (
    event: React.MouseEvent<HTMLSpanElement | HTMLButtonElement>
  ) => {
    event.stopPropagation(); // Prevent triggering the file input when delete is clicked
    setSelectedFile(null);
    if (onChange) onChange(null); // Trigger onChange with null on delete
  };

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {hasError && (
        <span className="text-xs text-red-500 mb-1">{errorMessage}</span>
      )}
      <div
        className={`border ${
          hasError ? "border-red-500" : "border-gray-600" // Changed to gray-600
        } rounded-lg`}
      >
        <input
          id={name}
          type="file"
          onChange={handleFileChange}
          name={name}
          className="hidden" // Hide the input element
          {...props}
        />
        <button
          type="button"
          onClick={() => document.getElementById(name)?.click()} // Trigger the file input
          className={`dark:bg-gray-900 dark:text-gray-400 cursor-pointer w-full p-2 text-left rounded-lg bg-white focus:outline-none transition duration-200`}
        >
          {selectedFile ? (
            <div className="text-m flex justify-between items-center">
              <span className="dark:text-gray-300 text-gray-700">
                {selectedFile.name}
              </span>
              {/* Change delete button to a span */}
              <span
                onClick={handleFileDelete}
                className="flex items-center justify-center w-8 h-8 cursor-pointer text-red-600 hover:text-red-700 transition duration-200"
              >
                <FaTrash />
              </span>
            </div>
          ) : (
            "Upload File"
          )}
        </button>
      </div>
    </div>
  );
};

export default InputFileUpload;
