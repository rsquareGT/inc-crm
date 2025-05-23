'use client';

import React, { useState, useEffect } from 'react';
import { KanbanColumn } from './kanban-column';
import { DEAL_STAGES } from '@/lib/constants';
import type { Deal, Contact, Company, DealStage } from '@/lib/types';
import { mockDeals, mockContacts, mockCompanies } from '@/lib/mock-data'; // Using mock data
import { DealFormModal } from './deal-form-modal';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog'; // Assuming this exists
import { useToast } from '@/hooks/use-toast';

export function KanbanBoardClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching data
    setDeals(mockDeals);
    setContacts(mockContacts);
    setCompanies(mockCompanies);
  }, []);

  const handleOpenModal = (deal: Deal | null = null) => {
    setEditingDeal(deal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDeal(null);
  };

  const handleSaveDeal = (dealToSave: Deal) => {
    setDeals((prevDeals) => {
      const existingIndex = prevDeals.findIndex((d) => d.id === dealToSave.id);
      if (existingIndex > -1) {
        const updatedDeals = [...prevDeals];
        updatedDeals[existingIndex] = dealToSave;
        toast({ title: "Deal Updated", description: `"${dealToSave.name}" has been updated.` });
        return updatedDeals;
      }
      toast({ title: "Deal Created", description: `New deal "${dealToSave.name}" has been added.` });
      return [...prevDeals, dealToSave];
    });
  };

  const handleChangeDealStage = (dealId: string, newStage: DealStage) => {
    setDeals(prevDeals => 
      prevDeals.map(deal => 
        deal.id === dealId ? { ...deal, stage: newStage, updatedAt: new Date().toISOString() } : deal
      )
    );
    const dealName = deals.find(d => d.id === dealId)?.name || "Deal";
    toast({ title: "Deal Stage Updated", description: `"${dealName}" moved to ${newStage}.` });
  };
  
  const handleDeleteDeal = (dealId: string) => {
    setDealToDelete(dealId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDeal = () => {
    if (dealToDelete) {
      const dealName = deals.find(d => d.id === dealToDelete)?.name || "Deal";
      setDeals(prevDeals => prevDeals.filter(d => d.id !== dealToDelete));
      toast({ title: "Deal Deleted", description: `"${dealName}" has been deleted.`, variant: "destructive" });
    }
    setShowDeleteDialog(false);
    setDealToDelete(null);
  };


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
            deals={deals}
            contacts={contacts}
            companies={companies}
            onEditDeal={handleOpenModal}
            onDeleteDeal={handleDeleteDeal}
            onChangeDealStage={handleChangeDealStage}
          />
        ))}
      </div>

      <DealFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDeal}
        deal={editingDeal}
        contacts={contacts}
        companies={companies}
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
