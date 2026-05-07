import { useFormContext } from "react-hook-form";
import { fieldErrorMessage } from "./errorUtil";

type Props = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  fullWidth?: boolean;
};

export function FieldText({ name, label, placeholder, type = "text", fullWidth }: Props) {
  const { register, formState: { errors } } = useFormContext();
  const err = fieldErrorMessage(errors, name);
  return (
    <label className={`block text-sm ${fullWidth ? "md:col-span-2" : ""}`}>
      <span className="text-slate-700 font-medium">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className={`mt-1 w-full rounded border px-3 py-2 ${
          err ? "border-red-500" : "border-slate-300"
        }`}
      />
      {err && <span className="text-xs text-red-600 mt-1 block">{err}</span>}
    </label>
  );
}
