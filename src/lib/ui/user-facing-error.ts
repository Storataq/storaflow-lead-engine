/**
 * Maps technical / provider errors to short Dutch UI copy.
 * Never expose stack traces, SQL, or raw provider payloads to end users.
 */
export function toUserFacingError(
  error: unknown,
  fallback = "Er ging iets mis. Probeer het opnieuw.",
): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : fallback;

  const message = raw.trim();
  if (!message) return fallback;

  const lower = message.toLowerCase();

  if (
    lower.includes("foreign key") ||
    lower.includes("violates foreign key") ||
    lower.includes("23503")
  ) {
    return "Dit item kan niet worden verwijderd omdat er nog gekoppelde gegevens zijn.";
  }

  if (
    lower.includes("duplicate") ||
    lower.includes("unique") ||
    lower.includes("23505")
  ) {
    return "Dit item bestaat al. Controleer of je geen dubbele gegevens opslaat.";
  }

  if (
    lower.includes("policy") ||
    lower.includes("permission") ||
    lower.includes("42501") ||
    lower.includes("row-level security") ||
    lower.includes("rls")
  ) {
    return "Je hebt geen rechten voor deze actie.";
  }

  if (
    lower.includes("jwt") ||
    lower.includes("auth") ||
    lower.includes("not authenticated") ||
    lower.includes("session")
  ) {
    return "Je sessie is verlopen. Log opnieuw in.";
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("timeout") ||
    lower.includes("econnrefused")
  ) {
    return "Geen verbinding met de server. Controleer je netwerk en probeer opnieuw.";
  }

  if (
    lower.includes("column") ||
    lower.includes("relation") ||
    lower.includes("does not exist") ||
    lower.includes("schema cache") ||
    lower.includes("pgrst")
  ) {
    return "De database is nog niet volledig bijgewerkt. Controleer of alle migraties zijn uitgevoerd.";
  }

  // Already Dutch / product copy — keep as-is when short and free of SQL noise
  if (
    !lower.includes("postgres") &&
    !lower.includes("supabase") &&
    !lower.includes("select ") &&
    !lower.includes("insert ") &&
    !message.includes("\n") &&
    message.length <= 160
  ) {
    return message;
  }

  return fallback;
}
