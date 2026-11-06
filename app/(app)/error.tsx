"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/shell/PageContainer";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Route Error:", error);
  }, [error]);

  return (
    <PageContainer>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h1 className="text-xl font-bold text-text-primary tracking-tight">
          Application View Error
        </h1>

        <p className="text-sm text-text-secondary mt-2 mb-6">
          Unable to render this console view. The requested resource or query failed to load.
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
            <span>Retry view</span>
          </Button>

          <Link href="/dashboard">
            <Button variant="secondary">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
