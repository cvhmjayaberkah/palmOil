"use client";
import React, { useState, useRef, useCallback } from "react";
import Button from "../common/Button";

interface FileUploaderProps {
  onUpload: (files: File[]) => void;
  acceptedFileTypes: string;
  maxFileSize: number;
  multiple?: boolean;
  className?: string;
}

interface FileItem {
  file: File;
  id: string;
  progress: number;
  error?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onUpload,
  acceptedFileTypes,
  maxFileSize,
  multiple = false,
  className = "",
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const acceptedTypes = acceptedFileTypes.split(",").map(type => type.trim());
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith(".")) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `File type not allowed. Accepted types: ${acceptedFileTypes}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)}`;
    }

    return null;
  };

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: FileItem[] = [];

      fileArray.forEach(file => {
        const error = validateFile(file);
        const fileItem: FileItem = {
          file,
          id: Math.random().toString(36).substr(2, 9),
          progress: 0,
          error: error || undefined,
        };
        validFiles.push(fileItem);
      });

      setFiles(prev => {
        if (multiple) {
          return [...prev, ...validFiles];
        } else {
          return validFiles.slice(0, 1);
        }
      });
    },
    [acceptedFileTypes, maxFileSize, multiple]
  );

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        addFiles(droppedFiles);
      }
    },
    [addFiles]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
  };

  const handleUpload = async () => {
    const validFiles = files.filter(file => !file.error);
    if (validFiles.length === 0) return;

    setIsUploading(true);

    // Simulate upload progress
    for (let i = 0; i < validFiles.length; i++) {
      const fileItem = validFiles[i];

      // Simulate progress updates
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setFiles(prev =>
          prev.map(f => (f.id === fileItem.id ? { ...f, progress } : f))
        );
      }
    }

    setIsUploading(false);
    onUpload(validFiles.map(f => f.file));
  };

  const clearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return "🖼️";
    } else if (fileType.includes("pdf")) {
      return "📄";
    } else if (fileType.includes("word")) {
      return "📝";
    } else if (fileType.includes("excel") || fileType.includes("spreadsheet")) {
      return "📊";
    } else if (fileType.includes("zip") || fileType.includes("rar")) {
      return "📦";
    }
    return "📁";
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${
            isDragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }
          ${files.length > 0 ? "mb-4" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedFileTypes}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-2">
          <div className="text-4xl mb-2">📁</div>
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            {isDragOver ? "Drop files here" : "Drag & drop files here"}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            or click to browse
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {multiple ? "Multiple files allowed" : "Single file only"} • Max
            size: {formatFileSize(maxFileSize)} • Accepted: {acceptedFileTypes}
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Files ({files.length})
            </h3>
            <Button variant="outline" size="small" onClick={clearFiles}>
              Clear All
            </Button>
          </div>

          <div className="space-y-2">
            {files.map(fileItem => (
              <div
                key={fileItem.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-shrink-0 text-2xl">
                  {getFileIcon(fileItem.file.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fileItem.file.name}
                    </p>
                    <button
                      onClick={() => removeFile(fileItem.id)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(fileItem.file.size)}
                    </p>
                    {fileItem.progress > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {fileItem.progress}%
                      </p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {fileItem.progress > 0 && (
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${fileItem.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {fileItem.error && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                      {fileItem.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={isUploading || files.every(f => f.error)}
              isLoading={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Files"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
