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
    const user = await getActor(req);
    const userId: string = (user as any)?.id || "guest";
    const allPosts = await dataStore.post.findMany();

    const uniqueAuthorIds = Array.from(new Set((allPosts as any[]).map(p => (p.author as any)?.id).filter((id): id is string => Boolean(id) && id !== userId)));
    const statusEntries = await Promise.all(
      uniqueAuthorIds.map(async (id) => [id, await dataStore.relationships.getStatus(userId, id)] as const)
    );
    const statusMap = new Map(statusEntries);

    // Filter posts based on privacy and snooze/block relationships
    const filteredPosts = [];
    for (const p of (allPosts as any[])) {
      if (!p.author) continue;
      const authorId: string = (p.author as any).id;

      // Check relationship status
      const status = authorId === userId ? { isSelf: true, isBlocked: false, isSnoozed: false, friendStatus: "ACCEPTED" } : (statusMap.get(authorId) || { isBlocked: false, isSnoozed: false, friendStatus: null });
      if (status.isBlocked || status.isSnoozed) continue;

      // Check privacy settings
      if (p.privacy === "ONLY_ME" && authorId !== userId) continue;
      if (p.privacy === "FRIENDS" && authorId !== userId && status.friendStatus !== "ACCEPTED") continue;
      if (p.privacy === "FRIENDS_EXCEPT" && authorId !== userId) {
        if (p.privacyExceptions?.includes(userId) || status.friendStatus !== "ACCEPTED") continue;
      }

      filteredPosts.push(p);
    }

    return NextResponse.json(filteredPosts, { status: 200 });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Could not fetch posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title, content, communityId, type, url, imageUrl,
      privacy, privacyExceptions, privacyListId, feelingActivity, locationTag,
      bgColorCard, mediaUrls, pollData, isLive, sharedFromId
    } = body;

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
        privacy,
        privacyExceptions,
        privacyListId,
        feelingActivity,
        locationTag,
        bgColorCard,
        mediaUrls,
        pollData,
        isLive,
        sharedFromId
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Could not create post" }, { status: 500 });
  }
}
