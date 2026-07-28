import Link from "next/link";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const communities = await dataStore.community.findMany();

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-black text-gradient">Groups & Communities</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Connect with signed-up platform members in custom groups and spaces.
            </p>
          </div>
          <Link
            href="/messages?newGroup=true"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs sm:text-sm transition-all transform hover:scale-105 self-start sm:self-center"
          >
            + Create New Group (Select from User IDs)
          </Link>
        </div>

        {communities.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-dashed p-8 shadow-sm max-w-lg mx-auto">
            <div className="h-14 w-14 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl mx-auto mb-4 font-black">
              #
            </div>
            <h3 className="font-extrabold text-lg text-foreground mb-2">No Groups Created Yet</h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              All default/fake groups have been removed. Create a new real group by selecting registered member IDs who signed up on this webpage!
            </p>
            <Link
              href="/messages?newGroup=true"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-2xl shadow-md text-xs sm:text-sm transition-all"
            >
              + Create Group Chat Now
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <Link
                key={community.id}
                href={`/r/${community.name}`}
                className="cinematic-card p-5 hover-lift"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">#{community.name}</h2>
                  <span className="text-xs text-muted-foreground">
                    {community.members.toLocaleString()} members
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                  {community.description || "Active community group"}
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  {community._count.posts} posts
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
