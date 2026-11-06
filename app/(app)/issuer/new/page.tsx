'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function NewPropertyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Pune');
  const [locality, setLocality] = useState('Kalyani Nagar');
  const [propertyType, setPropertyType] = useState('commercial');
  const [normalizedAddress, setNormalizedAddress] = useState('');
  const [builtUpAreaSqm, setBuiltUpAreaSqm] = useState('');
  const [rrZoneRef, setRrZoneRef] = useState('PUN-KLN-2026-A1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !normalizedAddress.trim() || !builtUpAreaSqm) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    const area = parseFloat(builtUpAreaSqm);
    if (isNaN(area) || area <= 0) {
      setErrorMsg('Built-up area must be a valid positive number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          city: city.trim(),
          locality: locality.trim(),
          property_type: propertyType,
          normalized_address: normalizedAddress.trim(),
          built_up_area_sqm: area,
          rr_zone_ref: rrZoneRef.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create property submission');
      }

      router.push(`/issuer/properties/${data.property.id}`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <Link href="/issuer" className="hover:text-[var(--text-primary)] transition-colors">
          Issuer Portal
        </Link>
        <span>/</span>
        <span className="text-[var(--text-primary)] font-medium">New Property Submission</span>
      </div>

      <div className="border-b border-[var(--border)] pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Onboard New Real-World Asset
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Initiate a new property submission under the Maharashtra verification framework. Once created, you will upload title and compliance documents to calculate a Merkle evidence manifest.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-6 space-y-5 shadow-sm">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-primary)]">
            Property / Asset Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Platina Tech Park Wing B"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-primary)]">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Commercial office asset, Grade-A IT park, LEED Gold certified..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              City *
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Locality *
            </label>
            <input
              type="text"
              required
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-primary)]">
            Normalized Physical Address *
          </label>
          <input
            type="text"
            required
            placeholder="Plot 14, Marigold Complex, Kalyani Nagar, Pune 411014"
            value={normalizedAddress}
            onChange={(e) => setNormalizedAddress(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Property Type *
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="residential">Residential</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Built-up Area (sqm) *
            </label>
            <input
              type="number"
              step="any"
              min="1"
              required
              placeholder="e.g. 1850"
              value={builtUpAreaSqm}
              onChange={(e) => setBuiltUpAreaSqm(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Ready Reckoner Zone Ref
            </label>
            <input
              type="text"
              value={rrZoneRef}
              onChange={(e) => setRrZoneRef(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <Link
            href="/issuer"
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </Link>

          <Button type="submit" isLoading={isSubmitting}>
            Create Asset & Continue to Evidence Upload &rarr;
          </Button>
        </div>
      </form>
    </div>
  );
}

