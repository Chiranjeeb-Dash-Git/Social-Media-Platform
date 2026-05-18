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

export async function GET() {
  try {
    const posts = await dataStore.post.findMany();
    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Could not fetch posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, communityId, type, url, imageUrl } = body;

    if (!title || !communityId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await getActor(req);

    const post = await dataStore.post.create({
      data: {
        title,
        content,
        type,
        url,
        imageUrl,
        communityId,
        authorId: user.id,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Could not create post" }, { status: 500 });
  }
}
