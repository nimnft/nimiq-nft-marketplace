"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme-provider";
import { Search, Menu, X, Moon, Sun } from "lucide-react";
import { WalletButton, MobileWalletButton } from "@/components/wallet/WalletButton";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/collections", label: "Collections" },
  { href: "/inventory", label: "Inventory" },
  { href: "/mint", label: "Mint" },
  { href: "/activity", label: "Activity" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-200",
        scrolled ? "glass border-border shadow-sm" : "bg-transparent border-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 focus:outline-none">
              <img src="/logo.svg" alt="NimiqNFT" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-lg hidden sm:block text-text">
                NimiqNFT
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-hover transition-colors focus:outline-none"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/explore"
              className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-colors focus:outline-none"
              aria-label="Search"
            >
              <Search size={20} />
            </Link>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-colors focus:outline-none"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="hidden sm:block">
              <WalletButton />
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface-hover transition-colors focus:outline-none"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-200",
            mobileOpen ? "max-h-96 border-t border-border" : "max-h-0"
          )}
        >
          <div className="py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-hover transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 px-3">
              <MobileWalletButton />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
