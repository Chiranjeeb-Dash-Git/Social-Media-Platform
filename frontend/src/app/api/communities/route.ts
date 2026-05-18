import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const communities = await dataStore.community.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    return NextResponse.json(communities, { status: 200 });
  } catch (error) {
    console.error("Error fetching communities:", error);
    return NextResponse.json({ error: "Could not fetch communities" }, { status: 500 });
  }
}
