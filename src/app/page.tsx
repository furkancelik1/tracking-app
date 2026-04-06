import { redirect } from "next/navigation";

// Root redirects to login — actual home is the dashboard
export default function RootPage() {
  redirect("/login");
}
