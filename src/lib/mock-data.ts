
// Helper to generate unique IDs - primarily for server-side use now for new notes, or if tasks/other entities don't have backend ID generation yet.
export const generateId = () => `id-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;

// All mock data for Companies, Contacts, Deals, Tasks, and their specific Notes are removed.
// They will be fetched from the database via API calls.
// Any remaining constants like DEAL_STAGES, INDUSTRY_OPTIONS are in constants.ts.
