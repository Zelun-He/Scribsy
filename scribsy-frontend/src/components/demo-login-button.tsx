"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function DemoLoginButton({ className = "", label = "View demo dashboard" }: { className?: string; label?: string }) {
  const { loginDemo, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={loading || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await loginDemo();
            router.push("/dashboard");
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Could not open the demo. Please try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening demo…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
