import { OldStudentView } from "./OldStudentView";
import { NewStudentView } from "./NewStudentView";
import { PdsHeader, PdsTitle, PdsFooter } from "./PdsHeader";

export function SubmissionView({
  formType,
  data,
  photoUrl,
  signedAt,
  signatureName,
}: {
  formType: "old" | "new";
  data: Record<string, unknown>;
  photoUrl: string | null;
  signedAt: string;
  signatureName: string;
}) {
  return (
    <article className="pds-document">
      <PdsHeader photoUrl={photoUrl} />
      <PdsTitle />
      {formType === "old" ? (
        <OldStudentView data={data} />
      ) : (
        <NewStudentView data={data} />
      )}
      <PdsFooter signatureName={signatureName} signedAt={signedAt} />
    </article>
  );
}
