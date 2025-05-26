
export type Tag = string;

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  organizationId: string;
  companyId?: string;
  contactId?: string;
  dealId?: string;
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
  organizationId: string;
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
  organizationId: string;
  name: string;
  industry?: Industry;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  contactPhone1?: string;
  contactPhone2?: string;
  companySize?: CompanySize;
  accountManagerId?: string; // Refers to a User['id']
  tags: Tag[];
  description?: string;
  notes: Note[];
  createdAt: string;
  updatedAt: string;
}

export type DealStage = 'Opportunity' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';

export interface Deal {
  id: string;
  organizationId: string;
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
  organizationId: string;
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

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ActivityEntityType = 'contact' | 'company' | 'deal' | 'task' | 'note'; // Extend as needed
export type ActivityType = 
  | 'created_contact' | 'updated_contact' | 'deleted_contact'
  | 'created_company' | 'updated_company' | 'deleted_company'
  | 'created_deal' | 'updated_deal_stage' | 'updated_deal_details' | 'deleted_deal'
  | 'created_task' | 'updated_task' | 'completed_task' | 'deleted_task'
  | 'added_note_to_contact' | 'added_note_to_company' | 'added_note_to_deal'
  | 'deleted_note_from_contact' | 'deleted_note_from_company' | 'deleted_note_from_deal';
  // Add more specific activity types

export interface Activity {
  id: string;
  organizationId: string;
  userId: string;          // User who performed the activity
  user?: Pick<User, 'firstName' | 'lastName' | 'email' | 'profilePictureUrl'>; // Optional: for displaying user info
  activityType: ActivityType;
  entityType: ActivityEntityType;
  entityId: string;
  entityName?: string;      // e.g., Contact name, Deal name for quick display
  details?: Record<string, any>; // For storing additional info like old/new values
  createdAt: string;
}
