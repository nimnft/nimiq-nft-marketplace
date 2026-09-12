# Nimiq NFT Marketplace — Blockchain Architecture

## Executive Summary

This document defines the blockchain architecture for an NFT marketplace on the Nimiq
network. It is written after thorough research into the current Nimiq protocol capabilities
(Albatross PoS, as of 2026).

**Critical finding: Nimiq does NOT support on-chain smart contracts.**

Nimiq's account model supports exactly four types:
1. Basic Account — simple value transfers
2. HTLC — Hashed Time-Locked Contracts (conditional transfers)
3. Vesting Contract — scheduled fund releases
4. Staking Contract — validator/staker management

There is no virtual machine (EVM or otherwise), no contract programming language (Solidity,
Rust, etc.), and no token standard (ERC-721, ERC-1155, or equivalent). The Nimiq developer
reference confirms this explicitly. Community discussions within the Nimiq ecosystem also
acknowledge that EVM-compatible smart contract capabilities are a future aspiration, not a
current reality.

**This means:**
- On-chain NFT contracts cannot exist
- On-chain royalty enforcement cannot exist
- On-chain auction logic cannot exist
- On-chain marketplace escrow cannot exist
- On-chain collection management cannot exist

This document proposes a safe architecture that works within these constraints.

---

## 1. Nimiq Protocol Capabilities (Verified)

| Feature | Status | Source |
|---------|--------|--------|
| Basic value transfers | ✅ Supported | nimiq.dev/protocol/transactions |
| HTLC contracts | ✅ Supported | nimiq dev reference: accounts-and-contracts |
| Vesting contracts | ✅ Supported | nimiq dev reference: accounts-and-contracts |
| Staking contract | ✅ Supported | nimiq dev reference: validators/staking-contract |
| EVM / Smart contracts | ❌ Not supported | nimiq dev reference, 2026 |
| Token standards (ERC-721 etc.) | ❌ Not supported | No documentation exists |
| On-chain programmable logic | ❌ Not supported | Protocol only has 4 account types |
| Transaction data field | ✅ 64 bytes max | Extended transaction format |
| Transaction validity | 120 blocks (~2 hours) | Protocol rule |
| JSON-RPC API | ✅ Supported | nimiq.github.io/developer-center/build/rpc-docs |

### 1.1 Extended Transaction Data Field

The only "programmable" element on Nimiq is the 64-byte `data` field in extended
transactions. This field is intended for the recipient but carries no execution semantics.
The protocol does not interpret this data — it is simply stored. This is the foundation
for our off-chain NFT protocol.

---

## 2. Architecture Decision: Off-Chain NFT Protocol

Since Nimiq cannot execute on-chain logic, the NFT marketplace uses an **off-chain NFT
protocol with on-chain payment settlement**. This is the same approach used by existing
Nimiq ecosystem projects (e.g., Atelier storefront).

### 2.1 What IS On-Chain

| Element | How |
|---------|-----|
| NFT payment | Native NIM transfer via Hub API `checkout()` |
| Payment proof | Transaction hash stored in marketplace indexer |
| Ownership signal | NIM sent from seller → buyer = ownership transfer |
| Royalty payment | Split into 2 transactions (seller→creator, seller→marketplace) |
| Listing commitment | 64-byte data field encodes NFT ID + operation code |

### 2.2 What IS Off-Chain

| Element | Storage |
|---------|---------|
| NFT metadata | IPFS / Arweave / centralized CDN |
| Ownership registry | Marketplace database (indexed from blockchain) |
| Listing state | Marketplace database |
| Collection data | Marketplace database |
| Auction state | Marketplace database |
| Royalty agreements | Marketplace database (enforced at payment time) |

---

## 3. Data Model

### 3.1 NFT Token Model

