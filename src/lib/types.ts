
export type Tag = string;

export interface Note {
  id: string;
  content: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyId?: string;
  tags: Tag[];
  description?: string;
  notes: Note[]; // Added notes field
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  tags: Tag[];
  description?: string;
  notes: Note[];
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
  notes: Note[]; // Added notes field
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
