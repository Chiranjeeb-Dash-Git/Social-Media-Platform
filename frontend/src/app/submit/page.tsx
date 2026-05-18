"use client";

import { useRouter } from "next/navigation";
import { CreatePostDialog } from "@/components/CreatePostDialog";

export default function SubmitPage() {
  const router = useRouter();

  return <CreatePostDialog onClose={() => router.push("/")} />;
}
