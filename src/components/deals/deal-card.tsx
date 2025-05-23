
'use client';

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
      className="mb-1.5 shadow-sm hover:shadow-md transition-shadow duration-150 bg-card cursor-grab active:cursor-grabbing"
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <CardHeader className="pb-1 pt-2 px-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center min-w-0">
            <GripVertical className="h-3.5 w-3.5 mr-1 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-sm font-semibold leading-tight truncate">
              <Link href={`/deals/${deal.id}`} className="hover:underline text-primary" onClick={(e) => e.stopPropagation()}>
                  {deal.name}
              </Link>
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0.5 h-auto w-auto ml-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Edit3 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem asChild>
                <Link href={`/deals/${deal.id}`} className="flex items-center w-full text-xs">
                   <ExternalLink className="mr-1.5 h-3 w-3" /> View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(deal)} className="text-xs">
                <Edit3 className="mr-1.5 h-3 w-3" /> Edit
              </DropdownMenuItem>
              {DEAL_STAGES.filter(s => s !== deal.stage).map(stage => (
                <DropdownMenuItem key={stage} onClick={() => onChangeStage(deal.id, stage)} className="text-xs">
                  Move to {stage}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => onDelete(deal.id)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground text-xs">
                <Trash2 className="mr-1.5 h-3 w-3" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-1.5 space-y-1 text-xs">
        <div className="flex items-center text-muted-foreground">
          <DollarSign className="h-3 w-3 mr-1 text-green-500 flex-shrink-0" />
          <span>{formattedValue}</span>
          {deal.expectedCloseDate && (
            <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0 leading-tight">
              Closes: {new Date(deal.expectedCloseDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
            </Badge>
          )}
        </div>
        {contact && (
          <div className="flex items-center text-muted-foreground truncate">
            <User className="h-3 w-3 mr-1 flex-shrink-0" />
             <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary truncate" onClick={(e) => e.stopPropagation()}>
                {contact.firstName} {contact.lastName}
            </Link>
          </div>
        )}
        {company && (
          <div className="flex items-center text-muted-foreground truncate">
            <Building className="h-3 w-3 mr-1 flex-shrink-0" />
            <Link href={`/companies/${company.id}`} className="hover:underline text-primary truncate" onClick={(e) => e.stopPropagation()}>
                {company.name}
            </Link>
          </div>
        )}
      </CardContent>
      {tags.length > 0 && (
        <CardFooter className="px-2 pt-1 pb-1.5 flex flex-wrap gap-0.5">
          {tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} className="text-xs px-1.5 py-0 leading-tight"/>
          ))}
          {tags.length > 3 && <Badge variant="outline" className="text-xs px-1 py-0 leading-tight">+{tags.length-3}</Badge>}
        </CardFooter>
      )}
    </Card>
  );
}
