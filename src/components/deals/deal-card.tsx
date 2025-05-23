
import type { Deal, Contact, Company } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TagBadge } from '@/components/shared/tag-badge';
import { DollarSign, User, Building, Edit3, Trash2, ExternalLink, GripVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEAL_STAGES } from '@/lib/constants';
import type { DealStage } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import React from 'react';


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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("dealId", deal.id);
    e.dataTransfer.setData("sourceStage", deal.stage);
    e.currentTarget.classList.add('opacity-50', 'shadow-xl');
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'shadow-xl');
  };

  return (
    <Card 
      className="mb-4 shadow-md hover:shadow-lg transition-shadow duration-200 bg-card cursor-grab active:cursor-grabbing"
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <GripVertical className="h-5 w-5 mr-1 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-lg font-semibold leading-tight">
              <Link href={`/deals/${deal.id}`} className="hover:underline text-primary" onClick={(e) => e.stopPropagation()}>
                  {deal.name}
              </Link>
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={(e) => e.stopPropagation()}>
                <Edit3 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem asChild>
                <Link href={`/deals/${deal.id}`} className="flex items-center w-full">
                   <ExternalLink className="mr-2 h-4 w-4" /> View Details
                </Link>
              </DropdownMenuItem>
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
             <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary" onClick={(e) => e.stopPropagation()}>
                {contact.firstName} {contact.lastName}
            </Link>
          </div>
        )}
        {company && (
          <div className="flex items-center text-muted-foreground">
            <Building className="h-4 w-4 mr-2" />
            <Link href={`/companies/${company.id}`} className="hover:underline text-primary" onClick={(e) => e.stopPropagation()}>
                {company.name}
            </Link>
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
