import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import {
  SubmissionsTable,
  type SubmissionRow,
} from "../../components/guidance/SubmissionsTable";
import {
  SubmissionFilters,
  type Filters,
} from "../../components/guidance/SubmissionFilters";

export default function Dashboard() {
  const { signOut } = useAuth();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ formType: "all", search: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("pds_submissions")
        .select("id, form_type, student_name, grade_level, section, submitted_at")
        .order("submitted_at", { ascending: false })
        .limit(200);
      if (filters.formType !== "all") q = q.eq("form_type", filters.formType);
      if (filters.search.trim()) q = q.ilike("student_name", `%${filters.search.trim()}%`);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data ?? []) as SubmissionRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const counts = useMemo(() => {
    return {
      total: rows.length,
      old: rows.filter((r) => r.form_type === "old").length,
      new: rows.filter((r) => r.form_type === "new").length,
    };
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold">NPS Guidance Office — Submissions</h1>
          <Link to="/students" className="text-xs text-slate-500 hover:text-slate-900 underline">
            ← Registrar
          </Link>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-slate-600 hover:text-slate-900 underline"
        >
          Sign out
        </button>
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <p className="text-sm text-slate-600 mb-4">
          Showing {counts.total} submissions ({counts.old} old, {counts.new} new).
        </p>
        <SubmissionFilters value={filters} onChange={setFilters} />
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        {loading ? (
          <div className="text-slate-500">Loading…</div>
        ) : (
          <SubmissionsTable rows={rows} />
        )}
      </main>
    </div>
  );
}
