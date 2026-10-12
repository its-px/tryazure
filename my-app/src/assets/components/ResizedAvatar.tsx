import { Avatar, type AvatarProps } from "@mui/material";
import { useState } from "react";
import { resizedImageUrl } from "./imageUtils";

// Avatar that requests a resized image (1x/2x srcset) and falls back to the original URL if
// the transformation endpoint fails (e.g. Supabase Free plan).
export default function ResizedAvatar({ src, size, ...rest }: Omit<AvatarProps, "src"> & { src?: string | null; size: number }) {
  const [failed, setFailed] = useState(false);
  const useOriginal = failed || !src;
  const small = resizedImageUrl(src, { width: size });
  const big = resizedImageUrl(src, { width: size * 2 });
  return (
    <Avatar
      {...rest}
      src={(useOriginal ? src : small) || undefined}
      srcSet={!useOriginal && small !== src ? `${small} 1x, ${big} 2x` : undefined}
      slotProps={{ img: { loading: "lazy", decoding: "async", width: size, height: size, onError: () => setFailed(true) } }}
    />
  );
}
