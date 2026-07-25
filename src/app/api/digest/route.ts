import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateDailyDigest } from "@/lib/digest/generator";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await generateDailyDigest(session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Digest generation failed:", error);

    return NextResponse.json(
      { error: "Failed to generate digest" },
      { status: 500 }
    );
  }
}