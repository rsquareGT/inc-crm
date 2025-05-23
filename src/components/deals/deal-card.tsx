
import type { Deal, Contact, Company } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TagBadge } from '@/components/shared/tag-badge';
import { DollarSign, User, Building, Edit3, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEAL_STAGES } from '@/lib/constants';
import type { DealStage } from '@/lib/types';


interface DealCardProps {
  deal: Deal;
  contact?: Contact;
  company?: Company;
  onEdit: (deal: Deal) => void;
  onDelete: (dealId: string) => void;
  onChangeStage: (dealId: string, newStage: DealStage) => void;
}

export function DealCard({ deal, contact, company, onEdit, onDelete, onChangeStage }: DealCardProps) {
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(deal.value);

  const tags = deal.tags || [];

  return (
    <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow duration-200 bg-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold leading-tight">{deal.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                <Edit3 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(deal)}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {DEAL_STAGES.filter(s => s !== deal.stage).map(stage => (
                <DropdownMenuItem key={stage} onClick={() => onChangeStage(deal.id, stage)}>
                  Move to {stage}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => onDelete(deal.id)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2 text-sm">
        <div className="flex items-center text-muted-foreground">
          <DollarSign className="h-4 w-4 mr-2 text-green-500" />
          <span>{formattedValue}</span>
          {deal.expectedCloseDate && (
            <Badge variant="outline" className="ml-auto text-xs">
              Closes: {new Date(deal.expectedCloseDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
        {contact && (
          <div className="flex items-center text-muted-foreground">
            <User className="h-4 w-4 mr-2" />
            <span>{contact.firstName} {contact.lastName}</span>
          </div>
        )}
        {company && (
          <div className="flex items-center text-muted-foreground">
            <Building className="h-4 w-4 mr-2" />
            <span>{company.name}</span>
          </div>
        )}
      </CardContent>
      {tags.length > 0 && (
        <CardFooter className="px-4 pb-4 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </CardFooter>
      )}
    </Card>
  );
}

