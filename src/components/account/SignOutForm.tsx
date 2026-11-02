"use client";

import { useActionState } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { initialFormState } from "@/lib/validators/common";

export function SignOutForm({ onClick }: { onClick?: () => void }) {
  const [state, formAction, pending] = useActionState(
    signOutAction,
    initialFormState,
  );

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          onClick={onClick}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-forest-700 px-4 text-sm font-medium text-forest-700 hover:bg-forest-100 disabled:cursor-not-allowed disabled:border-paper-200 disabled:text-ink-400"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {pending ? "Keluar…" : "Keluar"}
        </button>
      </form>
      <div className="mt-2">
        <FormFeedback state={state} />
      </div>
    </div>
  );
}