```
┌─────────────────────────────────────────────────┐
│                    NFT Token                     │
├─────────────────────────────────────────────────┤
│ id: string              (UUID or content hash)  │
│ tokenId: string         (sequential per creator)│
│ name: string                                    │
│ description: string                             │
│ image: string           (IPFS URI)              │
│ externalUrl: string                            │
│ attributes: Json[]                              │
│                                                   │
│ ── Ownership ──                                 │
│ ownerAddress: string    (Nimiq address)         │
│ creatorAddress: string  (Nimiq address)         │
│                                                   │
│ ── Collection ──                                │
│ collectionId: string                            │
│                                                   │
│ ── Chain Reference ──                           │
│ mintTxHash: string      (on-chain tx hash)      │
│ lastTransferTx: string  (on-chain tx hash)      │
│                                                   │
│ ── Economic ──                                  │
│ royaltyPercent: number  (0-10%, stored in DB)   │
│ price: number           (in Luna, if listed)    │
│ listed: boolean                                 │
│                                                   │
│ ── Timestamps ──                                │
│ createdAt: string                                │
│ updatedAt: string                                │
└─────────────────────────────────────────────────┘
```

### 3.2 Collection Model

```
┌─────────────────────────────────────────────────┐
│                 Collection                       │
├─────────────────────────────────────────────────┤
│ id: string                                      │
│ name: string                                    │
│ slug: string                                    │
│ description: string                             │
│ image: string           (IPFS URI)              │
│ bannerImage: string     (IPFS URI)              │
│ creatorAddress: string                          │
│                                                   │
│ ── Statistics (computed) ──                     │
│ totalItems: number                              │
│ ownersCount: number                             │
│ floorPrice: number      (in Luna)               │
│ totalVolume: number     (in Luna)               │
│                                                   │
│ ── Configuration ──                             │
│ royaltyPercent: number  (default for collection)│
│ maxSupply: number | null                        │
│                                                   │
│ ── Timestamps ──                                │
│ createdAt: string                                │
└─────────────────────────────────────────────────┘
```

### 3.3 Listing Model

```
┌─────────────────────────────────────────────────┐
│                   Listing                        │
├─────────────────────────────────────────────────┤
│ id: string                                      │
│ nftId: string                                   │
│ sellerAddress: string                           │
│                                                   │
│ ── Pricing ──                                   │
│ saleType: "fixed" | "auction"                   │
│ price: number           (in Luna, fixed price)  │
│ startPrice: number      (in Luna, auction)      │
│ reservePrice: number    (in Luna, auction)      │
│ currentBid: number      (in Luna, auction)      │
│ currentBidder: string   (Nimiq address)         │
│                                                   │
│ ── Duration ──                                  │
│ startsAt: string                                 │
│ expiresAt: string                                │
│                                                   │
│ ── State ──                                     │
│ status: "active" | "sold" | "expired" | "cancelled"│
│                                                   │
│ ── Chain Reference ──                           │
│ listTxHash: string      (commitment tx)         │
│ saleTxHash: string      (payment tx)            │
│                                                   │
│ ── Timestamps ──                                │
│ createdAt: string                                │
│ updatedAt: string                                │
└─────────────────────────────────────────────────┘
```

### 3.4 Transaction Index Model

```
┌─────────────────────────────────────────────────┐
│              NftTransaction                      │
├─────────────────────────────────────────────────┤
│ id: string                                      │
│ nftId: string                                   │
│ txHash: string           (on-chain tx hash)     │
│ txType: "mint" | "sale" | "transfer" | "list"   │
│ fromAddress: string                             │
│ toAddress: string                               │
│ price: number           (in Luna)               │
│ fee: number             (marketplace fee, Luna) │
│ royalty: number         (creator royalty, Luna) │
│ blockNumber: number                             │
│ timestamp: string                               │
│ confirmed: boolean                              │
└─────────────────────────────────────────────────┘
```

---

