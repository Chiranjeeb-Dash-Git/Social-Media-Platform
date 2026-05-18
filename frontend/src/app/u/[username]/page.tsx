import { notFound } from "next/navigation";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await dataStore.user.getPublicByUsername(username);

  if (!user) return notFound();

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <section className="cinematic-card p-6">
          <div className="flex items-center gap-4">
            <div
              role="img"
              aria-label={user.username}
              className="h-16 w-16 rounded-full border-2 border-[hsl(var(--border))] bg-cover bg-center"
              style={{ backgroundImage: `url(${user.image})` }}
            />
            <div>
              <h1 className="text-2xl font-bold">u/{user.username}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <p className="mt-5 text-muted-foreground">
            {user.bio || "This user has not added a bio yet."}
          </p>
          <div className="mt-5 text-sm font-medium">{user.karma} karma</div>
        </section>
      </div>
    </main>
  );
}
