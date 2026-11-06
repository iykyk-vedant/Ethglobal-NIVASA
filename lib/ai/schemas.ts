import { z } from 'zod';

export const preferenceFitEnum = z.enum([
  'insufficient_evidence',
  'poor_match',
  'partial_match',
  'good_match',
]);

export const changeDirectionEnum = z.enum([
  'improved',
  'weakened',
  'unchanged',
  'unsupported',
]);

export const indicatorChangeSchema = z.object({
  indicator: z.string().min(1),
  from: z.string(),
  to: z.string(),
  direction: changeDirectionEnum,
  supporting_evidence_ids: z.array(z.string()).min(1),
});

export const aiResponseSchema = z.object({
  summary: z.string().min(10).max(1000),
  preference_fit: preferenceFitEnum,
  changes: z.array(indicatorChangeSchema).min(1),
  risk_flags: z.array(z.string()),
  assumptions: z.array(z.string()),
  missing_information: z.array(z.string()),
  cannot_determine: z.array(z.string()),
  source_ids: z.array(z.string()).min(1),
  disclaimer: z.literal('Educational analysis only; not investment advice.'),
});

export type AiResponse = z.infer<typeof aiResponseSchema>;
export type IndicatorChange = z.infer<typeof indicatorChangeSchema>;

export const investorProfileSchema = z.object({
  yield_preference: z.enum(['modest', 'balanced', 'growth']),
  risk_tolerance: z.enum(['conservative', 'moderate', 'aggressive']),
  liquidity_horizon: z.enum(['short', 'medium', 'long']),
});

export type InvestorProfileInput = z.infer<typeof investorProfileSchema>;

export const analyzeOfferingSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID format'),
  snapshotFrom: z.number().int().positive().optional().default(1),
  snapshotTo: z.number().int().positive().optional().default(2),
});

export type AnalyzeOfferingInput = z.infer<typeof analyzeOfferingSchema>;

