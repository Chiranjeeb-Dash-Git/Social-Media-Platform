import Link from "next/link";
import { Home, Plus, SearchX } from "lucide-react";
import dataStore from "@/lib/dataStore";
import { PostCard } from "@/components/PostCard";
import { CommentsSection } from "@/components/CommentsSection";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await dataStore.post.findUnique({ where: { id: postId } });

  if (!post || post.id !== postId) {
    return (
      <main className="min-h-screen bg-background">
        <section className="container mx-auto flex max-w-3xl px-4 py-10">
          <div className="cinematic-card w-full p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <SearchX className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-semibold">Post unavailable</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              This post may have been deleted or moved. You can keep browsing
              the latest posts without hitting a blank 404 page.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="cinematic-button">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Create post
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <PostCard post={post} />
        <CommentsSection postId={post.id} />
      </div>
    </main>
  );
}
