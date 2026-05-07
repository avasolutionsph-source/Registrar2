import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  oldStudentPdsSchema,
  GRADE_LEVELS,
  GENDERS,
  COUNSELOR_INTEREST,
  type OldStudentPds,
} from "../../schemas/oldStudentPds";
import { FormSection } from "./FormSection";
import { FieldText } from "./FieldText";
import { FieldTextarea } from "./FieldTextarea";
import { FieldSelect } from "./FieldSelect";
import { FieldRadioGroup } from "./FieldRadioGroup";
import { FieldDate } from "./FieldDate";
import { FieldNumber } from "./FieldNumber";
import { FieldPhoto } from "./FieldPhoto";
import { FieldSignature } from "./FieldSignature";
import { submitPds } from "../../lib/submitPds";

type FormValues = OldStudentPds & { photo?: File | null };

export function OldStudentForm() {
  const methods = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(oldStudentPdsSchema) as any,
    mode: "onBlur",
  });
  const nav = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = methods.handleSubmit(async (values) => {
    setBusy(true);
    setSubmitError(null);
    try {
      const { photo, ...rest } = values;
      await submitPds({
        formType: "old",
        studentName: rest.full_name,
        gradeLevel: rest.grade_level,
        section: rest.section,
        data: rest as unknown as Record<string, unknown>,
        photo,
        signatureName: rest.signature_name,
        signedAt: new Date().toISOString(),
      });
      nav("/pds/old/done");
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setBusy(false);
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        <header className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold">
            Students' Personal Data Sheet
          </h1>
          <p className="text-sm text-slate-600">
            Naga Parochial School — Guidance, Testing, and Research Services
          </p>
        </header>

        <FormSection title="Personal Details">
          <FieldText name="full_name" label="Full Name (Surname, First Name, MI)" fullWidth />
          <FieldText name="nickname" label="Nickname" />
          <FieldSelect name="grade_level" label="Grade Level" options={GRADE_LEVELS} />
          <FieldText name="section" label="Section" fullWidth />
          <FieldText name="mobile_number" label="Mobile Number" type="tel" />
          <FieldText name="email" label="Email Address" type="email" />
          <FieldSelect name="gender" label="Gender" options={GENDERS} />
          <FieldDate name="birthdate" label="Birthdate" />
          <FieldText name="home_address" label="Home Address" fullWidth />
          <FieldPhoto name="photo" label="2x2 Picture (optional)" hint="JPG/PNG/WebP, max 5MB." />
        </FormSection>

        <FormSection title="Family Background" tone="yellow">
          <FieldText name="living_with" label="Living With" fullWidth />
          <FieldText name="father_full_name" label="Father's Full Name" />
          <FieldText name="mother_full_name" label="Mother's Full Name" />
          <FieldText name="father_occupation" label="Father's Occupation" />
          <FieldText name="mother_occupation" label="Mother's Occupation" />
          <FieldText name="parent_guardian_name" label="Name of Parent/Guardian" fullWidth />
          <FieldText name="parent_guardian_contact" label="Parent/Guardian Contact" type="tel" />
          <FieldText name="parent_guardian_email" label="Parent/Guardian Email" type="email" />
          <FieldNumber name="siblings_in_nps_count" label="No. of Siblings in NPS" />
          <FieldText name="siblings_in_nps_grade_levels" label="Sibling Grade Level/s (if any)" />
        </FormSection>

        <FormSection title="Medical / Emergency Information">
          <FieldTextarea name="medical_conditions" label="Medical Conditions / Allergies (if any)" />
          <FieldText name="emergency_contact_name" label="Emergency Contact Person" />
          <FieldText name="emergency_contact_number" label="Emergency Contact Number" type="tel" />
          <FieldText name="emergency_contact_relationship" label="Relationship with the Student" fullWidth />
        </FormSection>

        <FormSection title="Student Support Needs" tone="yellow">
          <FieldRadioGroup
            name="wants_counselor"
            label="Would you like to speak with the Guidance Counselor this year?"
            options={COUNSELOR_INTEREST}
            fullWidth
          />
          <FieldTextarea name="concerns_to_share" label="Concerns you'd like to share (optional)" />
          <FieldTextarea name="looking_forward_to" label="What are you looking forward to this School Year?" />
        </FormSection>

        <FieldSignature />

        {submitError && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full md:w-auto bg-npsRed text-white px-6 py-3 rounded font-medium disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit PDS"}
        </button>
      </form>
    </FormProvider>
  );
}
