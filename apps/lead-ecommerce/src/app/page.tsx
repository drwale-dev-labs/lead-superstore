import { redirect } from "next/navigation";

export default function HomePage() {
  // Storefront comes in Step 16. For now, route everything via the (site) layout.
  redirect("/coming-soon");
}