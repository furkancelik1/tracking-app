import { CardForm } from "@/components/dashboard/CardForm";

export default function NewCardPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Card</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Add a new action to the catalogue
        </p>
      </div>
      <CardForm />
    </div>
  );
}
