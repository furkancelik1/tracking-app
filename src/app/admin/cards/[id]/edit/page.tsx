import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardForm } from "@/components/dashboard/CardForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditCardPage({ params }: Props) {
  const { id } = await params;

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Card</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Update &ldquo;{card.title}&rdquo;
        </p>
      </div>
      <CardForm card={card} />
    </div>
  );
}
