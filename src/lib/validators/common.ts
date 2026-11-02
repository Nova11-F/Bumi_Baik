import type { ZodError } from "zod";

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialFormState: FormState = { status: "idle" };

export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? "form";
    errors[key] = [...(errors[key] ?? []), issue.message];
  }

  return errors;
}
