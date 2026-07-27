import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

const getActor = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const user = token ? await dataStore.auth.getUserFromToken(token) : null;
  return user ?? dataStore.auth.getOrCreateGuestUser();
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const maxPrice = url.searchParams.get("maxPrice");

    let items = await dataStore.marketplace.findMany();

    if (category && category !== "All") {
      items = items.filter(i => i.category.toLowerCase() === category.toLowerCase());
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      items = items.filter(i => i.price <= Number(maxPrice));
    }

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error("Error fetching marketplace items:", error);
    return NextResponse.json({ error: "Could not fetch marketplace items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getActor(req);
    const body = await req.json();
    const { title, description, price, location, category, condition, imageUrls } = body;

    if (!title || !price || !description) {
      return NextResponse.json({ error: "Title, description and price required" }, { status: 400 });
    }

    const item = await dataStore.marketplace.create({
      title,
      description,
      price,
      location,
      category,
      condition,
      imageUrls,
      sellerId: user.id
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating marketplace listing:", error);
    return NextResponse.json({ error: "Could not create marketplace listing" }, { status: 500 });
  }
}
