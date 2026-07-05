import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Bilal Garments" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [step, setStep] = useState<"email" | "reset" | "done">("email");

  const requestReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return toast.error("No account with this email");
    }
    toast.success("Verification passed — set a new password");
    setStep("reset");
  };

  const doReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) return toast.error("Password must be at least 6 characters");
    const err = auth.resetPassword(email, newPass);
    if (err) return toast.error(err);
    toast.success("Password updated");
    setStep("done");
  };

  return (
    <div className="container-bg py-16 md:py-24 max-w-md">
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Account recovery</div>
      <h1 className="display text-4xl md:text-5xl mb-3">Forgot password.</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {step === "email" && "Enter your email — we'll help you back in."}
        {step === "reset" && "Choose a new password for your account."}
        {step === "done" && "You're all set. Sign in with your new password."}
      </p>

      {step === "email" && (
        <form onSubmit={requestReset} className="space-y-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <button className="w-full bg-primary text-primary-foreground py-4 text-xs uppercase tracking-[0.2em]">Continue</button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={doReset} className="space-y-4">
          <Field label="New password" type="password" value={newPass} onChange={setNewPass} />
          <button className="w-full bg-primary text-primary-foreground py-4 text-xs uppercase tracking-[0.2em]">Update password</button>
        </form>
      )}

      {step === "done" && (
        <Link to="/login" className="inline-block bg-primary text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.2em]">Sign in</Link>
      )}

      <div className="mt-8 text-xs text-center">
        <Link to="/login" className="underline underline-offset-4 text-muted-foreground">Back to sign in</Link>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <input required type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground" />
    </label>
  );
}
