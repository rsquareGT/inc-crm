
'use client';

import type React from 'react';
import type { Task, Deal, Contact } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Briefcase, UserCircle } from 'lucide-react';
import { TagBadge } from '@/components/shared/tag-badge';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  allDeals: Deal[];
  allContacts: Contact[];
  onToggleCompletion: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskCard({ task, allDeals, allContacts, onToggleCompletion, onEdit, onDelete }: TaskCardProps) {
  const getRelatedItemName = (): React.ReactNode => {
    if (task.relatedDealId) {
      const deal = allDeals.find(d => d.id === task.relatedDealId);
      return deal ? (
        <Link href={`/deals/${deal.id}`} className="hover:underline text-primary text-xs flex items-center">
          <Briefcase className="h-3 w-3 mr-1 flex-shrink-0" /> {deal.name}
        </Link>
      ) : <span className="text-xs">Deal N/A</span>;
    }
    if (task.relatedContactId) {
      const contact = allContacts.find(c => c.id === task.relatedContactId);
      return contact ? (
        <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary text-xs flex items-center">
          <UserCircle className="h-3 w-3 mr-1 flex-shrink-0" /> {contact.firstName} {contact.lastName}
        </Link>
      ) : <span className="text-xs">Contact N/A</span>;
    }
    return <span className="text-xs text-muted-foreground">None</span>;
  };

  return (
    <Card className={cn("mb-3 shadow-md hover:shadow-lg transition-shadow", task.completed && "opacity-60 bg-secondary/30")}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-grow mr-2">
            <Checkbox
              id={`task-card-${task.id}`}
              checked={task.completed}
              onCheckedChange={() => onToggleCompletion(task.id)}
              aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
            />
            <label htmlFor={`task-card-${task.id}`} className="flex-1">
              <CardTitle className={cn("text-base font-semibold leading-tight", task.completed && "line-through")}>
                {task.title}
              </CardTitle>
            </label>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto ml-auto flex-shrink-0">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-2 space-y-1.5 text-sm">
        {task.dueDate && (
          <p className="text-xs text-muted-foreground">
            Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        <div className="text-xs text-muted-foreground">
          Related to: {getRelatedItemName()}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground pt-1 line-clamp-2" title={task.description}>
            {task.description}
          </p>
        )}
      </CardContent>
      {(task.tags && task.tags.length > 0) && (
        <CardFooter className="px-4 pt-1 pb-3 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map(tag => <TagBadge key={tag} tag={tag} className="text-xs px-1.5 py-0.5" />)}
          {task.tags.length > 3 && <Badge variant="outline" className="text-xs px-1.5 py-0.5">+{task.tags.length - 3}</Badge>}
        </CardFooter>
      )}
    </Card>
  );
}
