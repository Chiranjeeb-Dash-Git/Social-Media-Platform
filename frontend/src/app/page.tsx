"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useQuery } from "react-query";
import Link from "next/link";
import { Home, Plus, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { PostCard, type Post } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";

type Community = {
  id: string;
  name: string;
  icon?: string;
  members: number;
  _count: {
    posts: number;
  };
};

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    setSearchQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const response = await axios.get<Post[]>("/api/posts");
      return response.data;
    },
  });

  const { data: communities = [] } = useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const response = await axios.get<Community[]>("/api/communities");
      return response.data;
    },
  });

  const visiblePosts = useMemo(() => {
    if (!searchQuery) return posts;
    const query = searchQuery.toLowerCase();

    return posts.filter((post) =>
      [
        post.title,
        post.content ?? "",
        post.author.username,
        post.community.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [posts, searchQuery]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="cinematic-card p-1"
            >
              <div className="grid grid-cols-3 gap-1">
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-all duration-200"
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>
                <Link
                  href="/trending"
                  className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Trending</span>
                </Link>
                <Link
                  href="/communities"
                  className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
                >
                  <Users className="h-4 w-4" />
                  <span>Communities</span>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Button
                onClick={() => setShowCreatePost(true)}
                className="cinematic-button w-full justify-start text-left"
              >
                <Plus className="mr-3 h-5 w-5" />
                Create Post
              </Button>
            </motion.div>

            {searchQuery && (
              <div className="text-sm text-muted-foreground">
                Showing results for{" "}
                <span className="font-medium text-foreground">{searchQuery}</span>
              </div>
            )}

            <div className="space-y-4">
              {postsLoading && (
                <div className="cinematic-card p-6 text-sm text-muted-foreground">
                  Loading posts...
                </div>
              )}

              {!postsLoading &&
                visiblePosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <PostCard post={post} />
                  </motion.div>
                ))}

              {!postsLoading && visiblePosts.length === 0 && (
                <div className="cinematic-card p-8 text-center">
                  <h2 className="text-lg font-semibold">No posts found</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try another search or create the first post.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="cinematic-card p-6"
            >
              <h3 className="mb-4 text-lg font-semibold text-gradient">
                About Reddit Clone
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Share posts, browse communities, vote on discussions, and keep
                your local account active across page reloads.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Posts</span>
                  <span className="font-medium">{posts.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Communities</span>
                  <span className="font-medium text-green-500">
                    {communities.length}
                  </span>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="cinematic-card p-6"
            >
              <h3 className="mb-4 text-lg font-semibold text-gradient">
                Popular Communities
              </h3>
              <div className="space-y-3">
                {communities.slice(0, 5).map((community) => (
                  <Link
                    key={community.id}
                    href={`/r/${community.name}`}
                    className="flex items-center space-x-3 rounded-lg p-2 transition-colors duration-200 hover:bg-muted"
                  >
                    <div
                      role="img"
                      aria-label={community.name}
                      className="h-8 w-8 flex-shrink-0 rounded-full bg-muted bg-cover bg-center"
                      style={{
                        backgroundImage: community.icon
                          ? `url(${community.icon})`
                          : undefined,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        c/{community.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {community.members.toLocaleString()} members
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <Button variant="ghost" className="mt-4 w-full" asChild>
                <Link href="/communities">View All Communities</Link>
              </Button>
            </motion.section>

            {!user && (
              <motion.section
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="cinematic-card p-6 text-center"
              >
                <h3 className="mb-4 text-lg font-semibold text-gradient">
                  Join the Conversation
                </h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Sign up to post, vote, save, and build your profile.
                </p>
                <div className="space-y-3">
                  <Button asChild className="cinematic-button w-full">
                    <Link href="/register">Sign Up</Link>
                  </Button>
                  <Button variant="ghost" asChild className="w-full">
                    <Link href="/login">Log In</Link>
                  </Button>
                </div>
              </motion.section>
            )}
          </aside>
        </div>
      </div>

      {showCreatePost && (
        <CreatePostDialog onClose={() => setShowCreatePost(false)} />
      )}
    </main>
  );
}
