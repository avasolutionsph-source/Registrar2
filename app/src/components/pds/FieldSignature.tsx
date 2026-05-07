import { useFormContext } from "react-hook-form";
import { fieldErrorMessage } from "./errorUtil";

const PRIVACY_TEXT = `By answering this form, I hereby agree to the following:

The Naga Parochial School recognizes its responsibilities under the Republic Act No. 10173 (Data Privacy Act of 2012), to data collection, recording, organizing, updating, use, and consolidation from its students. Data gathered in this form will be processed and accessible only to the Guidance Counselors. The information collected shall be used to provide possible assistance, appropriate interventions, and reference for future referrals. Consolidated reports are shared with administrators and other school personnel.

NPS shall not disclose the respondent's personal information without their consent and shall retain this information for a period of two (2) years after graduation.

I authorize the Guidance Office to use my responses exclusively for purposes deemed necessary by the office.

I hereby declare that the details furnished above are true and correct to the best of my knowledge and I undertake to inform you of any changes therein immediately.`;

export function FieldSignature() {
  const { register, formState: { errors } } = useFormContext();
  const consentErr = fieldErrorMessage(errors, "consent_acknowledged");
  const sigErr = fieldErrorMessage(errors, "signature_name");

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <h2 className="font-semibold text-slate-800">Data Privacy Notice</h2>
      <pre className="whitespace-pre-wrap text-xs text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
        {PRIVACY_TEXT}
      </pre>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          {...register("consent_acknowledged")}
          className="mt-1"
        />
        <span>
          I agree to the data privacy notice above and confirm that the
          information I provided is true and correct.
        </span>
      </label>
      {consentErr && <p className="text-xs text-red-600">{consentErr}</p>}

      <label className="block text-sm">
        <span className="text-slate-700 font-medium">
          Signature (type your full name)
        </span>
        <input
          type="text"
          {...register("signature_name")}
          className={`mt-1 w-full rounded border px-3 py-2 ${
            sigErr ? "border-red-500" : "border-slate-300"
          }`}
        />
        {sigErr && <p className="text-xs text-red-600 mt-1">{sigErr}</p>}
      </label>

      <p className="text-xs text-slate-500">
        Date will be auto-filled on submission.
      </p>
    </section>
  );
}
