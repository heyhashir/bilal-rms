import { createFileRoute } from "@tanstack/react-router";
import { NotInScope } from "@/components/admin/NotInScope";

export const Route = createFileRoute("/admin/seo")({
  component: AdminSeo,
});

function AdminSeo() {
  return <NotInScope title="SEO manager" description="The dedicated SEO manager page is deferred; basic meta settings stay under Store Settings." />;
}
