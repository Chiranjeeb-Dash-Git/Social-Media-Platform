import dataStore from "@/lib/dataStore";
import { PostCard } from "@/components/PostCard";
import CommunitySidebar from "@/components/CommunitySidebar";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ communityName: string }>;
}) {
  const { communityName } = await params;

  const community = await dataStore.community.findUnique({
    where: { name: communityName },
    include: {
      posts: {
        orderBy: { createdAt: "desc" },
        include: {
          author: true,
          community: true,
          votes: true,
          _count: { select: { comments: true } },
        },
      },
      _count: { select: { posts: true } },
    },
  });

  if (!community) return notFound();

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gradient md:text-4xl">
            r/{community.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {community.description}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-3">
            {community.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {community.posts.length === 0 && (
              <div className="cinematic-card p-8 text-center text-sm text-muted-foreground">
                No posts in this community yet.
              </div>
            )}
          </div>

          <aside>
            <CommunitySidebar community={community} />
          </aside>
        </div>
      </div>
    </main>
  );
}
