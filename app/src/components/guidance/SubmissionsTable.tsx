import { Link } from "react-router-dom";

export type SubmissionRow = {
  id: string;
  form_type: "old" | "new";
  student_name: string;
  grade_level: string;
  section: string | null;
  submitted_at: string;
};

export function SubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-slate-500 py-12 bg-white rounded-lg border border-slate-200">
        No submissions yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="px-3 py-2">Submitted</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Student Name</th>
            <th className="px-3 py-2">Grade</th>
            <th className="px-3 py-2">Section</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2 whitespace-nowrap">
                {new Date(r.submitted_at).toLocaleString()}
              </td>
              <td className="px-3 py-2 capitalize">{r.form_type}</td>
              <td className="px-3 py-2 font-medium">{r.student_name}</td>
              <td className="px-3 py-2">{r.grade_level}</td>
              <td className="px-3 py-2">{r.section ?? "—"}</td>
              <td className="px-3 py-2">
                <Link
                  to={`/guidance/${r.id}`}
                  className="text-npsRed underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
