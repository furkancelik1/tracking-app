import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const language = body?.language;

  if (!language || !["en", "tr"].includes(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { language },
  });

  return NextResponse.json({ ok: true });
}
