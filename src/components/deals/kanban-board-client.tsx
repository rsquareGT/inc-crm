
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { KanbanColumn } from './kanban-column';
import { DEAL_STAGES } from '@/lib/constants';
import type { Deal, Contact, Company, DealStage } from '@/lib/types';
// mockDeals, mockContacts, mockCompanies are no longer the primary source for deals. Contacts/Companies are for form select.
import { mockContacts, mockCompanies } from '@/lib/mock-data'; 
import { DealFormModal } from './deal-form-modal';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';

export function KanbanBoardClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  // Contacts and Companies are needed for the DealFormModal select dropdowns
  const [allContactsForForm, setAllContactsForForm] = useState<Contact[]>([]);
  const [allCompaniesForForm, setAllCompaniesForForm] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDeals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/deals');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch deals: ${response.statusText}`);
      }
      const data: Deal[] = await response.json();
      setDeals(data);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
      toast({ title: "Error Fetching Deals", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const fetchFormData = useCallback(async () => {
    try {
      const [contactsRes, companiesRes] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/companies')
      ]);
      if (!contactsRes.ok) throw new Error('Failed to fetch contacts for form');
      if (!companiesRes.ok) throw new Error('Failed to fetch companies for form');
      
      const contactsData = await contactsRes.json();
      const companiesData = await companiesRes.json();
      
      setAllContactsForForm(contactsData);
      setAllCompaniesForForm(companiesData);
    } catch (err) {
      console.error("Error fetching data for deal form:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Loading Form Data", description: message, variant: "destructive" });
    }
  }, [toast]);


  useEffect(() => {
    fetchDeals();
    fetchFormData();
  }, [fetchDeals, fetchFormData]);

  const handleOpenModal = (deal: Deal | null = null) => {
    setEditingDeal(deal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDeal(null);
  };

  const handleSaveDealCallback = () => {
    fetchDeals(); // Re-fetch deals after save
  };

  const handleChangeDealStage = async (dealId: string, newStage: DealStage) => {
    const originalDeal = deals.find(d => d.id === dealId);
    if (!originalDeal) return;

    // Optimistically update UI
    setDeals(prevDeals => 
      prevDeals.map(deal => 
        deal.id === dealId ? { ...deal, stage: newStage, updatedAt: new Date().toISOString() } : deal
      )
    );

    try {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...originalDeal, stage: newStage }), // Send full updated deal, or just stage
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update deal stage');
      }
      toast({ title: "Deal Stage Updated", description: `"${originalDeal.name}" moved to ${newStage}.` });
      fetchDeals(); // Re-fetch to ensure consistency
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Updating Stage", description: message, variant: "destructive" });
      setDeals(prevDeals => prevDeals.map(d => d.id === dealId ? originalDeal : d)); // Revert optimistic update
    }
  };
  
  const handleDeleteDeal = (dealId: string) => {
    setDealToDelete(dealId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDeal = async () => {
    if (!dealToDelete) return;
    
    const dealName = deals.find(d => d.id === dealToDelete)?.name || "Deal";
    try {
      const response = await fetch(`/api/deals/${dealToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete deal: ${response.statusText}`);
      }
      toast({ title: "Deal Deleted", description: `Deal "${dealName}" has been deleted.`});
      setDeals(prevDeals => prevDeals.filter(d => d.id !== dealToDelete));
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Deleting Deal", description: message, variant: "destructive" });
    } finally {
      setShowDeleteDialog(false);
      setDealToDelete(null);
    }
  };

  if (isLoading && deals.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages."/>
        <p className="text-center py-10">Loading deals...</p>
      </div>
    );
  }
  
  if (error && deals.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages."/>
        <p className="text-center py-10 text-destructive">Error loading deals: {error}</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-full">
      <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages.">
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Deal
        </Button>
      </PageSectionHeader>
      
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {DEAL_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={deals.filter(d => d.stage === stage)} // Pass pre-filtered deals
            contacts={allContactsForForm} // Pass all contacts for card display
            companies={allCompaniesForForm} // Pass all companies for card display
            onEditDeal={handleOpenModal}
            onDeleteDeal={handleDeleteDeal}
            onChangeDealStage={handleChangeDealStage}
          />
        ))}
      </div>

      <DealFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveCallback={handleSaveDealCallback}
        deal={editingDeal}
        contacts={allContactsForForm}
        companies={allCompaniesForForm}
      />
      
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteDeal}
        itemName={deals.find(d => d.id === dealToDelete)?.name || "this deal"}
      />
    </div>
  );
}
