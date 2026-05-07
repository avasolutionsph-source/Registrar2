import { z } from "zod";

export const GRADE_LEVELS = [
  "SPED",
  "Nursery I",
  "Nursery II",
  "Kinder",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11 GAS",
  "Grade 11 HUMSS",
  "Grade 11 STEM",
  "Grade 12 GAS",
  "Grade 12 HUMSS",
  "Grade 12 STEM",
] as const;

export const GENDERS = ["Male", "Female", "Prefer not to say"] as const;
export const COUNSELOR_INTEREST = ["Yes", "No", "Maybe"] as const;

const phPhone = z
  .string()
  .regex(/^(\+63|0)9\d{9}$/, "Use PH mobile format e.g. 09171234567");

export const oldStudentPdsSchema = z
  .object({
    full_name: z.string().min(1, "Required"),
    nickname: z.string().optional().default(""),
    grade_level: z.enum(GRADE_LEVELS),
    section: z.string().min(1, "Required"),
    mobile_number: phPhone,
    email: z.string().email("Invalid email"),
    gender: z.enum(GENDERS),
    birthdate: z.string().min(1, "Required"),
    home_address: z.string().min(1, "Required"),

    living_with: z.string().min(1, "Required"),
    father_full_name: z.string().min(1, "Required (use N/A if not applicable)"),
    mother_full_name: z.string().min(1, "Required (use N/A if not applicable)"),
    father_occupation: z.string().min(1, "Required (use N/A if not applicable)"),
    mother_occupation: z.string().min(1, "Required (use N/A if not applicable)"),
    parent_guardian_name: z.string().min(1, "Required"),
    parent_guardian_contact: phPhone,
    parent_guardian_email: z.string().email().or(z.literal("")).optional(),
    siblings_in_nps_count: z.number().int().min(0).default(0),
    siblings_in_nps_grade_levels: z.string().default(""),

    medical_conditions: z.string().default(""),
    emergency_contact_name: z.string().min(1, "Required"),
    emergency_contact_number: phPhone,
    emergency_contact_relationship: z.string().min(1, "Required"),

    wants_counselor: z.enum(COUNSELOR_INTEREST),
    concerns_to_share: z.string().default(""),
    looking_forward_to: z.string().default(""),

    consent_acknowledged: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the data privacy notice." }),
    }),
    signature_name: z.string().min(1, "Type your full name as signature"),
  })
  .refine(
    (v) => v.siblings_in_nps_count === 0 || v.siblings_in_nps_grade_levels.length > 0,
    {
      path: ["siblings_in_nps_grade_levels"],
      message: "List the grade level(s) of your siblings.",
    },
  );

export type OldStudentPds = z.infer<typeof oldStudentPdsSchema>;
