"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { rupiah } from "@/lib/format";
import type { ProductListItem } from "@/types";

type SearchBoxProps = {
  variant?: "desktop" | "mobile";
  autoFocus?: boolean;
  onNavigate?: () => void;
};

type SearchResponse = {
  products: ProductListItem[];
};

export function SearchBox({
  variant = "desktop",
  autoFocus = false,
  onNavigate,
}: SearchBoxProps) {
  const router = useRouter();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) throw new Error("Pencarian gagal");

        const data = (await response.json()) as SearchResponse;
        setResults(data.products);
        setActiveIndex(-1);
        setOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function goToProduct(product: ProductListItem) {
    setOpen(false);
    router.push(`/produk/${product.slug}`);
    onNavigate?.();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (activeIndex >= 0 && results[activeIndex]) {
      goToProduct(results[activeIndex]);
      return;
    }

    if (!trimmedQuery) return;

    setOpen(false);
    router.push(`/produk?q=${encodeURIComponent(trimmedQuery)}`);
    onNavigate?.();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (results.length === 0) return;

      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        if (event.key === "ArrowDown") return (current + 1) % results.length;
        return current <= 0 ? results.length - 1 : current - 1;
      });
    }
  }

  const showDropdown =
    open && (loading || results.length > 0 || trimmedQuery.length >= 2);

  return (
    <div
      ref={containerRef}
      className={
        variant === "desktop" ? "relative hidden md:block" : "relative w-full"
      }
    >
      <form role="search" onSubmit={handleSubmit} className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-600"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <input
          type="text"
          role="combobox"
          aria-label="Cari produk"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listId : undefined}
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="Cari produk"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (trimmedQuery.length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`h-11 rounded-md border border-paper-200 bg-white pl-10 text-base text-ink-900 placeholder:text-ink-400 focus:border-forest-700 focus:outline-none ${
            query ? "pr-10" : "pr-3"
          } ${variant === "desktop" ? "w-56 lg:w-64" : "w-full"}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            aria-label="Hapus pencarian"
            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-ink-600 hover:text-forest-700"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </form>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Saran produk"
          className={`absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-md border border-paper-200 bg-paper-50 ${
            variant === "desktop" ? "min-w-80" : ""
          }`}
        >
          {loading && results.length === 0 && (
            <li className="px-3 py-3 text-sm text-ink-600">Mencari produk…</li>
          )}

          {!loading && results.length === 0 && (
            <li className="px-3 py-3 text-sm text-ink-600">
              Tidak ada produk yang cocok. Coba kata lain.
            </li>
          )}

          {results.map((product, index) => (
            <li key={product.id}>
              <Link
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                href={`/produk/${product.slug}`}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-center gap-3 border-b border-paper-200 p-2.5 last:border-b-0 ${
                  index === activeIndex ? "bg-forest-100" : "hover:bg-paper-100"
                }`}
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-paper-100">
                  <ProductImage
                    src={product.images[0]}
                    name={product.name}
                    sizes="40px"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-900">
                    {product.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-sm text-ink-600">
                    {rupiah(product.price_idr)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