## 4. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Homepage │  │ Explore  │  │ NFT Det  │  │ Mint     │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │              │              │              │          │
│  ┌────┴──────────────┴──────────────┴──────────────┴────┐    │
│  │              useWallet() hook                        │    │
│  │         (WalletProvider context)                     │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │                                      │
│  ┌────────────────────┴────────────────────────────────┐    │
│  │              WalletService                           │    │
│  │     (wraps @nimiq/hub-api)                          │    │
│  └────────────────────┬────────────────────────────────┘    │
└───────────────────────┼──────────────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────────────┐
│                 BLOCKCHAIN LAYER                             │
│                       │                                      │
│  ┌────────────────────┴────────────────────────────────┐    │
│  │           Nimiq Hub (Keyguard)                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │chooseAddr│  │ checkout │  │signMsg   │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │                                      │
│  ┌────────────────────┴────────────────────────────────┐    │
│  │           Nimiq Blockchain                           │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │  Basic Account A  ──NIM──>  Basic Account B   │   │    │
│  │  │  (seller)                   (buyer)           │   │    │
│  │  │                                               │   │    │
│  │  │  tx.data = "NFT:{id}:SALE"  (64 bytes)       │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │  Payment Splits:                              │   │    │
│  │  │                                               │   │    │
│  │  │  Tx 1: seller ──(price - fee - royalty)──>    │   │    │
│  │  │         buyer (NFT transfer)                  │   │    │
│  │  │                                               │   │    │
│  │  │  Tx 2: seller ──royalty──> creator            │   │    │
│  │  │                                               │   │    │
│  │  │  Tx 3: seller ──fee──> marketplace            │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────────────┐
│                 SERVER LAYER                                 │
│                       │                                      │
│  ┌────────────────────┴────────────────────────────────┐    │
│  │           BlockchainService                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │getBalance│  │getBlock  │  │sendRaw   │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           NftService                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │listNft   │  │purchaseNft│ │verifyTx  │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           OwnershipRegistry                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │verify    │  │transfer  │  │getOwner  │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Marketplace Indexer                         │   │
│  │  Listens to blockchain, indexes NFT txs,             │   │
│  │  updates ownership registry, listing states          │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Transaction Flows

### 5.1 Minting Flow

Nimiq has no contract deployment. "Minting" creates an off-chain NFT record
anchored by an on-chain transaction.

```
User clicks "Mint NFT"
         │
         ▼
┌─────────────────────────────┐
│ 1. Upload metadata to IPFS  │
│    Returns: metadataURI     │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ 2. Create NFT record in DB  │
│    status: "pending_mint"   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ 3. Send 0-value tx via Hub  │
│    Hub API checkout()       │
│    recipient: creator addr  │
│    value: 0 (or min fee)    │
│    data: "MINT:{nftId}"     │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ 4. Indexer detects tx       │
│    Confirms mint on-chain   │
│    Updates NFT status       │
│    status: "minted"         │
└─────────────────────────────┘
```

**Limitation:** The "mint" transaction is purely symbolic. It anchors the NFT to the
blockchain via a tx hash, but the protocol does not recognize it as a token creation.
Ownership is tracked off-chain.

### 5.2 Fixed-Price Sale Flow

```
Buyer clicks "Buy Now"
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Marketplace validates:           │
│    - NFT exists and is listed       │
│    - Seller still owns NFT          │
│    - Listing not expired            │
│    - Buyer != seller                │
│    - Buyer has sufficient balance   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. Lock listing in DB              │
│    status: "processing"            │
│    (prevents double-sale)          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 3. Hub API checkout()              │
│    sender: buyer address            │
│    recipient: seller address        │
│    value: price                     │
│    data: "SALE:{nftId}"            │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 4. On tx confirmation:             │
│    a. Record sale in NftTransaction │
│    b. Transfer ownership in DB      │
│       ownerAddress = buyer          │
│    c. Update listing status: "sold" │
│    d. Process royalty (step 5)      │
│    e. Process marketplace fee (step 6)│
└─────────────────────────────────────┘
```

### 5.3 Royalty Payment Flow

Royalties are NOT enforced on-chain. They are a marketplace convention enforced
by the application layer.

```
Sale confirmed
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Calculate royalty:               │
│    royalty = price × royaltyPercent │
│    (from NFT record, default 2.5%)  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. Send royalty tx via Hub API:     │
│    sender: seller                    │
│    recipient: creator                │
│    value: royalty                    │
│    data: "ROYALTY:{nftId}"          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 3. Send marketplace fee tx via Hub: │
│    sender: seller                    │
│    recipient: marketplace treasury   │
│    value: fee                        │
│    data: "FEE:{nftId}"              │
└─────────────────────────────────────┘
```

**Security note:** The seller must sign BOTH transactions. If the seller refuses to
pay royalty/fee, the marketplace can refuse to update ownership. This is the primary
enforcement mechanism.

### 5.4 Auction Flow

Auctions are entirely off-chain. Bids are signed messages (not on-chain transactions).

