import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Email Suppressions" };

/** Alias route for /email/suppressions → /email/suppression */
export default function EmailSuppressionsAliasPage() {
  redirect("/email/suppression");
}
