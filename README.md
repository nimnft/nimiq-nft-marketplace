# NimiqNFT Marketplace

A production-quality NFT marketplace for the Nimiq blockchain ecosystem. Built with Next.js 16, TypeScript, and Tailwind CSS. Features real Nimiq wallet integration via `@nimiq/hub-api` and native Nimiq Pay support.

## Features

- **Mint NFTs** — Single NFT or collection-based minting with real blockchain transactions
- **Buy & Sell** — List NFTs for sale, change price, delist, and purchase with real NIM payments
- **Inventory Management** — View all your NFTs, list/unlist, and manage prices
- **Wallet Integration** — Connect via Nimiq Hub (desktop) or Nimiq Pay (mobile) with auto-detection
- **Activity Feed** — Track all marketplace activity with transaction hashes
- **Dark/Light Theme** — Full theme support with system preference detection
- **Responsive Design** — Works on desktop, tablet, and mobile browsers
- **Nimiq Pay Native** — Auto-detects Nimiq Pay app for seamless mobile experience

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 with CSS variable theme tokens
- **Icons:** lucide-react
- **Wallet:** @nimiq/hub-api with Nimiq Pay native provider support
- **Database:** In-memory store with JSON file persistence (`data.json`)

## Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** or **yarn** or **pnpm**
- **Nimiq Hub extension** (for wallet features) — [Install here](https://nimiq.com/wallet)

### Installation

```bash
# Clone the repository
git clone https://github.com/esinoob/nimiq-nft-marketplace.git
cd nimiq-nft-marketplace

# Install dependencies
npm install
```

### Development Server

```bash
# Start the dev server (IMPORTANT: use --webpack, not Turbopack)
npx next dev --webpack -p 2001
```

Open [http://localhost:2001](http://localhost:2001) in your browser.

### Production Build

```bash
# Build for production (IMPORTANT: use --webpack flag)
npx next build --webpack

# Start production server
npx next start -p 2001
```

### Running with Docker (Optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx next build --webpack
EXPOSE 2001
CMD ["npx", "next", "start", "-p", "2001"]
```

```bash
docker build -t nimiqnft .
docker run -p 2001:2001 nimiqnft
```

## How It Works

### Wallet Connection

The app supports two wallet connection methods:

1. **Nimiq Hub (Desktop)** — Opens a popup to hub.nimiq.com where users sign with their Nimiq Wallet browser extension
2. **Nimiq Pay (Mobile)** — Auto-detects when running inside Nimiq Pay app's built-in browser and uses the native wallet provider directly (no popup needed)

### Data Persistence

All data (NFTs, collections, activities) is stored in `data.json` on the server:
- Auto-created on first run with demo data
- Survives server restarts
- Debounced saves (500ms) to prevent excessive writes

### Blockchain Architecture

Nimiq does **not** have on-chain smart contracts (no EVM). Instead:
- NFT metadata is stored off-chain
- Payments use native NIM transfers
- Transaction hashes are real and trackable on [nimiqscan.com](https://nimiqscan.com)

### Key Constants

| Constant | Value | Description |
|----------|-------|-------------|
| 1 NIM | 100,000 Luna | Base unit conversion |
| Platform Wallet | `NQ27 9CG2 XP33 N5NH 29EP 2YUS LMKV 3EM0 R4DJ` | Receives mint fees & payments |
| Mint Fee | 50 NIM | Fee for minting a new NFT |
| Gas Fee | ~0.01 NIM | Transaction gas cost |
| Marketplace Fee | 2.5% | Deducted on sale |
| Creator Royalty | 2.5% | Paid to original creator |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Homepage
│   ├── explore/page.tsx      # Browse all NFTs
│   ├── inventory/page.tsx    # Manage your listings
│   ├── mint/page.tsx         # Mint new NFTs
│   ├── nft/[id]/page.tsx     # NFT detail + buy
│   ├── collection/[slug]/    # Collection pages
│   ├── profile/[address]/    # User profiles
│   ├── activity/page.tsx     # Activity feed
│   ├── collections/page.tsx  # All collections
│   ├── about/page.tsx        # About page
│   ├── sell/page.tsx         # (redirects to /inventory)
│   └── api/user/             # Backend API routes
│       ├── nfts/route.ts     # GET/POST/PATCH NFTs
│       ├── collections/      # GET/POST collections
│       └── activity/         # GET/POST activity
├── components/
│   ├── layout/               # Navbar, Footer
│   ├── nft/                  # NFTCard, PurchaseModal
│   └── common/               # PriceDisplay, Modal
├── lib/
│   ├── wallet/               # Nimiq wallet adapter
│   ├── db/store.ts           # Server-side JSON store
│   ├── utils.ts              # formatNimiq, helpers
│   ├── mock-nfts.ts          # Demo data
│   ├── user-store.ts         # Frontend API client
│   └── wallet-provider.tsx   # React wallet context
└── types/                    # TypeScript types
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/nfts` | Fetch all NFTs (with optional `?address=` filter) |
| POST | `/api/user/nfts` | Create/mint a new NFT |
| PATCH | `/api/user/nfts` | Update NFT (price, listed status, owner) |
| GET | `/api/user/collections` | Fetch all collections |
| POST | `/api/user/collections` | Create a new collection |
| GET | `/api/user/activity` | Fetch activity feed |
| POST | `/api/user/activity` | Log a new activity |

## Environment Variables

No environment variables required for basic usage. The app uses:
- `@nimiq/hub-api` with hardcoded mainnet config
- In-memory database with file persistence

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 15+
- Nimiq Pay built-in browser (mobile)

## License

MIT
