"use client";

import { useState } from "react";
import { isUsableImageUrl } from "@/lib/product";
import { ProductImage } from "./ProductImage";

type GalleryProps = {
  images: string[];
  name: string;
};

export function Gallery({ images, name }: GalleryProps) {
  const usableImages = images.filter(isUsableImageUrl);
  const displayImages = usableImages.length > 0 ? usableImages : [null];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = displayImages[Math.min(activeIndex, displayImages.length - 1)];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[72px_1fr] lg:grid-cols-[80px_1fr]">
      <div className="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col">
        {displayImages.map((image, index) => (
          <button
            key={image ?? "placeholder"}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Lihat foto ${index + 1} dari ${name}`}
            aria-pressed={activeIndex === index}
            className={`relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-sm border bg-paper-100 ${
              activeIndex === index ? "border-forest-700" : "border-paper-200"
            }`}
          >
            <ProductImage src={image} name={name} sizes="80px" />
          </button>
        ))}
      </div>

      <div className="relative order-1 aspect-[4/5] overflow-hidden rounded-md border border-paper-200 bg-paper-100 sm:order-2">
        <ProductImage
          key={activeImage ?? "placeholder"}
          src={activeImage}
          name={name}
          sizes="(min-width: 1024px) 56vw, 100vw"
          priority
        />
      </div>
    </div>
  );
}
