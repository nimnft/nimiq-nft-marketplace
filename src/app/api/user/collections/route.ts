import { NextRequest } from "next/server";
import { getStore } from "@/lib/db/store";

export async function GET(request: NextRequest) {
  const store = getStore();
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  let collections = store.getAllCollections();
  if (address) {
    collections = collections.filter((c) => c.creatorAddress === address);
  }

  return Response.json({ data: collections });
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();
    const { name, description, image, category, creatorAddress } = body;

    if (!name || !creatorAddress) {
      return Response.json({ error: "Name and creatorAddress required" }, { status: 400 });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

    let user = store.getUserByAddress(creatorAddress);
    if (!user) {
      user = store.createUser({
        id: creatorAddress, address: creatorAddress,
        name: `User ${creatorAddress.slice(0, 10)}`,
        avatar: "", bio: "", joinedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }

    const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const collection = store.createCollection({
      id, name: name.trim().slice(0, 100), slug,
      description: (description || "").trim().slice(0, 2000),
      image: image || "", bannerImage: image || "",
      creatorAddress, creatorId: user.id, royaltyPercent: 2.5,
      category: category || "art", featured: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      totalItems: 0, ownersCount: 0, floorPrice: 0, totalVolume: 0,
    });

    return Response.json({ data: collection }, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
