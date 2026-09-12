import Link from "next/link";

const footerLinks = {
  marketplace: [
    { label: "Explore", href: "/explore" },
    { label: "Collections", href: "/collections" },
    { label: "Create", href: "/mint" },
    { label: "Activity", href: "/activity" },
  ],
  resources: [
    { label: "About", href: "/about" },
    { label: "Help Center", href: "#" },
    { label: "Community", href: "#" },
    { label: "Blog", href: "#" },
  ],
  blockchain: [
    { label: "Nimiq", href: "https://nimiq.com", external: true },
    { label: "Documentation", href: "#", external: true },
    { label: "GitHub", href: "#", external: true },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <img src="/logo.svg" alt="NimiqNFT" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-lg text-text">NimiqNFT</span>
            </Link>
            <p className="text-sm text-text-muted">
              The premier NFT marketplace for the Nimiq blockchain ecosystem.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Marketplace</h3>
            <ul className="space-y-2">
              {footerLinks.marketplace.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Blockchain</h3>
            <ul className="space-y-2">
              {footerLinks.blockchain.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text transition-colors"
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; 2026 NimiqNFT. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-xs text-text-muted hover:text-text transition-colors">
              Terms
            </Link>
            <Link href="#" className="text-xs text-text-muted hover:text-text transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
