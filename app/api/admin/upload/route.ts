import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminRequest, isSameOriginRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes: Record<string, string> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  }
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "site-content";
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Image uploads require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }
  if (!/^[a-z0-9][a-z0-9_-]{1,61}[a-z0-9]$/.test(bucket)) {
    return NextResponse.json({ error: "SUPABASE_STORAGE_BUCKET is invalid." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload must be sent as multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }
  const extension = allowedTypes[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Only AVIF, JPEG, PNG, and WebP images are supported." }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Images must be smaller than 5 MB." }, { status: 413 });
  }

  const fileBytes = Buffer.from(await file.arrayBuffer());
  const validImage =
    (file.type === "image/png" &&
      fileBytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (file.type === "image/jpeg" && fileBytes[0] === 0xff && fileBytes[1] === 0xd8 && fileBytes[2] === 0xff) ||
    (file.type === "image/webp" &&
      fileBytes.toString("ascii", 0, 4) === "RIFF" &&
      fileBytes.toString("ascii", 8, 12) === "WEBP") ||
    (file.type === "image/avif" &&
      fileBytes.toString("ascii", 4, 8) === "ftyp" &&
      ["avif", "avis"].includes(fileBytes.toString("ascii", 8, 12)));
  if (!validImage) {
    return NextResponse.json({ error: "The selected file is not a valid supported image." }, { status: 415 });
  }

  const objectName = `${randomUUID()}.${extension}`;
  const baseUrl = supabaseUrl.replace(/\/+$/, "");
  const authHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  const bucketCheck = await fetch(`${baseUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
    method: "GET",
    headers: authHeaders,
  });

  if (!bucketCheck.ok) {
    const createBucket = await fetch(`${baseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    });
    if (!createBucket.ok && createBucket.status !== 409) {
      const errText = await createBucket.text().catch(() => "");
      if (!errText.includes("409") && !errText.toLowerCase().includes("already exists")) {
        console.error("Could not prepare public Supabase Storage bucket:", createBucket.status, errText);
        return NextResponse.json(
          { error: "Image storage is not available. Check the Supabase bucket settings." },
          { status: 502 },
        );
      }
    }
  }

  const upload = await fetch(
    `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectName}`,
    {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: fileBytes,
    },
  );
  if (!upload.ok) {
    const errText = await upload.text().catch(() => "");
    console.error("Supabase image upload failed:", upload.status, errText);
    return NextResponse.json({ error: "The image could not be uploaded." }, { status: 502 });
  }

  const publicUrl = `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectName}`;
  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
