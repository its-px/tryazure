// file.type comes from the extension, so also check the real signature bytes.
// Anything else (renamed .html/.svg/.exe) is rejected before we even decode it.
export async function isRealImage(file: Blob): Promise<boolean> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const webp =
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  return jpeg || png || webp;
}

// Rewrites a Supabase public `tenant-assets` URL to the image-transformation endpoint.
// Any other URL is returned untouched. Needs the Supabase Pro plan: on Free the render
// endpoint errors, so callers must fall back to the original URL (see ResizedAvatar).
const PUBLIC_RE = /^(https?:\/\/[^/]+\/storage\/v1)\/object\/public\/(tenant-assets\/.+?)(?:\?.*)?$/;

export function resizedImageUrl(
  url: string | null | undefined,
  { width, quality = 75 }: { width: number; quality?: number },
): string | undefined {
  if (!url) return undefined;
  const m = PUBLIC_RE.exec(url);
  if (!m) return url;
  return `${m[1]}/render/image/public/${m[2]}?width=${Math.round(width)}&quality=${quality}&resize=cover`;
}
