import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";

export async function GET(request: NextRequest) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const collectionId = searchParams.get("collectionId");

  let nfts = store.getAllNfts();
  if (address) nfts = nfts.filter((n) => n.ownerAddress === address || n.creatorAddress === address);
  if (collectionId) nfts = nfts.filter((n) => n.collectionId === collectionId);

  // Enrich with owner/creator/collection data
  const enriched = nfts.map((nft) => {
    const owner = store.getUserByAddress(nft.ownerAddress);
    const creator = store.getUserByAddress(nft.creatorAddress);
    const collection = store.getCollection(nft.collectionId);
    return {
      id: nft.id, name: nft.name, description: nft.description, image: nft.image,
      price: nft.price || 0, currency: "NIM",
      owner: owner ? { address: owner.address, name: owner.name, avatar: owner.avatar, bio: owner.bio, joinedAt: owner.joinedAt, followersCount: 0, followingCount: 0, nftCount: 0, collectionCount: 0 }
        : { address: nft.ownerAddress, name: "Unknown", avatar: "", bio: "", joinedAt: "", followersCount: 0, followingCount: 0, nftCount: 0, collectionCount: 0 },
      creator: creator ? { address: creator.address, name: creator.name, avatar: creator.avatar, bio: creator.bio, joinedAt: creator.joinedAt, followersCount: 0, followingCount: 0, nftCount: 0, collectionCount: 0 }
        : { address: nft.creatorAddress, name: "Unknown", avatar: "", bio: "", joinedAt: "", followersCount: 0, followingCount: 0, nftCount: 0, collectionCount: 0 },
      collection: collection ? { id: collection.id, name: collection.name, slug: collection.slug, description: collection.description, image: collection.image, bannerImage: collection.bannerImage,
        creator: { address: collection.creatorAddress, name: "", avatar: "", bio: "", joinedAt: "", followersCount: 0, followingCount: 0, nftCount: 0, collectionCount: 0 },
        floorPrice: collection.floorPrice, totalVolume: collection.totalVolume, totalItems: collection.totalItems, ownersCount: collection.ownersCount,
        featured: collection.featured, category: collection.category, createdAt: collection.createdAt }
        : null,
      tokenId: nft.tokenId, contractAddress: "NQ27 9CG2 XP33 N5NH 29EP 2YUS LMKV 3EM0 R4DJ",
      traits: (nft.attributes || []).map((a: any) => ({ type: a.trait_type, value: a.value, rarity: 0 })),
      listed: nft.listed, createdAt: nft.createdAt,
      mintTxHash: nft.mintTxHash, royaltyPercent: nft.royaltyPercent,
    };
  });

  return Response.json({ data: enriched });
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();
    const { name, description, image, collectionId, creatorAddress, royalty, txHash, attributes } = body;

    if (!name || !creatorAddress) {
      return Response.json({ error: "name and creatorAddress required" }, { status: 400 });
    }

    let user = store.getUserByAddress(creatorAddress);
    if (!user) {
      user = store.createUser({
        id: creatorAddress, address: creatorAddress,
        name: `User ${creatorAddress.slice(0, 10)}`,
        avatar: "", bio: "", joinedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }

    const finalCollectionId = collectionId || (() => {
      const id = `col-default-${creatorAddress.slice(0, 8)}`;
      if (!store.getCollection(id)) {
        store.createCollection({
          id, name: "My Collection", slug: `my-collection-${creatorAddress.slice(0, 8)}`,
          description: "", image: image || "", bannerImage: "",
          creatorAddress, creatorId: user.id, royaltyPercent: 2.5, category: "art", featured: false,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          totalItems: 0, ownersCount: 0, floorPrice: 0, totalVolume: 0,
        });
      }
      return id;
    })();

    const col = store.getCollection(finalCollectionId);
    const tokenId = col ? String(col.totalItems + 1).padStart(6, "0") : "000001";
    const nftId = `nft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const nft = store.createNft({
      id: nftId, tokenId, name: name.trim().slice(0, 100),
      description: (description || "").trim().slice(0, 2000),
      image: image || "",
      attributes: Array.isArray(attributes) ? attributes.slice(0, 20) : [],
      ownerAddress: creatorAddress, ownerId: user.id,
      creatorAddress, creatorId: user.id,
      collectionId: finalCollectionId,
      mintTxHash: txHash || "",
      royaltyPercent: royalty ?? 2.5,
      price: undefined, listed: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      mintedAt: new Date().toISOString(),
    });

    store.createActivity({
      id: `act-${Date.now()}`, type: "mint",
      nftId, collectionId: finalCollectionId,
      userAddress: creatorAddress, userId: user.id,
      txHash: txHash || "", createdAt: new Date().toISOString(),
    });

    // Enrich for response
    const enriched = {
      ...nft,
      owner: { address: user.address, name: user.name, avatar: user.avatar, bio: user.bio, joinedAt: user.joinedAt, followersCount: 0, followingCount: 0, nftCount: 0, collectionCount: 0 },
      creator: { address: user.address, name: user.name, avatar: user.avatar, bio: user.bio, joinedAt: user.joinedAt, followersCount: 0, followingCount: 0, nftCount: 0, collectionCount: 0 },
      collection: col ? { id: col.id, name: col.name, slug: col.slug } : null,
      traits: (nft.attributes || []).map((a: any) => ({ type: a.trait_type, value: a.value, rarity: 0 })),
    };

    return Response.json({ data: enriched }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();
    const { nftId, price, listed, ownerAddress, name, image, description, tokenId, collectionId, creatorAddress } = body;

    if (!nftId) {
      return Response.json({ error: "nftId required" }, { status: 400 });
    }

    const existing = store.getNft(nftId);

    if (!existing && ownerAddress) {
      const nft = store.createNft({
        id: nftId,
        tokenId: tokenId || nftId,
        name: name || "Untitled",
        description: description || "",
        image: image || "",
        attributes: [],
        ownerAddress, ownerId: ownerAddress,
        creatorAddress: creatorAddress || ownerAddress, creatorId: creatorAddress || ownerAddress,
        collectionId: collectionId || "col-default",
        mintTxHash: "", royaltyPercent: 2.5,
        price: price ?? 0, listed: listed ?? false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        mintedAt: new Date().toISOString(),
      });
      return Response.json({ data: nft });
    }

    const updates: Record<string, any> = {};
    if (typeof price !== "undefined") updates.price = price;
    if (typeof listed !== "undefined") updates.listed = listed;
    if (ownerAddress) updates.ownerAddress = ownerAddress;

    const updated = store.updateNft(nftId, updates);
    return Response.json({ data: updated });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
