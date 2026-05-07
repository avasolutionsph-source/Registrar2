import { Controller, useFormContext } from "react-hook-form";
import { useState } from "react";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function FieldPhoto({
  name,
  label,
  hint,
}: {
  name: string;
  label: string;
  hint?: string;
}) {
  const { control } = useFormContext();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="md:col-span-2 text-sm">
          <span className="text-slate-700 font-medium block">{label}</span>
          {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
          <div className="flex items-start gap-4">
            <input
              type="file"
              accept={ACCEPTED.join(",")}
              onChange={(e) => {
                setError(null);
                const file = e.target.files?.[0] ?? null;
                if (!file) {
                  field.onChange(null);
                  setPreview(null);
                  return;
                }
                if (!ACCEPTED.includes(file.type)) {
                  setError("Use JPG, PNG, or WebP.");
                  return;
                }
                if (file.size > MAX_SIZE) {
                  setError("Max 5MB.");
                  return;
                }
                field.onChange(file);
                setPreview(URL.createObjectURL(file));
              }}
              className="text-sm"
            />
            {preview && (
              <img
                src={preview}
                alt="preview"
                className="h-24 w-24 object-cover rounded border border-slate-300"
              />
            )}
          </div>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      )}
    />
  );
}
