import { CircleAlert, CircleCheck } from "lucide-react";
import type { FormState } from "@/lib/validators/common";

export function FormFeedback({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;

  const isError = state.status === "error";
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
        isError
          ? "border-danger bg-paper-50 text-danger"
          : "border-forest-500 bg-forest-100 text-forest-900"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      <p>{state.message}</p>
    </div>
  );
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages || messages.length === 0) return null;

  return (
    <p id={id} className="mt-1 flex items-start gap-1.5 text-sm text-danger">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      <span>{messages.join(" ")}</span>
    </p>
  );
}
