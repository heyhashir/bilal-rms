import { Link } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/admin/primitives";

export function NotInScope({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader eyebrow="Deferred" title={title} description={description} />
      <EmptyState
        title="Not in the launch build"
        hint="This module was part of the original demo UI. It is intentionally disabled until a real backend workflow is added."
        cta={<Link to="/admin" className="text-xs uppercase tracking-widest underline">Back to dashboard</Link>}
      />
    </div>
  );
}
