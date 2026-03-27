import { NextResponse } from "next/server";

// Injected at build time by next.config.ts generateBuildId — stable per deploy
const BUILD_ID = process.env.BUILD_ID || process.env.NEXT_DEPLOYMENT_ID || "__dev__";

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
