import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Password reset unavailable - Bilal Garments" }] }),
  component: ForgotPasswordUnavailable,
});

function ForgotPasswordUnavailable() {
  return (
    <div className="container-bg max-w-2xl py-16 md:py-24">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Account recovery</div>
      <h1 className="display text-4xl md:text-5xl mb-3">Password reset is not self-serve yet.</h1>
      <p className="text-sm text-muted-foreground mb-8">
        This v1 release does not support online password recovery. Contact the store owner or support team to reset an account safely.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link to="/contact" className="bg-primary px-6 py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground">
          Contact support
        </Link>
        <Link to="/login" className="border border-foreground px-6 py-4 text-xs uppercase tracking-[0.2em]">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
