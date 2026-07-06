import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

export type UploadFromUrlInput = {
  brandId: string;
  url: string;
  fileName?: string;
  mimeType?: string;
};

export async function createMediaFromUrl(
  workspaceId: string,
  input: UploadFromUrlInput,
) {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand || brand.workspaceId !== workspaceId) throw new ApiError(404, "brand_not_found", "Brand not found.");

  const mimeType = input.mimeType ?? guessMimeType(input.url);
  const type = mimeToMediaType(mimeType);

  return prisma.mediaAsset.create({
    data: {
      workspaceId,
      brandId: input.brandId,
      type,
      status: "COMPLETED",
      url: input.url,
      fileName: input.fileName ?? input.url.split("/").pop() ?? "asset",
      mimeType,
    },
  });
}

function guessMimeType(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm",
    mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav", pdf: "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}

function mimeToMediaType(mime: string): "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "OTHER" {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  if (mime.startsWith("application/pdf")) return "DOCUMENT";
  return "OTHER";
}
