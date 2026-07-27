import { UserProfileClient } from "@/components/UserProfileClient";

export const dynamic = "force-dynamic";

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <UserProfileClient username={username} />;
}
