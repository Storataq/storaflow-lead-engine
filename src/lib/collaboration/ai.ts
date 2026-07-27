/**
 * AI collaboration helpers — summarize threads / meetings, suggest actions.
 * Deterministic heuristics when no LLM is wired; Copilot can call later.
 */

export type AiCollabSuggestion = {
  kind:
    | "summary"
    | "next_actions"
    | "unanswered"
    | "follow_up_tasks"
    | "meeting_recap";
  title: string;
  body: string;
  items: string[];
};

export function summarizeDiscussion(messages: string[]): AiCollabSuggestion {
  const cleaned = messages.map((m) => m.trim()).filter(Boolean);
  const preview = cleaned.slice(-8);
  return {
    kind: "summary",
    title: "Discussion summary",
    body:
      preview.length === 0
        ? "No discussion to summarize yet."
        : `Thread has ${cleaned.length} message(s). Latest themes: ${preview
            .map((m) => m.slice(0, 80))
            .join(" · ")}`,
    items: preview.slice(0, 5),
  };
}

export function suggestNextActions(messages: string[]): AiCollabSuggestion {
  const text = messages.join("\n").toLowerCase();
  const items: string[] = [];
  if (text.includes("?")) items.push("Answer open questions in the thread");
  if (text.includes("deadline") || text.includes("due")) {
    items.push("Confirm due dates with owners");
  }
  if (text.includes("meeting")) items.push("Schedule or update a follow-up meeting");
  if (text.includes("send") || text.includes("email")) {
    items.push("Draft a follow-up email");
  }
  if (items.length === 0) {
    items.push("Assign an owner", "Add a due date", "Pin the decision comment");
  }
  return {
    kind: "next_actions",
    title: "Suggested next actions",
    body: "Heuristic suggestions based on the discussion.",
    items,
  };
}

export function identifyUnansweredQuestions(
  messages: string[],
): AiCollabSuggestion {
  const questions = messages
    .map((m) => m.trim())
    .filter((m) => m.includes("?"));
  return {
    kind: "unanswered",
    title: "Possible unanswered questions",
    body:
      questions.length === 0
        ? "No question marks detected."
        : `${questions.length} question-like message(s) found.`,
    items: questions.slice(0, 8),
  };
}

export function generateFollowUpTasks(messages: string[]): AiCollabSuggestion {
  const base = suggestNextActions(messages).items;
  return {
    kind: "follow_up_tasks",
    title: "Follow-up tasks",
    body: "Convertible into CRM tasks.",
    items: base.map((item) => `Task: ${item}`),
  };
}

export function generateMeetingRecap(input: {
  title: string;
  agenda: string;
  notes: string;
  actionItems: string[];
}): AiCollabSuggestion {
  return {
    kind: "meeting_recap",
    title: `Recap: ${input.title}`,
    body: [
      input.agenda ? `Agenda: ${input.agenda.slice(0, 200)}` : null,
      input.notes ? `Notes: ${input.notes.slice(0, 280)}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    items:
      input.actionItems.length > 0
        ? input.actionItems
        : ["Capture action items from notes"],
  };
}
