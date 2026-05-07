import type { ReactNode } from "react";

export function FormSection({
  title,
  tone = "red",
  children,
}: {
  title: string;
  tone?: "red" | "yellow";
  children: ReactNode;
}) {
  const bar =
    tone === "red"
      ? "bg-npsRed text-white"
      : "bg-npsYellow text-slate-900";
  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <header className={`${bar} px-4 py-2 font-semibold tracking-wide`}>
        {title}
      </header>
      <div className="p-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}
