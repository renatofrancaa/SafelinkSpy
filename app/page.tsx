import { redirect } from "next/navigation";

/**
 * Fallback when middleware does not redirect.
 * Direct link — always serve the funnel entry.
 */
export default function HomePage() {
  redirect("/index.html");
}
