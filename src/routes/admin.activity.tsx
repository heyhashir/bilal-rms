import { createFileRoute } from "@tanstack/react-router";
import { useRetail } from "@/store/retail";
import { PageHeader, EmptyState } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/activity")({
  component: AdminActivity,
});

function AdminActivity() {
  const activity = useRetail((s) => s.activity);

  return (
    <div>
      <PageHeader eyebrow="Overview" title="Activity log" description="A running record of admin and system actions." />
      {activity.length === 0 ? (
        <EmptyState title="No activity yet" />
      ) : (
        <div className="border-l border-border pl-5 space-y-4">
          {activity.map((a) => (
            <div key={a.id} className="relative">
              <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="text-sm">
                <span className="font-semibold">{a.actor}</span>{" "}
                <span className="text-muted-foreground">{a.action}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{a.target} · {new Date(a.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
