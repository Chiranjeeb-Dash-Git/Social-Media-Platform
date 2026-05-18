import Link from "next/link";

interface CommunitySidebarProps {
  community: {
    name: string;
    description: string | null;
    createdAt: string | Date;
    _count: { posts: number };
  };
}

export default function CommunitySidebar({ community }: CommunitySidebarProps) {
  return (
    <div className="cinematic-card sticky top-20 hidden h-fit w-full overflow-hidden lg:block">
      <div className="border-b bg-muted/50 p-4">
        <h3 className="font-semibold">About r/{community.name}</h3>
      </div>
      <div className="p-4">
        {community.description && (
          <p className="mb-4 text-sm text-muted-foreground">{community.description}</p>
        )}
        
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{community._count.posts}</span>
            <span>Posts</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">Created</span>
            <span>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(community.createdAt))}</span>
          </div>
        </div>

        <Link
          href="/submit"
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Create Post
        </Link>
      </div>
    </div>
  );
}
