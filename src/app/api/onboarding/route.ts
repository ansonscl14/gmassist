import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { 
  } = body;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      onboardingDone: true,
    },
  });

  return NextResponse.json({ ok: true });
}
