import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CardDeleteButton } from "@/components/dashboard/CardDeleteButton";
import { formatCardDuration } from "@/lib/utils";
import { unstable_cache } from "next/cache";

const getCards = unstable_cache(
  () =>
    prisma.card.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        resetType: true,
        duration: true,
        isActive: true,
        sortOrder: true,
        _count: { select: { basketItems: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ["admin-cards"],
  { tags: ["cards"] }
);

export default async function AdminCardsPage() {
  const cards = await getCards();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Action Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/cards/new">+ New Card</Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Reset</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-center">In Baskets</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  No cards yet. Create your first one.
                </TableCell>
              </TableRow>
            )}
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="font-medium">{card.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{card.category}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {card.resetType === "ROLLING" ? "Rolling" : "Fixed (00:00)"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatCardDuration(card.duration)}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {card._count.basketItems}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={card.isActive ? "default" : "secondary"}>
                    {card.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/cards/${card.id}/edit`}>Edit</Link>
                    </Button>
                    <CardDeleteButton id={card.id} title={card.title} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
