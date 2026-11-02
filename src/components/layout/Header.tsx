"use client";

import Link from "next/link";
import { Leaf, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import { MobileNav } from "./MobileNav";
import { MobileSearch } from "./MobileSearch";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-paper-200 bg-paper-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="flex flex-1 items-center">
            <Link href="/" className="flex items-center gap-2 text-forest-900">
              <Leaf className="h-6 w-6 text-forest-700" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-display text-xl font-semibold tracking-tight">Bumi Baik</span>
            </Link>
          </div>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-8 md:flex">
            <Link href="/produk" className="text-sm font-medium text-ink-900 hover:text-forest-700">
              Produk
            </Link>
            <Link href="/dampak" className="text-sm font-medium text-ink-900 hover:text-forest-700">
              Dampak
            </Link>
          </nav>

          <div className="flex flex-1 items-center justify-end gap-1">
            <form
              role="search"
              onSubmit={(event) => event.preventDefault()}
              className="relative hidden md:block"
            >
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-600"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari produk"
                placeholder="Cari produk"
                className="h-11 w-56 rounded-md border border-paper-200 bg-white pl-10 pr-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-forest-700 focus:outline-none lg:w-64"
              />
            </form>

            <Link
              href="/akun"
              aria-label="Akun"
              className="hidden h-11 w-11 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100 md:flex"
            >
              <User className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </Link>

            <Link
              href="/keranjang"
              aria-label="Keranjang, 0 item"
              className="relative flex h-11 w-11 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100"
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-700 px-1 text-sm leading-none text-paper-50">
                0
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Cari produk"
              className="flex h-11 w-11 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100 md:hidden"
            >
              <Search className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Buka menu"
              className="flex h-11 w-11 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100 md:hidden"
            >
              <Menu className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <MobileSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
