import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ postId: string }> | { postId: string };
};

const getToken = (req: Request) => {
  const authHeader = req.headers.get("authorization");
  return authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
};

const getAuthenticatedUser = async (req: Request) => {
  const token = getToken(req);
  return token ? dataStore.auth.getUserFromToken(token) : null;
};

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { postId } = await params;
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to edit this post" },
        { status: 401 }
      );
    }

    const existingPost = await dataStore.post.findUnique({ where: { id: postId } });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.author.id !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own posts" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const content =
      typeof body.content === "string" ? body.content.trim() : undefined;

    if (title !== undefined && title.length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const post = await dataStore.post.update({
      where: { id: postId },
      data: {
        title,
        content,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post, { status: 200 });
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json({ error: "Could not update post" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { postId } = await params;
    const user = await getAuthenticatedUser(_req);

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to delete this post" },
        { status: 401 }
      );
    }

    const existingPost = await dataStore.post.findUnique({ where: { id: postId } });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.author.id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    const post = await dataStore.post.delete({ where: { id: postId } });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true, post }, { status: 200 });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json({ error: "Could not delete post" }, { status: 500 });
  }
}
