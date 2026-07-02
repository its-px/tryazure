import { useState } from "react";
import { Avatar, Box, Button, CircularProgress } from "@mui/material";
import imageCompression from "browser-image-compression";
import { supabase } from "./supabaseClient";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW_BYTES = 8 * 1024 * 1024; // 8MB, before compression

interface PhotoUploadFieldProps {
  storagePath: string; // e.g. `{tenantId}/products/{productId}.webp`
  currentUrl?: string | null;
  onUploaded: (publicUrl: string) => void;
  label?: string;
}

// Shared compress+validate+upload control for product/professional photos.
// ponytail: one component, no media-library features (crop/gallery/multi-file) —
// add if a real need shows up.
export default function PhotoUploadField({
  storagePath,
  currentUrl,
  onUploaded,
  label = "Upload photo",
}: PhotoUploadFieldProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_RAW_BYTES) {
      setError("Image is too large (max 8MB).");
      return;
    }

    setBusy(true);
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1280,
        maxSizeMB: 0.3,
        fileType: "image/webp",
        useWebWorker: true,
      });

      const { error: uploadError } = await supabase.storage
        .from("tenant-assets")
        .upload(storagePath, compressed, {
          contentType: "image/webp",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("tenant-assets").getPublicUrl(storagePath);
      // Cache-bust so the new photo shows immediately (upload path is fixed per row).
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setPreview(url);
      onUploaded(url);
    } catch (err) {
      console.error("[PhotoUploadField] upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Avatar src={preview ?? undefined} sx={{ width: 48, height: 48 }} />
      <Box>
        <Button size="small" component="label" disabled={busy}>
          {busy ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
          {label}
          <input
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </Button>
        {error && (
          <Box sx={{ fontSize: 11, color: "error.main", mt: 0.25 }}>{error}</Box>
        )}
      </Box>
    </Box>
  );
}
