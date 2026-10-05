"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/review", label: "Review" },
  { href: "/runs", label: "Runs" },
];

/** Client only so it can mark the current page with aria-current. */
export function SiteNav() {
  const path = usePathname();
  return (
    <nav aria-label="Site" className="mx-auto flex max-w-5xl items-center gap-1 px-4 pt-4 text-sm">
      <Link href="/" className="mr-3 font-semibold tracking-tight">
        Paper P&amp;L
      </Link>
      {LINKS.map(({ href, label }) => {
        const current = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`rounded-md px-2.5 py-1 ${current ? "bg-chip font-medium" : "text-muted hover:text-foreground"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
