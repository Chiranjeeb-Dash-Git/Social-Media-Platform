import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

const getUser = async (req: Request) => {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  return token ? dataStore.auth.getUserFromToken(token) : null;
};

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { action, currentPassword, newPassword, permanent } = await req.json();
    if (action === "change_password") {
      if (!newPassword || newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      await dataStore.auth.changePassword(user.id, currentPassword, newPassword);
      return NextResponse.json({ success: true, loggedOutEverywhere: true });
    }
    if (action === "logout_everywhere") {
      await dataStore.auth.logoutEverywhere(user.id);
      return NextResponse.json({ success: true });
    }
    if (action === "delete_account") {
      await dataStore.auth.deleteAccount(user.id, Boolean(permanent));
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Invalid security action" }, { status: 400 });
  } catch (error: any) { return NextResponse.json({ error: error.message || "Security action failed" }, { status: 400 }); }
}
