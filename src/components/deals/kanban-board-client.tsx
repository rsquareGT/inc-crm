
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { KanbanColumn } from './kanban-column';
import { DEAL_STAGES } from '@/lib/constants';
import type { Deal, Contact, Company, DealStage } from '@/lib/types';
import { DealFormModal } from './deal-form-modal';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'; // For skeleton
import { ScrollArea } from '@/components/ui/scroll-area'; // For skeleton

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

  if (isLoading || isFormDataLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages.">
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Deal
          </Button>
        </PageSectionHeader>
        
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => (
            <div key={`skeleton-col-${stage}`} className={`flex-shrink-0 w-80 bg-secondary/50 rounded-lg p-1`}>
              <div className="p-3">
                <Skeleton className="h-5 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2 mb-3" />
              </div>
              <ScrollArea className="h-[calc(100vh-20rem)] pr-1">
                <div className="p-3 pt-0 space-y-3">
                  {Array.from({ length: 2 }).map((_, index) => ( // Show 2 skeleton cards per column
                    <Card key={`skeleton-deal-card-${stage}-${index}`} className="shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex justify-between items-start">
                          <Skeleton className="h-5 w-3/5" />
                          <Skeleton className="h-6 w-6" />
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-2 text-sm">
                        <div className="flex items-center"><Skeleton className="h-4 w-4 mr-2 rounded-full" /><Skeleton className="h-4 w-2/5" /></div>
                        <div className="flex items-center"><Skeleton className="h-4 w-4 mr-2 rounded-full" /><Skeleton className="h-4 w-3/5" /></div>
                      </CardContent>
                      <CardFooter className="px-4 pb-4 flex flex-wrap gap-1">
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error && deals.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages.">
          <Button onClick={() => handleOpenModal()} disabled={isFormDataLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Deal
          </Button>
        </PageSectionHeader>
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

    