import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  newStudentPdsSchema,
  STRANDS,
  GENDERS,
  YES_NO,
  OFW_STATUS,
  PARENT_SETUP,
  INCOME_BRACKETS,
  ADMISSION_CLASS,
  BULLYING_FORMS,
  type NewStudentPds,
} from "../../schemas/newStudentPds";
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

type FormValues = NewStudentPds & { photo?: File | null };

export function NewStudentForm() {
  const methods = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(newStudentPdsSchema) as any,
    mode: "onBlur",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: { siblings: [], bullying_forms: [] } as any,
  });
  const { control, register } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "siblings" });
  const nav = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = methods.handleSubmit(async (values) => {
    setBusy(true);
    setSubmitError(null);
    try {
      const { photo, ...rest } = values;
      await submitPds({
        formType: "new",
        studentName: rest.full_name,
        gradeLevel: `Grade ${rest.strand}`,
        section: rest.block_section,
        data: rest as unknown as Record<string, unknown>,
        photo,
        signatureName: rest.signature_name,
        signedAt: new Date().toISOString(),
      });
      nav("/pds/new/done");
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setBusy(false);
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
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
          <FieldText name="id_number" label="ID Number (e.g. SH20200578)" />
          <FieldSelect name="strand" label="Strand" options={STRANDS} />
          <FieldText name="block_section" label="Block / Section" />
          <FieldText name="contact_number" label="Contact Number" type="tel" />
          <FieldText name="email" label="Email" type="email" />
          <FieldText name="permanent_address" label="Permanent Address" fullWidth />
          <FieldText name="present_address" label="Present Address" fullWidth />
          <FieldDate name="birthdate" label="Birthdate" />
          <FieldText name="birthplace" label="Birthplace" />
          <FieldSelect name="gender" label="Gender" options={GENDERS} />
          <FieldText name="religion" label="Religion" />
          <FieldText name="nationality" label="Nationality" />
          <FieldText name="civil_status" label="Civil Status" />
          <FieldSelect name="admission_classification" label="Admission Classification" options={ADMISSION_CLASS} />
          <FieldPhoto name="photo" label="1.5x1.5 Picture (optional)" hint="JPG/PNG/WebP, max 5MB." />
        </FormSection>

        <FormSection title="Family Background" tone="yellow">
          {(["parent_1", "parent_2"] as const).map((p, i) => (
            <fieldset key={p} className="md:col-span-1 border border-slate-200 rounded p-3 space-y-3">
              <legend className="font-semibold text-slate-700 px-1">
                Parent {i + 1} / Guardian {i + 1}
              </legend>
              <FieldText name={`${p}.name`} label="Name" />
              <FieldNumber name={`${p}.age`} label="Age" />
              <FieldText name={`${p}.contact`} label="Contact No." type="tel" />
              <FieldText name={`${p}.email`} label="Email" type="email" />
              <FieldText name={`${p}.nationality`} label="Nationality" />
              <FieldText name={`${p}.religion`} label="Religion" />
              <FieldText name={`${p}.occupation`} label="Occupation" />
              <FieldTextarea name={`${p}.employer_name_address`} label="Employer's Name & Address" rows={2} />
            </fieldset>
          ))}

          <FieldSelect name="parents_ofw_status" label="Parent(s) OFW status" options={OFW_STATUS} />
          <FieldSelect name="parents_setup" label="Parents' set-up" options={PARENT_SETUP} />
          <FieldNumber name="siblings_count" label="No. of Sibling/s" />
          <FieldText name="birth_order" label="Birth Order (e.g. 1st, 2nd)" />
          <FieldText name="lives_with_whom_most_of_life" label="With whom do you live (most of your life)?" />
          <FieldText name="living_with_duration" label="For how long?" />
          <FieldText name="present_family_setup" label="Present family set-up" />
          <FieldText name="closest_family_member" label="Closest family member" />
          <FieldText name="dialects_spoken_at_home" label="Dialect/s spoken at home" />
          <FieldSelect name="monthly_family_income" label="Monthly Family Income" options={INCOME_BRACKETS} />
        </FormSection>

        <FormSection title="Sibling Information">
          <div className="md:col-span-2 space-y-3">
            {fields.length === 0 && (
              <p className="text-sm text-slate-500">
                No siblings added. Click "Add sibling" if applicable.
              </p>
            )}
            {fields.map((f, idx) => (
              <div
                key={f.id}
                className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end border border-slate-200 rounded p-2"
              >
                <input
                  placeholder="Full Name"
                  {...register(`siblings.${idx}.full_name`)}
                  className="md:col-span-2 rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <input
                  type="number"
                  placeholder="Age"
                  {...register(`siblings.${idx}.age`, { valueAsNumber: true })}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <input
                  placeholder="Civil Status"
                  {...register(`siblings.${idx}.civil_status`)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <input
                  placeholder="School / Employer"
                  {...register(`siblings.${idx}.school_or_employer`)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    placeholder="Year Level / Occupation"
                    {...register(`siblings.${idx}.year_level_or_occupation`)}
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-xs text-red-700 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {fields.length < 10 && (
              <button
                type="button"
                onClick={() =>
                  append({
                    full_name: "",
                    age: 0,
                    civil_status: "",
                    school_or_employer: "",
                    year_level_or_occupation: "",
                  })
                }
                className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded"
              >
                + Add sibling
              </button>
            )}
          </div>
        </FormSection>

        <FormSection title="Educational Background" tone="yellow">
          <fieldset className="md:col-span-2 space-y-3">
            <legend className="font-semibold text-slate-700">Elementary (Grade 1-6)</legend>
            <FieldText name="education.elementary.name_of_school" label="Name of School" fullWidth />
            <FieldText name="education.elementary.year_of_completion" label="Year of Completion" />
            <FieldText name="education.elementary.inclusive_dates" label="Inclusive Dates" />
            <FieldTextarea name="education.elementary.recognition_awards" label="Recognition / Awards" rows={2} />
          </fieldset>
          <fieldset className="md:col-span-2 space-y-3">
            <legend className="font-semibold text-slate-700">Junior High School (Grade 7-10)</legend>
            <FieldText name="education.junior_high.name_of_school" label="Name of School" fullWidth />
            <FieldText name="education.junior_high.year_of_completion" label="Year of Completion" />
            <FieldText name="education.junior_high.inclusive_dates" label="Inclusive Dates" />
            <FieldTextarea name="education.junior_high.recognition_awards" label="Recognition / Awards" rows={2} />
          </fieldset>
        </FormSection>

        <FormSection title="Senior High School Experience">
          <FieldText name="who_decided_to_study_here" label="Who decided that you study here?" fullWidth />
          <FieldTextarea name="why_chose_this_school" label="What made you choose this school?" />
        </FormSection>

        <FormSection title="Social Life" tone="yellow">
          <FieldRadioGroup name="has_partner" label="Do you have a boyfriend/girlfriend?" options={YES_NO} />
          <FieldNumber name="close_friends_count" label="How many close friends in school?" />
          <FieldTextarea name="free_time_activities" label="What do you usually do during free time?" />
          <FieldRadioGroup name="experienced_peer_pressure" label="Have you experienced peer pressure?" options={YES_NO} />
          <FieldRadioGroup name="experienced_bullying" label="Have you experienced bullying?" options={YES_NO} />

          <fieldset className="md:col-span-2 text-sm">
            <legend className="text-slate-700 font-medium">In what form/s of bullying (if any)?</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {BULLYING_FORMS.map((f) => (
                <label key={f} className="inline-flex items-center gap-2">
                  <input type="checkbox" value={f} {...register("bullying_forms")} />
                  {f}
                </label>
              ))}
            </div>
          </fieldset>

          <FieldRadioGroup
            name="thought_of_self_harm"
            label="Have you thought of hurting yourself physically because of problems, issues, and difficulties that you encountered?"
            options={YES_NO}
            fullWidth
          />
          <FieldRadioGroup
            name="attempted_self_harm"
            label="Have you tried committing suicide (harming yourself)?"
            options={YES_NO}
            fullWidth
          />
          <FieldText name="weekday_residence" label="During schooldays, where are you staying at?" fullWidth />
          <FieldTextarea name="special_skills_talents" label="Special Skills / Talents" />
          <FieldTextarea name="hobbies" label="Hobbies / Leisure Time Activities" />
        </FormSection>

        <FormSection title="Medical History">
          <FieldTextarea name="conditions_since_birth" label="Illness / Medical conditions diagnosed since birth" />
          <FieldTextarea name="conditions_last_3_years" label="Illness / Medical conditions diagnosed in the last 3 years" />
          <FieldRadioGroup
            name="prior_jhs_guidance_visit"
            label="Have you visited your JHS Guidance Office before for counseling/consultation?"
            options={YES_NO}
            fullWidth
          />
          <FieldTextarea
            name="prior_jhs_visit_details"
            label="If Yes — service availed, date, duration & number of sessions, reason"
          />
          <FieldRadioGroup
            name="prior_external_counseling"
            label="Have you received counseling/consultation elsewhere before?"
            options={YES_NO}
            fullWidth
          />
          <FieldTextarea
            name="prior_external_counseling_details"
            label="If Yes — service availed, date, duration & number of sessions, reason"
          />
          <FieldRadioGroup
            name="prior_psychological_treatment"
            label="Have you ever been treated for psychological reasons?"
            options={YES_NO}
            fullWidth
          />
          <FieldTextarea
            name="prior_treatment_details"
            label="If Yes — start, end, reason, attending professional + contact"
          />
        </FormSection>

        <FormSection title="Person to Contact in Case of Emergency" tone="yellow">
          <FieldText name="emergency_contact.name" label="Name" />
          <FieldText name="emergency_contact.relationship" label="Relationship" />
          <FieldText name="emergency_contact.address" label="Address" fullWidth />
          <FieldText name="emergency_contact.contact" label="Contact Number" type="tel" />
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
