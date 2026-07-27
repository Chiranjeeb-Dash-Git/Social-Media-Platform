import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

const getActor = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const user = token ? await dataStore.auth.getUserFromToken(token) : null;
  return user ?? dataStore.auth.getOrCreateGuestUser();
};

export async function POST(req: Request) {
  try {
    const user = await getActor(req);
    const { postId, commentId, type } = await req.json();

    if (!type || (!postId && !commentId)) {
      return NextResponse.json({ error: "Missing reaction target or type" }, { status: 400 });
    }

    const validTypes = ["LIKE", "LOVE", "CARE", "HAHA", "WOW", "SAD", "ANGRY"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    const res = await dataStore.reaction.toggle({
      userId: user.id,
      postId,
      commentId,
      type
    });

    return NextResponse.json(res, { status: 200 });
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return NextResponse.json({ error: "Could not toggle reaction" }, { status: 500 });
  }
}
