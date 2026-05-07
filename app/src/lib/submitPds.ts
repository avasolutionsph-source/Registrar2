import { supabase } from "./supabase";

export type SubmitInput = {
  formType: "old" | "new";
  studentName: string;
  gradeLevel: string;
  section?: string;
  data: Record<string, unknown>;
  photo?: File | null;
  signatureName: string;
  signedAt: string;
};

export async function submitPds(input: SubmitInput) {
  let photoPath: string | null = null;

  if (input.photo) {
    const ext = input.photo.name.split(".").pop() ?? "jpg";
    const path = `incoming/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("pds-photos")
      .upload(path, input.photo, { contentType: input.photo.type });
    if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`);
    photoPath = path;
  }

  const { error } = await supabase.from("pds_submissions").insert({
    form_type: input.formType,
    student_name: input.studentName,
    grade_level: input.gradeLevel,
    section: input.section ?? null,
    data: input.data,
    photo_path: photoPath,
    signature_name: input.signatureName,
    signed_at: input.signedAt,
  });

  if (error) throw new Error(error.message);
}
