import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { SubmissionView } from "../../components/guidance/SubmissionView";

type Row = {
  id: string;
  form_type: "old" | "new";
  data: Record<string, unknown>;
  photo_path: string | null;
  signature_name: string;
  signed_at: string;
};

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [row, setRow] = useState<Row | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("pds_submissions")
        .select("id, form_type, data, photo_path, signature_name, signed_at")
        .eq("id", id)
        .single();
      if (error) {
        setError(error.message);
        return;
      }
      setRow(data as Row);
      if (data?.photo_path) {
        const { data: signed } = await supabase.storage
          .from("pds-photos")
          .createSignedUrl(data.photo_path, 300);
        setPhotoUrl(signed?.signedUrl ?? null);
      }
    })();
  }, [id]);

  const onDelete = async () => {
    if (!row) return;
    if (!confirm("Delete this submission permanently? This cannot be undone.")) return;
    setDeleting(true);
    if (row.photo_path) {
      await supabase.storage.from("pds-photos").remove([row.photo_path]);
    }
    const { error } = await supabase.from("pds_submissions").delete().eq("id", row.id);
    setDeleting(false);
    if (error) setError(error.message);
    else nav("/guidance");
  };

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!row) return <div className="p-8 text-slate-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex items-center justify-between print:hidden">
        <Link to="/guidance" className="text-sm text-slate-600 underline">
          ← Back to submissions
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded"
          >
            Print / Save PDF
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-sm bg-red-600 text-white px-3 py-1.5 rounded disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4 md:p-8 print:p-0">
        <SubmissionView
          formType={row.form_type}
          data={row.data}
          photoUrl={photoUrl}
          signedAt={row.signed_at}
          signatureName={row.signature_name}
        />
      </main>
    </div>
  );
}
