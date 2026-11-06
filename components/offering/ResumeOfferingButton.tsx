'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ResumeOfferingDialog } from './ResumeOfferingDialog';

export interface ResumeOfferingButtonProps {
  offeringId: string;
  offeringStatus: string;
  manifestVersion?: number;
  merkleRoot?: string;
  className?: string;
}

export function ResumeOfferingButton({
  offeringId,
  offeringStatus,
  manifestVersion,
  merkleRoot,
  className = '',
}: ResumeOfferingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (offeringStatus !== 'paused_evidence_drift' && offeringStatus !== 'paused') {
    return null;
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs font-semibold"
        data-testid="open-resume-dialog-button"
      >
        Resume Offering &amp; Unpause (Verifier / Admin)
      </Button>

      <ResumeOfferingDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        offeringId={offeringId}
        manifestVersion={manifestVersion}
        merkleRoot={merkleRoot}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

