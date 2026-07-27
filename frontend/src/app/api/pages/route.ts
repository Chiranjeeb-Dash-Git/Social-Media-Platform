import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

const getActor = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const user = token ? await dataStore.auth.getUserFromToken(token) : null;
  return user ?? dataStore.auth.getOrCreateGuestUser();
};

export async function GET() {
  try {
    const pages = await dataStore.page.findMany();
    return NextResponse.json(pages, { status: 200 });
  } catch (error) {
    console.error("Error fetching pages:", error);
    return NextResponse.json({ error: "Could not fetch pages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getActor(req);
    const body = await req.json();
    const { name, category, description, coverPhoto } = body;

    if (!name || !category) {
      return NextResponse.json({ error: "Name and category required" }, { status: 400 });
    }

    const page = await dataStore.page.create({
      name,
      category,
      description,
      coverPhoto,
      ownerId: user.id
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("Error creating page:", error);
    return NextResponse.json({ error: "Could not create page" }, { status: 500 });
  }
}
