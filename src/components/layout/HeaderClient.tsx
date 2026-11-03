"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SignOutForm } from "@/components/account/SignOutForm";
import { SearchBox } from "@/components/search/SearchBox";
import { useCartHeader } from "@/components/cart/CartProvider";
import { MobileNav } from "./MobileNav";
import { MobileSearch } from "./MobileSearch";

export type HeaderAccount = {
  name: string;
  initials: string;
  isAdmin: boolean;
};

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderClient({ account }: { account: HeaderAccount | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const { itemCount, isCountReady, setDrawerOpen } = useCartHeader();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const cartCountRef = useRef<number | null>(null);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        accountButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!isCountReady) return;

    if (cartCountRef.current !== null && itemCount > cartCountRef.current) {
      setBadgePulse(true);
      const timeout = window.setTimeout(() => setBadgePulse(false), 180);
      cartCountRef.current = itemCount;
      return () => window.clearTimeout(timeout);
    }

    cartCountRef.current = itemCount;
  }, [isCountReady, itemCount]);

  const accountLinks = account
    ? [
        { href: "/akun", label: "Akun" },
        { href: "/pesanan", label: "Pesanan" },
        ...(account.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-paper-200 bg-paper-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center">
            <Link
              href="/"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 text-forest-900"
            >
              <Leaf
                className="h-6 w-6 text-forest-700"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="font-display text-xl font-semibold tracking-tight">
                Bumi Baik
              </span>
            </Link>
          </div>

          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-4 md:flex lg:gap-8"
          >
            <Link
              href="/"
              aria-current={pathname === "/" ? "page" : undefined}
              className={`inline-flex min-h-11 items-center text-sm font-medium underline-offset-8 hover:text-forest-700 hover:underline hover:decoration-forest-700 hover:decoration-2 ${
                pathname === "/"
                  ? "text-forest-700 underline decoration-forest-700 decoration-2"
                  : "text-ink-900"
              }`}
            >
              Beranda
            </Link>
            <Link
              href="/produk"
              aria-current={
                isCurrentPath(pathname, "/produk") ? "page" : undefined
              }
              className={`inline-flex min-h-11 items-center text-sm font-medium underline-offset-8 hover:text-forest-700 hover:underline hover:decoration-forest-700 hover:decoration-2 ${
                isCurrentPath(pathname, "/produk")
                  ? "text-forest-700 underline decoration-forest-700 decoration-2"
                  : "text-ink-900"
              }`}
            >
              Produk
            </Link>
            <Link
              href="/dampak"
              aria-current={pathname === "/dampak" ? "page" : undefined}
              className={`inline-flex min-h-11 items-center text-sm font-medium underline-offset-8 hover:text-forest-700 hover:underline hover:decoration-forest-700 hover:decoration-2 ${
                pathname === "/dampak"
                  ? "text-forest-700 underline decoration-forest-700 decoration-2"
                  : "text-ink-900"
              }`}
            >
              Dampak
            </Link>
          </nav>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
            <SearchBox />

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Cari produk"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100 md:hidden"
            >
              <Search
                className="h-5 w-5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </button>

            {account ? (
              <div ref={accountMenuRef} className="relative hidden md:block">
                <button
                  ref={accountButtonRef}
                  type="button"
                  aria-label={`Menu akun ${account.name}`}
                  aria-expanded={accountMenuOpen}
                  aria-controls={
                    accountMenuOpen ? "header-account-menu" : undefined
                  }
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  className="flex h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm font-semibold text-forest-900 hover:bg-paper-100"
                >
                  <span aria-hidden="true">
                    {account.initials || <User className="h-5 w-5" />}
                  </span>
                </button>
                {accountMenuOpen && (
                  <div
                    id="header-account-menu"
                    className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-paper-200 bg-paper-50 p-2 shadow-sm"
                  >
                    <p className="truncate px-3 py-2 text-sm font-medium text-ink-600">
                      {account.name}
                    </p>
                    <nav aria-label="Menu akun" className="flex flex-col">
                      {accountLinks.map((link) => {
                        const active = isCurrentPath(pathname, link.href);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setAccountMenuOpen(false)}
                            className={`flex min-h-11 items-center rounded-sm px-3 text-sm underline-offset-4 hover:bg-paper-100 ${
                              active
                                ? "text-forest-700 underline decoration-forest-700 decoration-2"
                                : "text-ink-900"
                            }`}
                          >
                            {link.label}
                          </Link>
                        );
                      })}
                    </nav>
                    <div className="border-t border-paper-200 px-2 pt-2">
                      <SignOutForm onClick={() => setAccountMenuOpen(false)} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/masuk"
                className="hidden min-h-11 items-center rounded-md px-3 text-sm font-medium text-forest-700 hover:bg-forest-100 md:inline-flex"
              >
                Masuk
              </Link>
            )}

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka keranjang"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100"
            >
              <ShoppingBag
                className="h-5 w-5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span
                aria-hidden="true"
                className={`absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-700 px-1 text-sm leading-none text-paper-50 transition-transform duration-150 motion-reduce:transition-none ${
                  badgePulse ? "scale-110" : "scale-100"
                }`}
              >
                {isCountReady ? itemCount : ""}
              </span>
              <span className="sr-only" aria-live="polite" aria-atomic="true">
                {isCountReady ? `Jumlah item di keranjang: ${itemCount}` : ""}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Buka menu"
              aria-expanded={menuOpen}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100 md:hidden"
            >
              {menuOpen ? (
                <X className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Menu
                  className="h-6 w-6"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        pathname={pathname}
        account={account}
      />
      <MobileSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer />
    </>
  );
}
