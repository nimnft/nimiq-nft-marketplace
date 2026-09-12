import { ShoppingBag, Palette, FolderOpen, Activity, Layers, Moon } from "lucide-react";

const features = [
  {
    icon: ShoppingBag,
    title: "Buy & Sell",
    description: "Trade NFTs seamlessly on the Nimiq blockchain with low fees and instant transactions.",
  },
  {
    icon: Palette,
    title: "Mint NFTs",
    description: "Create unique digital assets and bring your art to life on the decentralized web.",
  },
  {
    icon: FolderOpen,
    title: "Create Collections",
    description: "Organize your NFTs into curated collections and build your digital brand.",
  },
  {
    icon: Activity,
    title: "Activity Tracking",
    description: "Monitor all marketplace activity including sales, mints, and transfers in real time.",
  },
  {
    icon: Layers,
    title: "Multi-Collection Support",
    description: "Browse and manage NFTs across multiple collections from a single dashboard.",
  },
  {
    icon: Moon,
    title: "Dark/Light Theme",
    description: "Enjoy a comfortable viewing experience with automatic and manual theme switching.",
  },
];

const team = [
  { name: "Alex K.", initials: "AK", role: "Founder & Lead Developer" },
  { name: "Sam R.", initials: "SR", role: "Product Designer" },
  { name: "Jordan M.", initials: "JM", role: "Blockchain Engineer" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-text mb-6">
            About NimiqNFT
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            The premier destination for buying, selling, and creating NFTs on the Nimiq blockchain.
            We make digital ownership accessible, fast, and secure for everyone.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 md:p-12">
            <h2 className="text-2xl font-bold text-text mb-4">Our Mission</h2>
            <p className="text-text-secondary leading-relaxed text-lg">
              We believe that digital ownership should be simple, fast, and accessible to everyone.
              The NimiqNFT is built to empower creators, collectors, and communities
              by providing a seamless platform for trading digital assets on the Nimiq blockchain.
              Our goal is to foster a vibrant ecosystem where creativity thrives and digital
              ownership is truly decentralized.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-surface/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-text mb-3">Features</h2>
            <p className="text-text-secondary max-w-lg mx-auto">
              Everything you need to trade, create, and manage NFTs in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-text mb-2">{feature.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-text mb-3">Our Team</h2>
            <p className="text-text-secondary max-w-lg mx-auto">
              The people behind the marketplace.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {team.map((member) => (
              <div
                key={member.name}
                className="rounded-2xl border border-border bg-card p-6 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {member.initials}
                </div>
                <h3 className="font-semibold text-text">{member.name}</h3>
                <p className="text-sm text-text-secondary mt-1">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-hover p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-primary-text mb-3">
              Ready to start?
            </h2>
            <p className="text-primary-text/80 mb-6 max-w-lg mx-auto">
              Join the NimiqNFT community today and start exploring, creating, and trading digital assets.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-white/90 transition-colors"
            >
              Explore Marketplace
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
