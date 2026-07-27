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
    const user = await getActor(req);
    const lists = await dataStore.lists.findMany(user.id);
    return NextResponse.json(lists, { status: 200 });
  } catch (error) {
    console.error("Error fetching custom lists:", error);
    return NextResponse.json({ error: "Could not fetch custom lists" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getActor(req);
    const { name, memberIds } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const list = await dataStore.lists.create(user.id, name, memberIds || []);
    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Error creating custom list:", error);
    return NextResponse.json({ error: "Could not create custom list" }, { status: 500 });
  }
}
