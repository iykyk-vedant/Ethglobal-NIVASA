import React from "react";
import { PublicHeader } from "@/components/shell/PublicHeader";
import { LegalFooter } from "@/components/shell/LegalFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-surface-page text-text-primary">
      <PublicHeader />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      <LegalFooter />
    </div>
  );
}
