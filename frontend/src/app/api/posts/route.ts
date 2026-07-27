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
    const allPosts = await dataStore.post.findMany();

    // Filter posts based on privacy and snooze/block relationships
    const filteredPosts = [];
    for (const post of allPosts) {
      if (!post.author) continue;

      // Check relationship status
      const status = await dataStore.relationships.getStatus(user.id, post.author.id);
      if (status.isBlocked || status.isSnoozed) continue;

      // Check privacy settings
      if (post.privacy === "ONLY_ME" && post.author.id !== user.id) continue;
      if (post.privacy === "FRIENDS" && post.author.id !== user.id && status.friendStatus !== "ACCEPTED") continue;
      if (post.privacy === "FRIENDS_EXCEPT" && post.author.id !== user.id) {
        if (post.privacyExceptions?.includes(user.id) || status.friendStatus !== "ACCEPTED") continue;
      }

      filteredPosts.push(post);
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
