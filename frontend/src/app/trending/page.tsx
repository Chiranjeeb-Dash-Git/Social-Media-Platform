import dataStore from "@/lib/dataStore";
import { PostCard } from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const posts = await dataStore.post.findMany();
  const trendingPosts = [...posts].sort(
    (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Trending</h1>
          <p className="text-muted-foreground mt-2">
            Posts with the strongest vote momentum right now.
          </p>
        </div>

        <div className="space-y-4">
          {trendingPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </main>
  );
}
