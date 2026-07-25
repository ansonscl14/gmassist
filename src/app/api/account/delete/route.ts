import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  await prisma.actionItem.deleteMany({
    where: {
      userId: user.id,
    },
  });

  await prisma.emailMessage.deleteMany({
    where: {
      userId: user.id,
    },
  });

  await prisma.dailyDigest.deleteMany({
    where: {
      userId: user.id,
    },
  });

  await prisma.account.deleteMany({
    where: {
      userId: user.id,
    },
  });

  await prisma.session.deleteMany({
    where: {
      userId: user.id,
    },
  });

  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });

  return NextResponse.json({
    success: true,
  });
}