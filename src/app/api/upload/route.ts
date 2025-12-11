import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";

// Ensure the upload directory exists
const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Handle file upload (POST)
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];


    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    // Check if upload directory exists and is writable
    try {
      await fs.promises.access(uploadDir, fs.constants.W_OK);
    } catch (error) {
      console.error("Upload directory not writable:", error);
      return NextResponse.json(
        { success: false, error: "Upload directory not accessible" },
        { status: 500 }
      );
    }

    const uploadedFiles: string[] = [];

    for (const file of files) {
      if (!file.size) {
        continue;
      }


      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = path.extname(file.name);
      const fileName = `field-visit-${timestamp}-${randomString}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);


      // Convert file to buffer and write to disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      await writeFile(filePath, buffer);

      // Return relative path for frontend
      uploadedFiles.push(`/uploads/${fileName}`);
    }


    return NextResponse.json(
      { success: true, files: uploadedFiles },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}

// Handle file deletion (DELETE)
export async function DELETE(req: NextRequest) {
  const { pathname } = await req.json();

  if (!pathname) {
    return NextResponse.json(
      { success: false, error: "No file path provided" },
      { status: 400 }
    );
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    pathname.replace(/^\/+/, "")
  );

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
