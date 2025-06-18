import { setupDB } from "@/lib/db";
import { NextResponse } from "next/server";

const storage_handler = setupDB();

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    // Fetch the favicon image from the given URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 500 }
      );
    }

    // Convert response to ArrayBuffer & Buffer
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Get file extension from URL
    const file_extension = imageUrl.split(".").pop()?.split("?")[0] || "png";
    const fileName = `favicon-${Date.now()}.${file_extension}`;
    const filePath = `${fileName}`;

    // Upload to Supabase Storage
    const { error } = await storage_handler.storage
      .from("favicons")
      .upload(filePath, imageBuffer, {
        upsert: true,
        contentType: response.headers.get("content-type") || "image/png",
      });

    if (error) {
      console.error("Error uploading favicon:", error.message);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // // Get the public URL of the uploaded image
    // const { data: publicUrlData } = storage_handler.storage
    //   .from("favicons")
    //   .getPublicUrl(filePath);

    return NextResponse.json({ success: true, url: filePath });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
