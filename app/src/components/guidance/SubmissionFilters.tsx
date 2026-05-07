export type Filters = {
  formType: "all" | "old" | "new";
  search: string;
};

export function SubmissionFilters({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (v: Filters) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-4">
      <select
        value={value.formType}
        onChange={(e) =>
          onChange({ ...value, formType: e.target.value as Filters["formType"] })
        }
        className="rounded border border-slate-300 px-3 py-2 bg-white"
      >
        <option value="all">All forms</option>
        <option value="old">Old Students</option>
        <option value="new">New Students</option>
      </select>
      <input
        type="search"
        placeholder="Search by student name…"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="flex-1 rounded border border-slate-300 px-3 py-2"
      />
    </div>
  );
}
