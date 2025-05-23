import type { Contact, Company, Deal, Task, DealStage } from './types';
import { DEAL_STAGES } from './constants';

const now = new Date().toISOString();

export const mockContacts: Contact[] = [
  { id: 'contact-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: '555-1234', companyId: 'company-1', tags: ['Lead', 'Tech'], notes: 'Interested in Product A', createdAt: now, updatedAt: now },
  { id: 'contact-2', firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com', phone: '555-5678', companyId: 'company-2', tags: ['Customer', 'Services'], notes: 'Needs follow-up on Q2', createdAt: now, updatedAt: now },
  { id: 'contact-3', firstName: 'Carol', lastName: 'Williams', email: 'carol@example.com', companyId: 'company-1', tags: ['Influencer'], createdAt: now, updatedAt: now },
];

export const mockCompanies: Company[] = [
  { id: 'company-1', name: 'Innovatech Ltd.', industry: 'Technology', website: 'innovatech.com', address: '123 Tech Park', tags: ['Enterprise', 'SaaS'], notes: 'Key client for new products', createdAt: now, updatedAt: now },
  { id: 'company-2', name: 'Service Solutions Inc.', industry: 'Consulting', website: 'servicesolutions.com', address: '456 Consult Ave', tags: ['SMB'], createdAt: now, updatedAt: now },
];

export const mockDeals: Deal[] = [
  { id: 'deal-1', name: 'Innovatech Product A Deal', contactId: 'contact-1', companyId: 'company-1', stage: 'Opportunity', value: 50000, expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], tags: ['High Value', 'Q4 Target'], notes: 'Initial discussion positive.', createdAt: now, updatedAt: now },
  { id: 'deal-2', name: 'Service Solutions Consulting Gig', contactId: 'contact-2', companyId: 'company-2', stage: 'Proposal Sent', value: 25000, expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], tags: ['Quick Win'], notes: 'Proposal sent, awaiting feedback.', createdAt: now, updatedAt: now },
  { id: 'deal-3', name: 'Innovatech Upsell Product B', contactId: 'contact-1', companyId: 'company-1', stage: 'Negotiation', value: 75000, tags: ['Existing Customer'], createdAt: now, updatedAt: now },
  { id: 'deal-4', name: 'New Client Prospect Alpha', stage: 'Opportunity', value: 10000, tags: ['New Lead'], createdAt: now, updatedAt: now },
  { id: 'deal-5', name: 'Past Deal Example (Won)', contactId: 'contact-3', stage: 'Won', value: 5000, createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'deal-6', name: 'Past Deal Example (Lost)', stage: 'Lost', value: 8000, createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() },
];

export const mockTasks: Task[] = [
  { id: 'task-1', title: 'Follow up with Alice', relatedContactId: 'contact-1', relatedDealId: 'deal-1', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], completed: false, tags: ['Urgent'], createdAt: now, updatedAt: now },
  { id: 'task-2', title: 'Prepare Q2 report for Bob', relatedContactId: 'contact-2', completed: true, tags: ['Reporting'], createdAt: now, updatedAt: now },
  { id: 'task-3', title: 'Schedule demo for Deal Alpha', relatedDealId: 'deal-4', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], completed: false, tags: [], createdAt: now, updatedAt: now },
];

// Helper to generate unique IDs
export const generateId = () => `id-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
