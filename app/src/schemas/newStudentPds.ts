import { z } from "zod";

export const STRANDS = ["GAS", "HUMSS", "STEM"] as const;
export const GENDERS = ["Male", "Female", "Prefer not to say"] as const;
export const YES_NO = ["Yes", "No"] as const;
export const OFW_STATUS = ["Both", "Father", "Mother", "None"] as const;
export const PARENT_SETUP = [
  "Living together",
  "Separated",
  "Annulled",
  "Widowed",
  "Single parent",
  "Other",
] as const;
export const INCOME_BRACKETS = [
  "Below 10,000",
  "10,000 - 30,000",
  "30,001 - 50,000",
  "50,001 - 100,000",
  "Above 100,000",
] as const;
export const ADMISSION_CLASS = [
  "New",
  "Transferee",
  "Returning",
  "Continuing",
] as const;
export const BULLYING_FORMS = [
  "Verbal",
  "Physical",
  "Social",
  "Cyber",
  "Other",
] as const;

const phPhone = z
  .string()
  .regex(/^(\+63|0)9\d{9}$/, "Use PH mobile format e.g. 09171234567");

const parent = z.object({
  name: z.string().min(1, "Required"),
  age: z.coerce.number().int().min(0).max(120),
  contact: phPhone,
  email: z.string().email().or(z.literal("")),
  nationality: z.string().min(1, "Required"),
  religion: z.string().min(1, "Required"),
  occupation: z.string().min(1, "Required"),
  employer_name_address: z.string().default(""),
});

const sibling = z.object({
  full_name: z.string().min(1, "Required"),
  age: z.coerce.number().int().min(0).max(120),
  civil_status: z.string().min(1, "Required"),
  school_or_employer: z.string().default(""),
  year_level_or_occupation: z.string().default(""),
});

const educationLevel = z.object({
  name_of_school: z.string().min(1, "Required"),
  year_of_completion: z.string().min(1, "Required"),
  inclusive_dates: z.string().min(1, "Required"),
  recognition_awards: z.string().default(""),
});

export const newStudentPdsSchema = z.object({
  full_name: z.string().min(1),
  id_number: z.string().min(1),
  strand: z.enum(STRANDS),
  block_section: z.string().min(1),
  contact_number: phPhone,
  email: z.string().email(),
  permanent_address: z.string().min(1),
  present_address: z.string().min(1),
  birthdate: z.string().min(1),
  birthplace: z.string().min(1),
  gender: z.enum(GENDERS),
  religion: z.string().min(1),
  nationality: z.string().min(1),
  civil_status: z.string().min(1),
  admission_classification: z.enum(ADMISSION_CLASS),

  parent_1: parent,
  parent_2: parent,
  parents_ofw_status: z.enum(OFW_STATUS),
  parents_setup: z.enum(PARENT_SETUP),
  siblings_count: z.coerce.number().int().min(0).max(20),
  birth_order: z.string().min(1),
  lives_with_whom_most_of_life: z.string().min(1),
  living_with_duration: z.string().min(1),
  present_family_setup: z.string().min(1),
  closest_family_member: z.string().min(1),
  dialects_spoken_at_home: z.string().min(1),
  monthly_family_income: z.enum(INCOME_BRACKETS),

  siblings: z.array(sibling).max(10),

  education: z.object({
    elementary: educationLevel,
    junior_high: educationLevel,
  }),

  who_decided_to_study_here: z.string().min(1),
  why_chose_this_school: z.string().min(1),

  has_partner: z.enum(YES_NO),
  close_friends_count: z.coerce.number().int().min(0),
  free_time_activities: z.string().min(1),
  experienced_peer_pressure: z.enum(YES_NO),
  experienced_bullying: z.enum(YES_NO),
  bullying_forms: z.array(z.enum(BULLYING_FORMS)).default([]),
  thought_of_self_harm: z.enum(YES_NO),
  attempted_self_harm: z.enum(YES_NO),
  weekday_residence: z.string().min(1),
  special_skills_talents: z.string().default(""),
  hobbies: z.string().default(""),

  conditions_since_birth: z.string().default(""),
  conditions_last_3_years: z.string().default(""),
  prior_jhs_guidance_visit: z.enum(YES_NO),
  prior_jhs_visit_details: z.string().default(""),
  prior_external_counseling: z.enum(YES_NO),
  prior_external_counseling_details: z.string().default(""),
  prior_psychological_treatment: z.enum(YES_NO),
  prior_treatment_details: z.string().default(""),

  emergency_contact: z.object({
    name: z.string().min(1),
    relationship: z.string().min(1),
    address: z.string().min(1),
    contact: phPhone,
  }),

  consent_acknowledged: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the data privacy notice." }),
  }),
  signature_name: z.string().min(1),
});

export type NewStudentPds = z.infer<typeof newStudentPdsSchema>;
