
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { KanbanColumn } from './kanban-column';
import { DEAL_STAGES } from '@/lib/constants';
import type { Deal, Contact, Company, DealStage } from '@/lib/types';
import { DealFormModal } from './deal-form-modal';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';

export function KanbanBoardClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allContactsForForm, setAllContactsForForm] = useState<Contact[]>([]);
  const [allCompaniesForForm, setAllCompaniesForForm] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDataLoading, setIsFormDataLoading] = useState(true);
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
        const errorData = await response.json().catch(() => ({ error: `Failed to fetch deals: ${response.statusText}` }));
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
    setIsFormDataLoading(true);
    try {
      const [contactsRes, companiesRes] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/companies')
      ]);

      if (!contactsRes.ok) {
        let errorMsg = 'Failed to fetch contacts for form';
        try {
          const errorData = await contactsRes.json();
          if (errorData && errorData.error) {
            errorMsg = `Failed to fetch contacts for form: ${errorData.error}`;
          } else {
            errorMsg = `Failed to fetch contacts for form: Server responded with status ${contactsRes.status}`;
          }
        } catch (e) { 
           errorMsg = `Failed to fetch contacts for form: Server responded with status ${contactsRes.status} and non-JSON body.`;
        }
        throw new Error(errorMsg);
      }
      if (!companiesRes.ok) {
        let errorMsg = 'Failed to fetch companies for form';
        try {
          const errorData = await companiesRes.json();
          if (errorData && errorData.error) {
            errorMsg = `Failed to fetch companies for form: ${errorData.error}`;
          } else {
             errorMsg = `Failed to fetch companies for form: Server responded with status ${companiesRes.status}`;
          }
        } catch (e) { 
          errorMsg = `Failed to fetch companies for form: Server responded with status ${companiesRes.status} and non-JSON body.`;
        }
        throw new Error(errorMsg);
      }
      
      const contactsData = await contactsRes.json();
      const companiesData = await companiesRes.json();
      
      setAllContactsForForm(contactsData);
      setAllCompaniesForForm(companiesData);
    } catch (err) {
      console.error("Error fetching data for deal form:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Loading Form Data", description: message, variant: "destructive" });
    } finally {
      setIsFormDataLoading(false);
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
    fetchDeals(); 
  };

  const handleChangeDealStage = async (dealId: string, newStage: DealStage) => {
    const originalDeal = deals.find(d => d.id === dealId);
    if (!originalDeal) return;

    const updatedDealPayload = { ...originalDeal, stage: newStage, updatedAt: new Date().toISOString() };
     // Optimistically update UI
    setDeals(prevDeals => 
      prevDeals.map(deal => 
        deal.id === dealId ? updatedDealPayload : deal
      )
    );


    try {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDealPayload), 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: "Failed to update deal stage"}));
        throw new Error(errorData.error || 'Failed to update deal stage');
      }
      toast({ title: "Deal Stage Updated", description: `"${originalDeal.name}" moved to ${newStage}.` });
      // Optionally re-fetch to ensure consistency, or rely on optimistic update if response is minimal
      // fetchDeals(); 
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Updating Stage", description: message, variant: "destructive" });
      setDeals(prevDeals => prevDeals.map(d => d.id === dealId ? originalDeal : d)); // Revert on error
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
        const errorData = await response.json().catch(() => ({error: "Failed to delete deal"}));
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

  if ((isLoading && deals.length === 0) || isFormDataLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages."/>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading deals and form data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error && deals.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages."/>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-lg text-destructive">Error loading deals: {error}</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-full">
      <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages.">
        <Button onClick={() => handleOpenModal()} disabled={isFormDataLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Deal
        </Button>
      </PageSectionHeader>
      
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {DEAL_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={deals.filter(d => d.stage === stage)} 
            contacts={allContactsForForm} 
            companies={allCompaniesForForm}
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