```
Seller creates auction
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Seller signs message:            │
│    "LIST AUCTION {nftId}            │
│     START {startPrice}              │
│     RESERVE {reservePrice}          │
│     DURATION {expiresAt}"           │
│    via Hub API signMessage()        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. Marketplace stores signed listing│
│    (proof of seller authorization)  │
└─────────────────────────────────────┘

Bidder places bid
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Bidder signs message:            │
│    "BID {nftId}                     │
│     AMOUNT {bidAmount}              │
│     EXPIRES {bidExpiry}"            │
│    via Hub API signMessage()        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. Marketplace validates bid:       │
│    - Bidder has sufficient balance  │
│    - Bid > current highest bid      │
│    - Auction not expired            │
│    - Stores signed bid              │
└─────────────────────────────────────┘

Auction ends (off-chain timer)
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Highest bid wins                 │
│ 2. Seller signs transfer message    │
│ 3. Buyer sends payment via checkout │
│ 4. Ownership transferred in DB      │
└─────────────────────────────────────┘
```

**Limitation:** Auctions have no on-chain enforcement. The seller could refuse to
transfer, and the blockchain cannot prevent it. The marketplace enforces this by
requiring signed messages and maintaining reputation scores.

### 5.5 Transfer Flow (P2P, no marketplace)

```
Owner sends NFT to recipient
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Owner signs message:             │
│    "TRANSFER {nftId}                │
│     TO {recipientAddress}"          │
│    via Hub API signMessage()        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. Recipient acknowledges           │
│ 3. Marketplace updates ownership    │
│ 4. Optional: 0-value tx as proof    │
└─────────────────────────────────────┘
```

---

## 6. Security Considerations

### 6.1 Double-Sale Prevention

**Problem:** Without on-chain escrow, a seller could list the same NFT on multiple
marketplaces and sell it twice.

**Mitigation:**
1. **Database locking:** When a purchase is initiated, the listing status is set to
   "processing" in the database. This prevents concurrent purchases.
2. **Signed seller authorization:** The seller must sign a message authorizing the sale.
   Each signed message includes a nonce and expiry, preventing replay.
3. **First-confirmed-wins:** If two marketplaces process a sale simultaneously, the first
   transaction confirmed on-chain wins. The other marketplace detects the ownership
   change and cancels the pending sale.
4. **Cross-marketplace indexing:** The marketplace indexer monitors ALL transactions
   involving the NFT's known addresses. If a transfer is detected outside the marketplace,
   pending listings are cancelled.

### 6.2 Ownership Validation

**Problem:** Without on-chain token ownership, how do we verify who owns an NFT?

**Mitigation:**
1. **Chain of custody:** The marketplace maintains a complete chain of custody for each
   NFT, anchored by on-chain transaction hashes.
2. **Balance verification:** Before listing, verify the seller's NIM balance is sufficient
   for the transaction (indicates real wallet control).
3. **Message signing:** Ownership claims must be signed by the claimed owner's private
   key via Hub API `signMessage()`.
4. **Tx history verification:** The indexer verifies each ownership transfer by checking
   the on-chain transaction confirms the correct sender, recipient, and amount.

### 6.3 Unauthorized Transfer Prevention

**Problem:** Without on-chain access control, anyone could claim to transfer any NFT.

**Mitigation:**
1. **Signed transfer authorization:** Transfers require a signed message from the
   current owner, created via Hub API `signMessage()`.
2. **Transfer verification:** The marketplace verifies the signature matches the
   claimed owner's public key.
3. **Owner-only operations:** Only the current owner (per the off-chain registry)
   can initiate sales, transfers, or cancellations.
4. **Hub API integration:** The Hub API popup shows the user exactly what they are
   signing, preventing blind signing.

### 6.4 Marketplace Fund Protection

**Problem:** Without on-chain escrow, marketplace funds are at risk during transactions.

**Mitigation:**
1. **Atomic-ish transactions:** The payment goes directly from buyer to seller via
   Hub API `checkout()`. The marketplace never holds funds.
2. **Royalty/fee as separate transactions:** These are sent by the seller AFTER
   receiving payment. The marketplace can refuse to update ownership until
   all side payments are confirmed.
3. **Treasury address:** Marketplace fees go to a known treasury address. This
   address is hardcoded and verifiable.
