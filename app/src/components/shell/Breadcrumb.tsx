import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  const navigate = useNavigate();
  const showBack = items.length > 1;

  return (
    <div className="flex items-center gap-3 mb-3">
      {showBack && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 px-2 py-1 -ml-2 rounded text-[12px] text-ink-secondary hover:text-ink-primary hover:bg-app"
          aria-label="Go back"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      )}
      <nav className="text-[11.5px] text-ink-muted">
        {items.map((item, i) => (
          <span key={i}>
            {item.to ? (
              <Link to={item.to} className="hover:text-ink-secondary">
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
            {i < items.length - 1 && <span className="mx-1.5">›</span>}
          </span>
        ))}
      </nav>
    </div>
  );
}
