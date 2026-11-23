import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/app/logo";
import { FieldError } from "@/components/app/common";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — MyStudySpace" },
      { name: "description", content: "Sign in to your private MyStudySpace learning library." },
      { property: "og:title", content: "Sign in — MyStudySpace" },
      { property: "og:description", content: "Sign in to your private MyStudySpace learning library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
    if (mode !== "forgot") {
      if (password.length < 8) e.password = "Password must be at least 8 characters.";
      if (mode === "signup" && password !== confirm) e.confirm = "Passwords do not match.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setNotice(null);
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          setNotice("Check your email and click the confirmation link, then sign in here.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("If an account exists for this email, a password reset link is on its way.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(/invalid login/i.test(msg) ? "Wrong email or password." : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-hero" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative w-full max-w-md animate-rise">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border card-surface p-6 sm:p-8">
          {mode === "forgot" ? (
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Reset your password</h1>
              <p className="mt-1 text-sm text-muted-foreground">We'll email you a secure link.</p>
            </div>
          ) : (
            <Tabs value={mode} onValueChange={(v) => { setMode(v as "signin" | "signup"); setErrors({}); }} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-5">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="mt-1 text-sm text-muted-foreground">Open your personal study space.</p>
              </TabsContent>
              <TabsContent value="signup" className="mt-5">
                <h1 className="text-2xl font-bold">Create your space</h1>
                <p className="mt-1 text-sm text-muted-foreground">One account for your phone and laptop.</p>
              </TabsContent>
            </Tabs>
          )}

          {notice ? (
            <div className="mb-5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>
          ) : null}

          <form onSubmit={submit} className="grid gap-4" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 pl-9" placeholder="you@example.com" />
              </div>
              <FieldError message={errors.email} />
            </div>
            {mode !== "forgot" ? (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" ? (
                    <button type="button" onClick={() => { setMode("forgot"); setErrors({}); }} className="text-xs text-primary hover:underline">
                      Forgot password?
                    </button>
                  ) : null}
                </div>
                <div className="relative mt-1.5">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pl-9" placeholder="At least 8 characters" />
                </div>
                <FieldError message={errors.password} />
              </div>
            ) : null}
            {mode === "signup" ? (
              <div>
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5 h-11" />
                <FieldError message={errors.confirm} />
              </div>
            ) : null}
            <Button type="submit" size="lg" disabled={busy} className="mt-1 h-11">
              {busy ? <Loader2 className="animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
            {mode === "forgot" ? (
              <Button type="button" variant="ghost" onClick={() => setMode("signin")}>Back to sign in</Button>
            ) : null}
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Your files and notes are private to your account.</p>
      </div>
    </div>
  );
}
