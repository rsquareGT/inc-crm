
import type { DealStage, Industry, CompanySize } from './types';

export const DEAL_STAGES: DealStage[] = [
  'Opportunity',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
];

export const INDUSTRY_OPTIONS: Industry[] = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Real Estate',
  'Hospitality',
  'Agriculture',
  'Automotive',
  'Construction',
  'Consulting',
  'Energy',
  'Entertainment',
  'Government',
  'Non-Profit',
  'Other',
];

export const COMPANY_SIZE_OPTIONS: CompanySize[] = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1001-5000 employees',
  '5000+ employees',
  'Sole Proprietor',
];
