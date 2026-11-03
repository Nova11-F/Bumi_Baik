"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useCatalogNavigation } from "./CatalogNavigation";

export function CatalogPageLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className: string;
}) {
  const { navigate } = useCatalogNavigation();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    navigate(href, "push");
  }

  return (
    <Link href={href} prefetch onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
