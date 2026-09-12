import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";

export async function GET(request: NextRequest) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const nftId = searchParams.get("nftId");

  let activities = store.getAllActivity();

  if (nftId) activities = activities.filter((a) => a.nftId === nftId);
  if (address) activities = activities.filter((a) => a.userAddress === address || a.fromAddress === address || a.toAddress === address);

  // Enrich
  const enriched = activities.map((act) => {
    const nft = act.nftId ? store.getNft(act.nftId) : null;
    const fromUser = act.fromAddress ? store.getUserByAddress(act.fromAddress) : null;
    const toUser = act.toAddress ? store.getUserByAddress(act.toAddress) : null;
    const user = act.userAddress ? store.getUserByAddress(act.userAddress) : null;
    const collection = nft ? store.getCollection(nft.collectionId) : null;

    return {
      id: act.id, type: act.type,
      nft: nft ? {
        id: nft.id, name: nft.name, description: nft.description, image: nft.image,
        price: nft.price || 0, currency: "NIM",
        owner: { address: nft.ownerAddress, name: "", avatar: "" },
        creator: { address: nft.creatorAddress, name: "", avatar: "" },
        collection: collection ? { id: collection.id, name: collection.name, slug: collection.slug } : { id: "", name: "Unknown", slug: "" },
        tokenId: nft.tokenId, contractAddress: "", traits: [], listed: nft.listed, createdAt: nft.createdAt,
      } : { id: act.nftId || "", name: "Deleted NFT", description: "", image: "", price: 0, currency: "NIM", owner: { address: "", name: "" }, creator: { address: "", name: "" }, collection: { id: "", name: "", slug: "" }, tokenId: "", contractAddress: "", traits: [], listed: false, createdAt: "" },
      from: fromUser ? { address: fromUser.address, name: fromUser.name, avatar: fromUser.avatar } : user ? { address: user.address, name: user.name, avatar: user.avatar } : undefined,
      to: toUser ? { address: toUser.address, name: toUser.name, avatar: toUser.avatar } : undefined,
      price: act.price || 0, currency: "NIM",
      timestamp: act.createdAt, txHash: act.txHash || "",
    };
  });

  enriched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return Response.json({ data: enriched });
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();
    const { type, nftId, collectionId, userAddress, fromAddress, toAddress, price, txHash } = body;

    if (!type || !userAddress) {
      return Response.json({ error: "type and userAddress required" }, { status: 400 });
    }

    const activity = store.createActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type, nftId: nftId || undefined, collectionId: collectionId || undefined,
      userAddress, userId: userAddress,
      fromAddress, toAddress, price: price || 0,
      txHash: txHash || "", createdAt: new Date().toISOString(),
    });

    return Response.json({ data: activity }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
