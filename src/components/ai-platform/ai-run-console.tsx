"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { startAiRunAction } from "@/ai/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AiRunConsole() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask the kernel assistant (e.g. zoek bedrijven in CRM, toon open taken…)"
        rows={4}
        disabled={pending}
      />
      <div className="flex gap-2">
        <Button
          disabled={pending || !input.trim()}
          onClick={() => {
            startTransition(async () => {
              const result = await startAiRunAction({ inputText: input.trim() });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success(result.message);
              setOutput(result.outputText ?? result.message);
            });
          }}
        >
          {pending ? "Running…" : "Start run"}
        </Button>
      </div>
      {output ? (
        <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
          {output}
        </pre>
      ) : null}
    </div>
  );
}
