import type { FieldErrors } from "react-hook-form";

export function fieldErrorMessage(
  errors: FieldErrors,
  name: string,
): string | undefined {
  const segments = name.split(".");
  let cursor: unknown = errors;
  for (const seg of segments) {
    if (cursor && typeof cursor === "object" && seg in cursor) {
      cursor = (cursor as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  if (
    cursor &&
    typeof cursor === "object" &&
    "message" in cursor &&
    typeof (cursor as { message: unknown }).message === "string"
  ) {
    return (cursor as { message: string }).message;
  }
  return undefined;
}
