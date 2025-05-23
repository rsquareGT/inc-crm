
export type Tag = string;

export interface Note {
  id: string;
  content: string;
  createdAt: string;
}

export type Industry =
  | 'Technology'
  | 'Healthcare'
  | 'Finance'
  | 'Manufacturing'
  | 'Retail'
  | 'Education'
  | 'Real Estate'
  | 'Hospitality'
  | 'Agriculture'
  | 'Automotive'
  | 'Construction'
  | 'Consulting'
  | 'Energy'
  | 'Entertainment'
  | 'Government'
  | 'Non-Profit'
  | 'Other';

export type CompanySize =
  | '1-10 employees'
  | '11-50 employees'
  | '51-200 employees'
  | '201-500 employees'
  | '501-1000 employees'
  | '1001-5000 employees'
  | '5000+ employees'
  | 'Sole Proprietor';


export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyId?: string;
  tags: Tag[];
  description?: string;
  notes: Note[];
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: Industry;
  website?: string;
  // Old address field removed
  street?: string;
  city?: string;
  state?: string; // Or province
  postalCode?: string;
  country?: string;
  contactPhone1?: string;
  contactPhone2?: string;
  companySize?: CompanySize;
  accountManagerId?: string; // ID of a contact
  tags: Tag[];
  description?: string; // This was the old "notes"
  notes: Note[]; // This is for chronological, timestamped notes
  createdAt: string;
  updatedAt: string;
}

export type DealStage = 'Opportunity' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';

export interface Deal {
  id: string;
  name: string;
  contactId?: string;
  companyId?: string;
  stage: DealStage;
  value: number;
  expectedCloseDate?: string;
  tags: Tag[];
  description?: string;
  notes: Note[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  relatedDealId?: string;
  relatedContactId?: string;
  completed: boolean;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}
