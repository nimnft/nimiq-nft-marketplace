/**
 * Blockchain Indexer Service
 *
 * Listens to Nimiq blockchain transactions and indexes NFT-related activity.
 * Uses JSON-RPC to query the blockchain for new blocks and transactions.
 *
 * Architecture:
 * - Polls for new blocks via JSON-RPC
 * - Identifies NFT-related transactions by data field pattern
 * - Updates ownership registry in the database
 * - Maintains chain of custody for each NFT
 *
 * The blockchain remains the source of truth for ownership.
 * This indexer simply mirrors that truth into the searchable database.
 */

import { getBlockchainService } from "../wallet/blockchain";
import { getStore } from "../db/store";

const NFT_TX_PREFIXES = {
  MINT: "MINT:",
  SALE: "SALE:",
  TRANSFER: "TRANSFER:",
  ROYALTY: "ROYALTY:",
  FEE: "FEE:",
  LIST: "LIST:",
};

export class BlockchainIndexer {
  private blockchain = getBlockchainService("mainnet");
  private isRunning = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the indexer.
   * Polls for new blocks every 10 seconds.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("Blockchain indexer started");

    // Initial sync
    this.sync();

    // Poll for new blocks
    this.pollInterval = setInterval(() => {
      this.sync();
    }, 10_000);
  }

  /**
   * Stop the indexer.
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log("Blockchain indexer stopped");
  }

  /**
   * Sync new blocks since last indexed.
   */
  async sync(): Promise<void> {
    try {
      const store = getStore();
      const lastIndexed = store.getLastIndexedBlock();
      const currentBlock = await this.blockchain.getBlockNumber();

      if (currentBlock <= lastIndexed) {
        return; // No new blocks
      }

      console.log(`Indexing blocks ${lastIndexed + 1} to ${currentBlock}`);

      // Process each new block
      for (let blockNum = lastIndexed + 1; blockNum <= currentBlock; blockNum++) {
        await this.processBlock(blockNum);
      }

      // Update last indexed block
      store.updateLastIndexedBlock(currentBlock);
    } catch (error) {
      console.error("Indexer sync error:", error);
    }
  }

  /**
   * Process a single block.
   * In production, this would fetch the full block via JSON-RPC.
   * For now, we simulate with mock data.
   */
  private async processBlock(blockNumber: number): Promise<void> {
    // In production:
    // 1. Fetch block via RPC: getBlockByNumber(blockNumber, true)
    // 2. Extract transactions
    // 3. Filter for NFT-related txs (data field matches patterns)
    // 4. Process each NFT tx

    // Mock: Simulate finding NFT transactions
    // In reality, this would parse tx.data fields
  }

  /**
   * Process an NFT transaction.
   * Parses the data field to determine the operation type.
   */
  processNftTransaction(tx: {
    hash: string;
    sender: string;
    recipient: string;
    value: number;
    data?: string;
    blockNumber: number;
  }): void {
    const store = getStore();

    if (!tx.data) return;

    // Parse the data field
    const dataStr = typeof tx.data === "string" ? tx.data : new TextDecoder().decode(tx.data);

    // Check for NFT operation prefixes
    for (const [op, prefix] of Object.entries(NFT_TX_PREFIXES)) {
      if (dataStr.startsWith(prefix)) {
        const nftId = dataStr.slice(prefix.length);

        switch (op) {
          case "MINT":
            this.handleMint(tx, nftId);
            break;
          case "SALE":
            this.handleSale(tx, nftId);
            break;
          case "TRANSFER":
            this.handleTransfer(tx, nftId);
            break;
          case "ROYALTY":
            this.handleRoyalty(tx, nftId);
            break;
          case "FEE":
            this.handleFee(tx, nftId);
            break;
        }

        break;
      }
    }
  }

  /**
   * Handle a mint transaction.
   * Updates the NFT's mint tx hash.
   */
  private handleMint(tx: { hash: string; sender: string }, nftId: string): void {
    const store = getStore();
    const nft = store.getNft(nftId);

    if (nft) {
      store.updateNft(nftId, { mintTxHash: tx.hash });

      // Create activity
      store.createActivity({
        id: crypto.randomUUID(),
        type: "mint",
        nftId,
        collectionId: nft.collectionId,
        userAddress: tx.sender,
        userId: tx.sender,
        txHash: tx.hash,
        blockNumber: 0,
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle a sale transaction.
   * Transfers ownership and records the sale.
   */
  private handleSale(
    tx: { hash: string; sender: string; recipient: string; value: number; blockNumber: number },
    nftId: string,
  ): void {
    const store = getStore();
    const nft = store.getNft(nftId);

    if (nft) {
      // Update ownership
      store.updateNft(nftId, {
        ownerAddress: tx.recipient,
        lastTransferTx: tx.hash,
        listed: false,
        price: undefined,
      });

      // Update listing
      const listing = store.getListingByNft(nftId);
      if (listing) {
        store.updateListing(listing.id, {
          status: "sold",
          saleTxHash: tx.hash,
        });
      }

      // Create sale record
      store.createSale({
        id: crypto.randomUUID(),
        nftId,
        listingId: listing?.id || "",
        buyerAddress: tx.recipient,
        buyerId: tx.recipient,
        sellerAddress: tx.sender,
        sellerId: tx.sender,
        price: tx.value,
        marketplaceFee: 0,
        creatorRoyalty: 0,
        txHash: tx.hash,
        blockNumber: tx.blockNumber,
        confirmed: true,
        soldAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      // Create activity
      store.createActivity({
        id: crypto.randomUUID(),
        type: "sale",
        nftId,
        collectionId: nft.collectionId,
        userAddress: tx.sender,
        userId: tx.sender,
        fromAddress: tx.sender,
        toAddress: tx.recipient,
        price: tx.value,
        txHash: tx.hash,
        blockNumber: tx.blockNumber,
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle a transfer transaction.
   * Updates ownership without a sale.
   */
  private handleTransfer(
    tx: { hash: string; sender: string; recipient: string; blockNumber: number },
    nftId: string,
  ): void {
    const store = getStore();
    const nft = store.getNft(nftId);

    if (nft) {
      store.updateNft(nftId, {
        ownerAddress: tx.recipient,
        lastTransferTx: tx.hash,
      });

      store.createActivity({
        id: crypto.randomUUID(),
        type: "transfer",
        nftId,
        collectionId: nft.collectionId,
        userAddress: tx.sender,
        userId: tx.sender,
        fromAddress: tx.sender,
        toAddress: tx.recipient,
        txHash: tx.hash,
        blockNumber: tx.blockNumber,
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle a royalty payment.
   */
  private handleRoyalty(
    tx: { hash: string; sender: string; recipient: string; value: number },
    nftId: string,
  ): void {
    const store = getStore();
    const nft = store.getNft(nftId);

    if (nft) {
      store.createActivity({
        id: crypto.randomUUID(),
        type: "sale",
        nftId,
        collectionId: nft.collectionId,
        userAddress: tx.sender,
        userId: tx.sender,
        fromAddress: tx.sender,
        toAddress: tx.recipient,
        price: tx.value,
        txHash: tx.hash,
        metadata: { type: "royalty" },
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle a marketplace fee payment.
   */
  private handleFee(
    tx: { hash: string; sender: string; recipient: string; value: number },
    nftId: string,
  ): void {
    // Fee payments are recorded but don't affect ownership
    // The activity is already recorded by the sale handler
  }

  /**
   * Verify an NFT's ownership by checking the blockchain.
   * Returns the current owner address or null if unverifiable.
   */
  async verifyOwnership(nftId: string): Promise<string | null> {
    const store = getStore();
    const nft = store.getNft(nftId);

    if (!nft) return null;

    // In production:
    // 1. Trace the chain of custody from mint tx
    // 2. Verify each transfer on-chain
    // 3. Return the verified current owner

    // For now, return the stored owner
    return nft.ownerAddress;
  }

  /**
   * Get the indexer status.
   */
  getStatus() {
    const store = getStore();
    return {
      isRunning: this.isRunning,
      lastIndexedBlock: store.getLastIndexedBlock(),
    };
  }
}

// Singleton instance
let indexerInstance: BlockchainIndexer | null = null;

export function getBlockchainIndexer(): BlockchainIndexer {
  if (!indexerInstance) {
    indexerInstance = new BlockchainIndexer();
  }
  return indexerInstance;
}
