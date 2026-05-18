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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "Post id is required" }, { status: 400 });
    }

    const comments = await dataStore.comment.findMany({ where: { postId } });
    return NextResponse.json(comments, { status: 200 });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Could not fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getActor(req);
    const body = await req.json();
    const postId = typeof body.postId === "string" ? body.postId : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!postId || !content) {
      return NextResponse.json(
        { error: "Post id and comment text are required" },
        { status: 400 }
      );
    }

    const comment = await dataStore.comment.create({
      data: {
        postId,
        content,
        authorId: user.id,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Could not create comment" },
      { status: 500 }
    );
  }
}