4. **No custodial risk:** The marketplace never holds user funds. All payments
   are peer-to-peer.

### 6.5 Failed Transaction Handling

**Problem:** Nimiq transactions can fail (insufficient balance after submission).

**Mitigation:**
1. **Pre-validation:** Before initiating checkout, validate the buyer has sufficient
   balance via `getBalance()`.
2. **Timeout handling:** If a transaction is not confirmed within 120 blocks
   (~2 hours), the listing is restored to "active" status.
3. **Partial failure:** If the royalty/fee transactions fail, the ownership transfer
   is held in "pending" state until all payments are confirmed.
4. **Retry logic:** The marketplace can retry failed side payments on behalf of
   the seller (with seller's signed authorization).

### 6.6 Reentrancy Considerations

**Problem:** Without smart contracts, traditional reentrancy does not apply. However,
a similar pattern exists with concurrent transactions.

**Mitigation:**
1. **Optimistic locking:** The database uses optimistic locking on listing status.
   If a listing is modified between read and write, the operation is retried.
2. **Idempotent operations:** All operations are idempotent. Replaying a confirmed
   transaction has the same effect.
3. **Nonce tracking:** Each signed message includes a nonce. The marketplace
   rejects messages with used nonces.

### 6.7 Integer/Price Manipulation

**Problem:** Without on-chain validation, prices could be manipulated.

**Mitigation:**
1. **Server-side validation:** All prices are validated server-side before processing.
2. **Luna precision:** All prices are stored in Luna (integer), not NIM (decimal).
   This prevents floating-point manipulation.
3. **Royalty caps:** Royalty percentages are capped at 10% in the database schema.
4. **Price bounds:** Minimum price is 1 Luna (0.00001 NIM). Maximum price is
   validated against the buyer's balance.
5. **Fee calculation server-side:** All fee calculations happen server-side, never
   in the client.

### 6.8 Royalty Limit Validation

**Problem:** Royalties are not enforced on-chain. How do we prevent manipulation?

**Mitigation:**
1. **Creator-set royalty:** The royalty percentage is set by the creator at mint
   time and stored in the database. It cannot be changed after minting.
2. **Maximum cap:** Royalty is capped at 10% (configurable per marketplace).
3. **Minimum payout:** Royalty transactions must be at least 1 Luna.
4. **Verification:** Before updating ownership, the marketplace verifies that
   the royalty transaction was confirmed on-chain with the correct amount.
5. **Reputation system:** Sellers who refuse to pay royalties are flagged in
   the marketplace database and may be restricted from future listings.

### 6.9 Signature Security

**Problem:** Signed messages could be replayed or forged.

**Mitigation:**
1. **Message prefix:** All signed messages use the Nimiq Hub API prefix
   (`\x16Nimiq Signed Message:\n` + length + message). This prevents
   signing valid transactions.
2. **Nonce in messages:** Every signed message includes a unique nonce
   and expiry timestamp.
3. **Signature verification:** The marketplace verifies signatures using
   `@nimiq/core`'s `Signature.verify()` method.
4. **One-time use:** Each signed message can only be used once. The marketplace
   tracks used message hashes.

---

## 7. Storage Strategy

### 7.1 On-Chain (Nimiq Blockchain)

| Data | Location | Purpose |
|------|----------|---------|
| NFT ID reference | tx.data (64 bytes) | Anchors NFT to blockchain |
| Payment amount | tx.value | Proves payment occurred |
| Sender/Recipient | tx.sender / tx.recipient | Proves parties involved |
| Transaction hash | tx.hash | Unique proof of transaction |

### 7.2 Off-Chain (IPFS/Arweave)

| Data | Format | Purpose |
|------|--------|---------|
| NFT image/video | Original file | Visual representation |
| NFT metadata | JSON (ERC-721 compatible) | Attributes, description |
| Collection image | Image file | Collection branding |
| Collection metadata | JSON | Collection description |

### 7.3 Off-Chain (Marketplace Database)

| Data | Purpose |
|------|---------|
| NFT records | Ownership, pricing, status |
| Listing records | Active/expired listings |
| Transaction index | Chain of custody |
| User profiles | Addresses, preferences |
| Signed messages | Sale/bid authorizations |
| Reputation scores | Trustworthiness |

### 7.4 Metadata Format

NFT metadata follows the ERC-721 metadata standard for compatibility:

```json
{
  "name": "Nimiq NFT #1",
  "description": "A unique digital asset on Nimiq",
  "image": "ipfs://Qm.../image.png",
  "external_url": "https://marketplace.nimiq.com/nft/1",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Rarity", "value": "Legendary" }
  ],
  "seller_address": "NQ07 ...",
  "creator_address": "NQ07 ...",
  "collection_id": "nimiq-punks",
  "token_id": "1",
  "mint_tx_hash": "0x..."
}
```

---

## 8. Feature Limitations and Honest Assessment

### 8.1 What CAN Be Enforced On-Chain

| Feature | Enforcement |
|---------|-------------|
| Payment transfer | ✅ Native NIM tx via Hub API |
| Payment proof | ✅ Tx hash is immutable |
| Balance verification | ✅ RPC getBalance() |
| Transaction confirmation | ✅ RPC getTransactionReceipt() |

### 8.2 What CANNOT Be Enforced On-Chain

| Feature | Risk Level | Mitigation |
|---------|------------|------------|
| NFT ownership | HIGH | Off-chain registry + signed messages |
| Royalty payment | HIGH | Marketplace convention, not protocol rule |
| Transfer authorization | HIGH | Signed messages via Hub API |
| Listing uniqueness | MEDIUM | Database locking + cross-marketplace indexing |
| Auction finality | HIGH | Off-chain + signed messages |
| Collection membership | LOW | Off-chain database only |
| Metadata integrity | MEDIUM | IPFS content addressing |

### 8.3 Cross-Marketplace Risk

Since NFT ownership is tracked off-chain, a seller could:
1. List an NFT on Marketplace A
2. Sell it on Marketplace B (direct P2P transfer)
3. Marketplace A still shows them as owner until indexer detects the transfer

**Mitigation:** The marketplace indexer runs continuously and detects ALL transfers
involving known NFT addresses. When a transfer is detected, all pending listings
for that NFT are automatically cancelled.

### 8.4 Seller Refusal Risk

After receiving payment, a seller could refuse to:
1. Send the royalty transaction
2. Send the marketplace fee transaction
3. Acknowledge the ownership transfer

**Mitigation:**
1. **Pre-signed authorization:** Before the buyer sends payment, the seller must
   sign a message authorizing the full transaction (payment + royalty + fee).
2. **Escrow-like pattern:** The marketplace holds the ownership update in
   "pending" state until ALL transactions are confirmed.
3. **Reputation penalty:** Sellers who refuse to complete transactions are
   flagged and may be banned from future listings.

---

## 9. Implementation Roadmap

### Phase 1: Core Marketplace (Current)
- [x] Wallet connection via Hub API
- [x] Balance retrieval via JSON-RPC
- [x] NFT listing (off-chain)
- [x] Fixed-price sales (direct NIM transfer)
- [x] Ownership transfer tracking

### Phase 2: Enhanced Features
- [ ] IPFS metadata storage
- [ ] Auction system (off-chain bids + signed messages)
- [ ] Cross-marketplace indexing
- [ ] Reputation system
- [ ] Message signing verification

### Phase 3: Advanced Features
- [ ] Multi-marketplace indexer
- [ ] Collection verification
- [ ] Batch operations
- [ ] Mobile-optimized flows

---

## 10. Conclusion

The Nimiq NFT marketplace operates within the constraints of a protocol that does not
support on-chain smart contracts. This architecture:

1. **Honestly identifies limitations** — No on-chain NFT, royalty, or auction enforcement
2. **Uses available primitives** — Basic transfers, Hub API signing, JSON-RPC
3. **Maximizes security** — Signed messages, ownership verification, cross-marketplace indexing
4. **Fails safely** — If enforcement fails, the marketplace can detect and respond

The trade-off is clear: we sacrifice on-chain enforcement for the ability to operate
on Nimiq. The security model relies on the marketplace application layer rather than
the protocol layer. This is an acceptable trade-off for an ecosystem that does not
currently support programmable contracts.

**The safest architecture is one that acknowledges its limitations and designs around them,
rather than pretending they don't exist.**
