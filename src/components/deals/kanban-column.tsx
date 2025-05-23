
import type { Deal, Contact, Company, DealStage } from '@/lib/types';
import { DealCard } from './deal-card';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  deals, // These are already filtered for the current stage
  contacts,
  companies,
  onEditDeal,
  onDeleteDeal,
  onChangeDealStage
}: KanbanColumnProps) {
  // const dealsInStage = deals.filter((deal) => deal.stage === stage); // No longer needed, deals are pre-filtered
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const formattedTotalValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits:0, maximumFractionDigits:0 }).format(totalValue);

  return (
    <div className={`flex-shrink-0 w-80 bg-secondary/50 rounded-lg p-1 border-t-4 ${stageColors[stage]}`}>
      <div className="p-3">
        <h3 className="text-md font-semibold mb-1">{stage} ({deals.length})</h3>
        <p className="text-xs text-muted-foreground mb-3">{formattedTotalValue}</p>
      </div>
      <ScrollArea className="h-[calc(100vh-20rem)] pr-1"> {/* Adjust height as needed */}
        <div className="p-3 pt-0">
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
