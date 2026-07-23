import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in - BALY by Bilal Garments EST 2001." }] }),
  component: Login,
});

function Login() {
  const auth = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let err: string | null = null;
    if (mode === "login") err = await auth.login(email, password);
    else err = await auth.register({ email, name, password });
    if (err) return toast.error(err);
    toast.success(mode === "login" ? "Welcome back" : "Account created");
    const u = useAuth.getState().user;
    nav({ to: u?.role === "admin" ? "/admin" : "/account" });
  };

  return (
    <div className="container-bg max-w-md py-16 md:py-24">
      <h1 className="display mb-2 text-4xl md:text-5xl">{mode === "login" ? "Sign in." : "Create account."}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {mode === "login" ? "Welcome back to BALY by Bilal Garments EST 2001." : "Join the inside circle."}
      </p>
      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <Field label="Full name" value={name} onChange={setName} />
        )}
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        <button className="w-full bg-primary py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground">
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>New here? <button onClick={() => setMode("register")} className="text-foreground underline underline-offset-4">Create an account</button></>
        ) : (
          <>Already have an account? <button onClick={() => setMode("login")} className="text-foreground underline underline-offset-4">Sign in</button></>
        )}
      </div>

      <div className="mt-10 bg-secondary p-4 text-xs text-muted-foreground">
        <div className="mb-1 font-semibold text-foreground">Demo admin</div>
        admin@bilalgarments.pk · admin123
      </div>

      <div className="mt-6 text-center text-xs">
        <Link to="/" className="underline underline-offset-4 text-muted-foreground">Back to home</Link>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-foreground"
      />
    </label>
  );
}
