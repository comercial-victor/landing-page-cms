import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DIMENSION = 2200;

function avifFilename(filename: string) {
  const clean = filename.trim().replace(/\.[^.]+$/, "");
  return `${clean || "imagen"}.avif`;
}

function toArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibio una imagen." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo no es una imagen." }, { status: 415 });
  }

  if (file.type === "image/avif") {
    const buffer = Buffer.from(await file.arrayBuffer());
    return new NextResponse(new Blob([toArrayBuffer(buffer)], { type: "image/avif" }), {
      headers: {
        "content-type": "image/avif",
        "x-filename": avifFilename(file.name),
      },
    });
  }

  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return NextResponse.json({ error: "Este formato no se convierte a AVIF automaticamente." }, { status: 415 });
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const output = await sharp(input, { animated: false, limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .avif({ quality: 74, effort: 5 })
      .toBuffer();

    return new NextResponse(new Blob([toArrayBuffer(output)], { type: "image/avif" }), {
      headers: {
        "cache-control": "no-store",
        "content-type": "image/avif",
        "x-filename": avifFilename(file.name),
      },
    });
  } catch (error) {
    console.error("Error convirtiendo imagen a AVIF:", error);
    return NextResponse.json({ error: "No se pudo convertir la imagen a AVIF." }, { status: 422 });
  }
}
