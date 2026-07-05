import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useRetail } from "@/store/retail";
import { PageHeader, ActionButton, EmptyState, StatusPill } from "@/components/admin/primitives";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

function AdminNotifications() {
  const { notifications, markNotifRead, markAllRead } = useRetail();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={`Notifications (${unread} unread)`}
        action={<ActionButton variant="ghost" onClick={markAllRead}><Check className="h-3.5 w-3.5" /> Mark all read</ActionButton>}
      />
      {notifications.length === 0 ? (
        <EmptyState title="You're all caught up" />
      ) : (
        <div className="border border-border">
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 p-4 border-b border-border last:border-0 ${!n.read ? "bg-secondary/50" : ""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{n.title}</span>
                  <StatusPill status={n.level} />
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <div className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.read && (
                <button onClick={() => markNotifRead(n.id)} className="text-xs uppercase tracking-widest underline">Mark read</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
