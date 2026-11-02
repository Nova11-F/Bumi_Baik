"use client";

import Image from "next/image";
import { useState } from "react";
import { getInitials, isUsableImageUrl } from "@/lib/product";

type ProductImageProps = {
  src?: string | null;
  name: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

export function ProductImage({
  src,
  name,
  sizes,
  className = "",
  priority = false,
}: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = isUsableImageUrl(src) && failedSrc !== src;

  if (!showImage) {
    return (
      <div
        role="img"
        aria-label={`Foto ${name} belum tersedia`}
        className={`absolute inset-0 flex items-center justify-center bg-paper-100 ${className}`}
      >
        <span className="font-display text-[clamp(1.5rem,4vw,3rem)] leading-none text-forest-700">
          {getInitials(name)}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`Foto ${name}`}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailedSrc(src)}
      className={`object-cover ${className}`}
    />
  );
}
