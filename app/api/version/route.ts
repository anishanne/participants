import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

let cachedBuildId: string | null = null;

function getBuildId(): string {
  if (cachedBuildId) return cachedBuildId;

  try {
    // Next.js writes a BUILD_ID file during build
    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
    cachedBuildId = fs.readFileSync(buildIdPath, "utf8").trim();
    return cachedBuildId;
  } catch {
    // Fallback: use a timestamp so it changes on restart
    cachedBuildId = process.env.BUILD_ID || String(Date.now());
    return cachedBuildId;
  }
}

export async function GET() {
  return NextResponse.json(
    { buildId: getBuildId() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache"
      }
    }
  );
}
