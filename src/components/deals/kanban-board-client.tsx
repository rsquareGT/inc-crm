
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { KanbanColumn } from './kanban-column';
import { DEAL_STAGES } from '@/lib/constants';
import type { Deal, Contact, Company, DealStage, Organization } from '@/lib/types';
import { DealFormModal } from './deal-form-modal';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/auth-context';

export function KanbanBoardClient() {
  const { isAuthenticated, isLoading: authContextIsLoading, organization } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allContactsForForm, setAllContactsForForm] = useState<Contact[]>([]);
  const [allCompaniesForForm, setAllCompaniesForForm] = useState<Company[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [isFormDataLoading, setIsFormDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const currencySymbol = organization?.currencySymbol || '$';

  const fetchDeals = useCallback(async () => {
    setIsLoadingDeals(true);
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
      setIsLoadingDeals(false);
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
          errorMsg = errorData.error || `Failed to fetch contacts: ${contactsRes.statusText}`;
        } catch (e) {
          errorMsg = `Failed to fetch contacts for form: Server responded with status ${contactsRes.status} and non-JSON body.`;
        }
        throw new Error(errorMsg);
      }
      if (!companiesRes.ok) {
        let errorMsg = 'Failed to fetch companies for form';
        try {
          const errorData = await companiesRes.json();
          errorMsg = errorData.error || `Failed to fetch companies: ${companiesRes.statusText}`;
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
    if (isAuthenticated && !authContextIsLoading) {
      fetchDeals();
      fetchFormData();
    } else if (!authContextIsLoading && !isAuthenticated) {
      setDeals([]);
      setAllContactsForForm([]);
      setAllCompaniesForForm([]);
      setIsLoadingDeals(false);
      setIsFormDataLoading(false);
    }
  }, [fetchDeals, fetchFormData, isAuthenticated, authContextIsLoading]);

  const handleOpenModal = (deal: Deal | null = null) => {
    setEditingDeal(deal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDeal(null);
  };

  const handleSaveDealCallback = () => {
    if (isAuthenticated) fetchDeals();
    handleCloseModal();
  };

  const handleChangeDealStage = async (dealId: string, newStage: DealStage) => {
    const originalDeal = deals.find(d => d.id === dealId);
    if (!originalDeal) return;

    const updatedDealPayload = { ...originalDeal, stage: newStage, updatedAt: new Date().toISOString() };
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
        const errorData = await response.json().catch(() => ({ error: "Failed to update deal stage" }));
        throw new Error(errorData.error || 'Failed to update deal stage');
      }
      toast({ title: "Deal Stage Updated", description: `"${originalDeal.name}" moved to ${newStage}.` });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Updating Stage", description: message, variant: "destructive" });
      setDeals(prevDeals => prevDeals.map(d => d.id === dealId ? originalDeal : d));
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
        const errorData = await response.json().catch(() => ({ error: "Failed to delete deal" }));
        throw new Error(errorData.error || `Failed to delete deal: ${response.statusText}`);
      }
      toast({ title: "Deal Deleted", description: `Deal "${dealName}" has been deleted.` });
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

  if (authContextIsLoading || (isAuthenticated && (isLoadingDeals || isFormDataLoading))) {
    return (
      <div className="flex flex-col h-full">
        <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages.">
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Deal
          </Button>
        </PageSectionHeader>

        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => (
            <div key={`skeleton-col-${stage}`} className={`flex-shrink-0 w-60 bg-secondary/50 rounded-lg p-0.5`}>
              <div className="p-1.5">
                <Skeleton className="h-5 w-3/4 mb-0.5" />
                <Skeleton className="h-3 w-1/2 mb-1.5" />
              </div>
              <ScrollArea className="h-[calc(100vh-17.5rem)] pr-0.5">
                <div className="px-1.5 pb-1.5 pt-0 space-y-1">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <Card key={`skeleton-deal-card-${stage}-${index}`} className="mb-1.5 shadow-sm">
                      <CardHeader className="pb-1 pt-2 px-2">
                        <div className="flex justify-between items-start">
                          <Skeleton className="h-4 w-3/5" />
                          <Skeleton className="h-3 w-3" />
                        </div>
                      </CardHeader>
                      <CardContent className="px-2 pb-1.5 space-y-1 text-xs">
                        <div className="flex items-center"><Skeleton className="h-3 w-3 mr-1 rounded-full" /><Skeleton className="h-3 w-2/5" /></div>
                        <div className="flex items-center"><Skeleton className="h-3 w-3 mr-1 rounded-full" /><Skeleton className="h-3 w-3/5" /></div>
                      </CardContent>
                      <CardFooter className="px-2 pt-1 pb-1.5 flex flex-wrap gap-0.5">
                        <Skeleton className="h-4 w-10 rounded-full" />
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

  if (!isAuthenticated && !authContextIsLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages.">
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Deal
          </Button>
        </PageSectionHeader>
        <div className="flex-1 flex items-center justify-center">
          <p>Please log in to view deals.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-full">
      <PageSectionHeader title="Deals Pipeline" description="Visually manage your deals through stages.">
        <Button onClick={() => handleOpenModal()} disabled={isFormDataLoading || authContextIsLoading}>
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
            currencySymbol={currencySymbol}
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
