import { useFormContext } from "react-hook-form";
import { fieldErrorMessage } from "./errorUtil";

export function FieldNumber({
  name,
  label,
  min = 0,
}: {
  name: string;
  label: string;
  min?: number;
}) {
  const { register, formState: { errors } } = useFormContext();
  const err = fieldErrorMessage(errors, name);
  return (
    <label className="block text-sm">
      <span className="text-slate-700 font-medium">{label}</span>
      <input
        type="number"
        min={min}
        {...register(name, { valueAsNumber: true })}
        className={`mt-1 w-full rounded border px-3 py-2 ${
          err ? "border-red-500" : "border-slate-300"
        }`}
      />
      {err && <span className="text-xs text-red-600 mt-1 block">{err}</span>}
    </label>
  );
}
