import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/logo";
import { FieldError } from "@/components/app/common";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — MyStudySpace" },
      { name: "description", content: "Choose a new password for your MyStudySpace account." },
      { property: "og:title", content: "Set a new password — MyStudySpace" },
      { property: "og:description", content: "Choose a new password for your MyStudySpace account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session || isRecovery) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return toast.error(err.message);
    toast.success("Password updated.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative grid min-h-dvh place-items-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-hero" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border card-surface p-6 sm:p-8">
          <h1 className="text-2xl font-bold">Set a new password</h1>
          {!ready ? (
            <p className="mt-3 text-sm text-muted-foreground">Open this page from the reset link in your email.</p>
          ) : (
            <form onSubmit={submit} className="mt-6 grid gap-4">
              <div>
                <Label htmlFor="np">New password</Label>
                <Input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11" />
              </div>
              <div>
                <Label htmlFor="cp">Confirm new password</Label>
                <Input id="cp" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5 h-11" />
                <FieldError message={error} />
              </div>
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null} Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
