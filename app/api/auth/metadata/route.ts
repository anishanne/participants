import { NextResponse } from "next/server";
import { generateMetadata } from "@/lib/saml";

export async function GET() {
  try {
    const xml = await generateMetadata();
    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml" }
    });
  } catch (error) {
    console.error("Metadata generation error:", error);
    return NextResponse.json({ error: "Failed to generate metadata" }, { status: 500 });
  }
}
