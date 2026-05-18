import Link from "next/link";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const communities = await dataStore.community.findMany();

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Communities</h1>
          <p className="text-muted-foreground mt-2">
            Browse active spaces and jump into the conversation.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <Link
              key={community.id}
              href={`/r/${community.name}`}
              className="cinematic-card p-5 hover-lift"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">r/{community.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {community.members.toLocaleString()} members
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                {community.description}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                {community._count.posts} posts
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
