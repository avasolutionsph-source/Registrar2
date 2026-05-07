import { useFormContext } from "react-hook-form";
import { fieldErrorMessage } from "./errorUtil";

export function FieldSelect({
  name,
  label,
  options,
  fullWidth = false,
  placeholder = "Select…",
}: {
  name: string;
  label: string;
  options: readonly string[];
  fullWidth?: boolean;
  placeholder?: string;
}) {
  const { register, formState: { errors } } = useFormContext();
  const err = fieldErrorMessage(errors, name);
  return (
    <label className={`block text-sm ${fullWidth ? "md:col-span-2" : ""}`}>
      <span className="text-slate-700 font-medium">{label}</span>
      <select
        {...register(name)}
        className={`mt-1 w-full rounded border px-3 py-2 bg-white ${
          err ? "border-red-500" : "border-slate-300"
        }`}
        defaultValue=""
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {err && <span className="text-xs text-red-600 mt-1 block">{err}</span>}
    </label>
  );
}
