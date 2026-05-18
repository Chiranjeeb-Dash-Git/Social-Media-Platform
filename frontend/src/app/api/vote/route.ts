import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

const getToken = (req: Request) => {
  const authHeader = req.headers.get("authorization");
  return authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
};

const getActor = async (req: Request) => {
  const token = getToken(req);
  const user = token ? await dataStore.auth.getUserFromToken(token) : null;
  return user ?? dataStore.auth.getOrCreateGuestUser();
};

export async function PATCH(req: Request) {
  try {
    const user = await getActor(req);
    const body = await req.json();
    const { postId, type } = body;

    if (!postId || !["UP", "DOWN"].includes(type)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await dataStore.vote.toggle({
      userId: user.id,
      postId,
      type,
    });

    if (!result) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error voting:", error);
    return NextResponse.json({ error: "Could not process vote" }, { status: 500 });
  }
}
