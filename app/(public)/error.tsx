"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public Route Error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>

      <h1 className="text-xl font-bold text-text-primary tracking-tight">
        Something went wrong
      </h1>

      <p className="text-sm text-text-secondary mt-2 mb-6">
        An error occurred while loading this page. You can attempt to reload the view or return to the overview.
      </p>

      {error.digest && (
        <p className="text-2xs font-mono text-text-secondary mb-6 bg-surface-muted px-2 py-1 rounded border border-border">
          Digest: {error.digest}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
        <Button
          variant="primary"
          onClick={() => reset()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          <span>Try again</span>
        </Button>

        <Link href="/">
          <Button variant="secondary">
            <Home className="w-4 h-4 mr-2" />
            <span>Return to Overview</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
