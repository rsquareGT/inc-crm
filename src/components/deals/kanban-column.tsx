
import type { Deal, Contact, Company, DealStage } from '@/lib/types';
import { DealCard } from './deal-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';

interface KanbanColumnProps {
  stage: DealStage;
  deals: Deal[]; // Expects pre-filtered deals for this stage
  contacts: Contact[]; // All contacts, for looking up details for DealCard
  companies: Company[]; // All companies, for looking up details for DealCard
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (dealId: string) => void;
  onChangeDealStage: (dealId: string, newStage: DealStage) => void;
}

const stageColors: Record<DealStage, string> = {
  Opportunity: "border-blue-500",
  "Proposal Sent": "border-purple-500",
  Negotiation: "border-yellow-500",
  Won: "border-green-500",
  Lost: "border-red-500",
};

export function KanbanColumn({
  stage,
  deals,
  contacts,
  companies,
  onEditDeal,
  onDeleteDeal,
  onChangeDealStage
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const formattedTotalValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits:0, maximumFractionDigits:0 }).format(totalValue);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Check if the mouse is truly leaving the column or just entering a child (deal card)
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    const dealId = e.dataTransfer.getData("dealId");
    const sourceStage = e.dataTransfer.getData("sourceStage") as DealStage;

    if (dealId && stage !== sourceStage) {
      onChangeDealStage(dealId, stage);
    }
  };

  return (
    <div
      className={cn(
        `flex-shrink-0 w-60 bg-secondary/50 rounded-lg p-1 border-t-4 transition-colors duration-150 ease-in-out`, // Changed w-80 to w-60
        stageColors[stage],
        isOver ? 'bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-transparent'
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3">
        <h3 className="text-md font-semibold mb-1">{stage} ({deals.length})</h3>
        <p className="text-xs text-muted-foreground mb-3">{formattedTotalValue}</p>
      </div>
      <ScrollArea className="h-[calc(100vh-20rem)] pr-1">
        <div className="p-3 pt-0 space-y-0.5"> {/* Reduced space-y for tighter card packing */}
        {deals.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No deals in this stage.</p>}
        {deals.map((deal) => {
          const contact = contacts.find((c) => c.id === deal.contactId);
          const company = companies.find((c) => c.id === deal.companyId);
          return (
            <DealCard
              key={deal.id}
              deal={deal}
              contact={contact}
              company={company}
              onEdit={onEditDeal}
              onDelete={onDeleteDeal}
              onChangeStage={onChangeDealStage}
            />
          );
        })}
        </div>
      </ScrollArea>
    </div>
  );
}
