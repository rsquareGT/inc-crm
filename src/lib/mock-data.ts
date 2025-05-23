
import type { Contact, Company, Deal, Task, Note, Industry, CompanySize } from './types';
import { DEAL_STAGES, INDUSTRY_OPTIONS, COMPANY_SIZE_OPTIONS } from './constants';

// Helper to generate unique IDs - still needed for Contacts, Deals, Tasks for now
export const generateId = () => `id-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;

const now = new Date().toISOString();
const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

// Company related mock data is now removed as it will come from the DB.
// mockNotesCompany1, mockNotesCompany2, mockCompanies are removed.

// Contact, Deal, and Task mock data remains for now.
// Their associated notes are also kept for now, assuming they'll be linked to these mock entities.

export const mockNotesContact1: Note[] = [
  { id: generateId(), content: 'Alice mentioned interest in AI features.', createdAt: now },
  { id: generateId(), content: 'Called to confirm meeting time.', createdAt: oneDayAgo },
];

export const mockNotesContact2: Note[] = [
  { id: generateId(), content: 'Bob prefers communication via email.', createdAt: now },
];

export const mockNotesDeal1: Note[] = [
  { id: generateId(), content: 'Legal team reviewing contract for Product A deal.', createdAt: now },
  { id: generateId(), content: 'Client requested a 5% discount.', createdAt: oneDayAgo },
];

export const mockNotesDeal2: Note[] = [
  { id: generateId(), content: 'Sent final proposal to Service Solutions.', createdAt: now },
];


export const mockContacts: Contact[] = [
  { id: 'contact-1-sql', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: '555-1234', companyId: 'company-1-sql', tags: ['Lead', 'Tech'], description: 'Interested in Product A. Key decision maker.', notes: mockNotesContact1, createdAt: now, updatedAt: now },
  { id: 'contact-2-sql', firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com', phone: '555-5678', companyId: 'company-2-sql', tags: ['Customer', 'Services'], description: 'Needs follow-up on Q2. Prefers email.', notes: mockNotesContact2, createdAt: now, updatedAt: now },
  { id: 'contact-3-sql', firstName: 'Carol', lastName: 'Williams', email: 'carol@example.com', companyId: 'company-1-sql', tags: ['Influencer', 'HR'], description: 'Internal champion for our services.', notes: [], createdAt: now, updatedAt: now },
  { id: 'contact-4-sql', firstName: 'David', lastName: 'Brown', email: 'david@enterprise.com', phone: '555-8765', companyId: 'company-1-sql', tags: ['Technical Buyer'], description: 'Focused on integration capabilities.', notes: [], createdAt: now, updatedAt: now },
];

// Temporary mock companies for other parts of the app that might still reference it directly.
// This should be empty once all entities use the DB.
export const mockCompanies: Company[] = [];


export const mockDeals: Deal[] = [
  { id: 'deal-1-sql', name: 'Innovatech Product A Deal', contactId: 'contact-1-sql', companyId: 'company-1-sql', stage: 'Opportunity', value: 50000, expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], tags: ['High Value', 'Q4 Target'], description: 'Initial discussion positive. Requires custom integration.', notes: mockNotesDeal1, createdAt: now, updatedAt: now },
  { id: 'deal-2-sql', name: 'Service Solutions Consulting Gig', contactId: 'contact-2-sql', companyId: 'company-2-sql', stage: 'Proposal Sent', value: 25000, expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], tags: ['Quick Win'], description: 'Proposal sent, awaiting feedback. Client is price sensitive.', notes: mockNotesDeal2, createdAt: now, updatedAt: now },
  { id: 'deal-3-sql', name: 'Innovatech Upsell Product B', contactId: 'contact-1-sql', companyId: 'company-1-sql', stage: 'Negotiation', value: 75000, tags: ['Existing Customer', 'Expansion'], description: 'Negotiating terms for Product B add-on. Strong interest.', notes: [], createdAt: now, updatedAt: now },
  { id: 'deal-4-sql', name: 'New Client Prospect Alpha', stage: 'Opportunity', value: 10000, tags: ['New Lead'], description: 'Cold outreach, initial interest shown.', notes: [], createdAt: now, updatedAt: now },
  { id: 'deal-5-sql', name: 'Past Deal Example (Won)', contactId: 'contact-3-sql', companyId: 'company-1-sql', stage: 'Won', value: 5000, tags: ['Pilot'], description: 'Successfully closed pilot project.', notes: [{id: generateId(), content: 'Deal successfully closed.', createdAt: threeDaysAgo}], createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'deal-6-sql', name: 'Past Deal Example (Lost)', companyId: 'company-2-sql', stage: 'Lost', value: 8000, tags: ['Competitor'], description: 'Lost to competitor X due to pricing.', notes: [{id: generateId(), content: 'Lost to competitor X.', createdAt: threeDaysAgo}], createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() },
];

export const mockTasks: Task[] = [
  { id: 'task-1-sql', title: 'Follow up with Alice', relatedContactId: 'contact-1-sql', relatedDealId: 'deal-1-sql', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], completed: false, tags: ['Urgent'], createdAt: now, updatedAt: now, description: 'Discuss proposal feedback for Product A deal.' },
  { id: 'task-2-sql', title: 'Prepare Q2 report for Bob', relatedContactId: 'contact-2-sql', completed: true, tags: ['Reporting'], createdAt: now, updatedAt: now, description: 'Finalize Q2 performance metrics for Service Solutions.' },
  { id: 'task-3-sql', title: 'Schedule demo for Deal Alpha', relatedDealId: 'deal-4-sql', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], completed: false, tags: [], createdAt: now, updatedAt: now, description: 'Product demo for New Client Prospect Alpha.' },
  { id: 'task-4-sql', title: 'Send contract to Innovatech for Deal 3', relatedDealId: 'deal-3-sql', completed: false, tags: ['Legal', 'High Priority'], createdAt: now, updatedAt: now, description: 'Final contract for Product B upsell.' },
];
