import { redirect } from "next/navigation";

// Blind Spots now live inside Financial Health & Insights, organised by the
// health category they affect. Keep old links working.
export default function BlindSpotsPage() {
  redirect("/health#insights");
}
