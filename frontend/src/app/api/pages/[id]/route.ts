import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await dataStore.page.findUnique(id);

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json(page, { status: 200 });
}
