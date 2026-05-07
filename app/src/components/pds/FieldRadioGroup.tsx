import { useFormContext } from "react-hook-form";
import { fieldErrorMessage } from "./errorUtil";

export function FieldRadioGroup({
  name,
  label,
  options,
  fullWidth = false,
}: {
  name: string;
  label: string;
  options: readonly string[];
  fullWidth?: boolean;
}) {
  const { register, formState: { errors } } = useFormContext();
  const err = fieldErrorMessage(errors, name);
  return (
    <fieldset className={`text-sm ${fullWidth ? "md:col-span-2" : ""}`}>
      <legend className="text-slate-700 font-medium">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-4">
        {options.map((o) => (
          <label key={o} className="inline-flex items-center gap-2">
            <input type="radio" value={o} {...register(name)} />
            {o}
          </label>
        ))}
      </div>
      {err && <span className="text-xs text-red-600 mt-1 block">{err}</span>}
    </fieldset>
  );
}
