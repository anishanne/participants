import { NextResponse } from "next/server";

// Set at module load time — changes on each server restart / deploy
const BUILD_ID = process.env.BUILD_ID || Date.now().toString();

export async function GET() {
  return NextResponse.json(
    { buildId: BUILD_ID },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache"
      }
    }
  );
}
