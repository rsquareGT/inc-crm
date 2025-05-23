
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Deal, Contact, Company, Note, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DealFormModal } from './deal-form-modal';
import { TaskFormModal } from '@/components/tasks/task-form-modal';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, ArrowLeft, DollarSign, User, Building, Briefcase, FileText, MessageSquarePlus, MessageSquareText, CheckCircle, CalendarDays, ListChecks, ExternalLink, Loader2 } from 'lucide-react';
import { TagBadge } from '@/components/shared/tag-badge';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FormattedNoteTimestamp } from '@/components/shared/formatted-note-timestamp';
import { PageSectionHeader } from '../shared/page-section-header';
import { Skeleton } from '@/components/ui/skeleton';


interface DealDetailsClientProps {
  dealId: string;
}

export function DealDetailsClient({ dealId }: DealDetailsClientProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [contact, setContact] = useState<Contact | undefined>(undefined);
  const [company, setCompany] = useState<Company | undefined>(undefined);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allContactsList, setAllContactsList] = useState<Contact[]>([]);
  const [allCompaniesList, setAllCompaniesList] = useState<Company[]>([]);
  const [allDealsList, setAllDealsList] = useState<Deal[]>([]);

  const { toast } = useToast();

  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'task' | 'note'; name: string } | null>(null);

  const fetchDealDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/deals/${dealId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch deal details');
      }
      const dealData: Deal = await response.json();
      setDeal(dealData);

      if (dealData.contactId) {
        const contactRes = await fetch(`/api/contacts/${dealData.contactId}`);
        if (contactRes.ok) setContact(await contactRes.json());
      } else setContact(undefined);

      if (dealData.companyId) {
        const companyRes = await fetch(`/api/companies/${dealData.companyId}`);
        if (companyRes.ok) setCompany(await companyRes.json());
      } else setCompany(undefined);

      const tasksRes = await fetch(`/api/tasks?dealId=${dealId}`);
      if (tasksRes.ok) setTasks(await tasksRes.json()); else setTasks([]);

    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      toast({ title: "Error Fetching Deal Data", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [dealId, toast]);

  const fetchFormDropdownData = useCallback(async () => {
    try {
        const [contactsRes, companiesRes, dealsRes] = await Promise.all([
            fetch('/api/contacts'),
            fetch('/api/companies'),
            fetch('/api/deals')
        ]);
        if (contactsRes.ok) setAllContactsList(await contactsRes.json());
        if (companiesRes.ok) setAllCompaniesList(await companiesRes.json());
        if (dealsRes.ok) setAllDealsList(await dealsRes.json());
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        toast({ title: "Error Loading Form Data", description: message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchDealDetails();
    fetchFormDropdownData();
  }, [fetchDealDetails, fetchFormDropdownData]);


  const handleSaveDealCallback = () => {
    fetchDealDetails();
    setIsDealModalOpen(false);
  };

  const handleSaveTaskCallback = () => {
    fetchDealDetails();
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTaskPayload = { ...task, completed: !task.completed };

    setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTaskPayload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task completion');
      }
      toast({ title: "Task Status Updated", description: `Task "${task.title}" marked as ${updatedTaskPayload.completed ? 'complete' : 'incomplete'}.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Updating Task", description: message, variant: "destructive" });
      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? task : t));
    }
  };

  const handleDeleteRequest = (id: string, type: 'task' | 'note', name: string) => {
    setItemToDelete({ id, type, name });
    setShowDeleteDialog(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete || !deal) return;
    let endpoint = '';
    let successMessage = '';

    if (itemToDelete.type === 'note') {
      endpoint = `/api/deals/${deal.id}/notes/${itemToDelete.id}`;
      successMessage = "Note has been deleted.";
    } else if (itemToDelete.type === 'task') {
      endpoint = `/api/tasks/${itemToDelete.id}`;
      successMessage = `Task "${itemToDelete.name}" deleted.`;
    }

    if (!endpoint) return;

    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete ${itemToDelete.type}`);
      }
      toast({ title: `${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} Deleted`, description: successMessage });
      fetchDealDetails();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: `Error Deleting ${itemToDelete.type}`, description: message, variant: "destructive" });
    } finally {
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const handleAddNote = async () => {
    if (!deal || newNoteContent.trim() === '') {
      toast({ title: "Cannot add empty note or no deal context", variant: "destructive" });
      return;
    }
    setIsAddingNote(true);
    try {
      const response = await fetch(`/api/deals/${deal.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add note');
      }
      const newNote: Note = await response.json();
      setDeal(prevDeal => {
          if(!prevDeal) return null;
          return {...prevDeal, notes: [newNote, ...(prevDeal.notes || [])]}
      });
      setNewNoteContent('');
      toast({ title: "Note Added", description: "New note saved for this deal." });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Adding Note", description: message, variant: "destructive" });
    } finally {
      setIsAddingNote(false);
    }
  };

  const sortedNotes = deal?.notes ? [...deal.notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  if (isLoading) {
    return (
        <div className="space-y-6">
           <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <div>
              <Skeleton className="h-9 w-[150px] mb-2" /> {/* Back Button */}
              <Skeleton className="h-9 w-3/4 mb-1" /> {/* Deal Name */}
              <div className="ml-11 mt-1 space-y-0.5">
                <Skeleton className="h-5 w-1/2 mb-1" /> {/* Value & Stage */}
                <Skeleton className="h-5 w-1/3 mb-1" /> {/* Company */}
                <Skeleton className="h-5 w-1/3" /> {/* Contact */}
              </div>
            </div>
            <Skeleton className="h-10 w-[120px]" /> {/* Edit Button */}
          </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3 mb-1" /></CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-16 w-full rounded-md" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3 mb-1" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-1/4 mb-1" />
                        <Skeleton className="h-20 w-full rounded-md" />
                        <Skeleton className="h-9 w-[120px]" />
                        <ScrollArea className="h-[300px] w-full">
                            <div className="space-y-3">
                                {[...Array(2)].map((_, i) => (
                                    <div key={i} className="p-3 bg-secondary/50 rounded-md">
                                        <Skeleton className="h-4 w-full mb-1" />
                                        <Skeleton className="h-4 w-3/4 mb-2" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-9 w-[100px]" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-3 border rounded-md">
                                <div className="flex justify-between items-start mb-1">
                                <Skeleton className="h-5 w-3/5" />
                                <Skeleton className="h-5 w-5" />
                                </div>
                                <Skeleton className="h-4 w-2/5" />
                            </div>
                            ))}
                        </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
           </div>
        </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/deals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deals
          </Link>
        </Button>
        <PageSectionHeader title="Deal Not Found" description={error || "The deal you are looking for does not exist or could not be loaded."} />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div>
          <Button variant="outline" asChild className="mb-2">
            <Link href="/deals">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Deals
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Briefcase className="mr-3 h-8 w-8 text-muted-foreground" />
            {deal.name}
          </h1>
          <div className="ml-11 mt-1 space-y-0.5">
            <div className="text-muted-foreground flex items-center">
                <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                {deal.value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <Badge variant={deal.stage === 'Won' ? 'default' : deal.stage === 'Lost' ? 'destructive' : 'secondary' } className="ml-2">{deal.stage}</Badge>
            </div>
            {company && (
                <div className="text-muted-foreground flex items-center">
                <Building className="mr-2 h-4 w-4" />
                <Link href={`/companies/${company.id}`} className="hover:underline text-primary">{company.name}</Link>
                </div>
            )}
            {contact && (
                <div className="text-muted-foreground flex items-center">
                <User className="mr-2 h-4 w-4" />
                <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary">{contact.firstName} {contact.lastName}</Link>
                </div>
            )}
          </div>
        </div>
        <Button onClick={() => setIsDealModalOpen(true)}>
          <Edit className="mr-2 h-4 w-4" /> Edit Deal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deal.expectedCloseDate && (
                  <div className="flex items-center">
                    <CalendarDays className="mr-3 h-5 w-5 text-muted-foreground" />
                    <span>Expected Close: {new Date(deal.expectedCloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
                {deal.tags && deal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <span className="text-sm text-muted-foreground">Tags:</span>
                    {deal.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
                  </div>
                )}
                <div className="space-y-2 pt-2">
                  <h4 className="font-semibold flex items-center"><FileText className="mr-2 h-5 w-5 text-muted-foreground"/>Description</h4>
                  {deal.description ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md">{deal.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No description for this deal.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><MessageSquareText className="mr-2 h-5 w-5 text-muted-foreground"/>Notes</CardTitle>
                <CardDescription>Chronological notes related to this deal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-deal-note">Add a new note</Label>
                  <Textarea
                    id="new-deal-note"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Type your note here..."
                    className="min-h-[80px]"
                    disabled={isAddingNote}
                  />
                  <Button onClick={handleAddNote} size="sm" disabled={isAddingNote || newNoteContent.trim() === ''}>
                     {isAddingNote ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <MessageSquarePlus className="mr-2 h-4 w-4" /> Add Note
                      </>
                    )}
                  </Button>
                </div>

                {sortedNotes.length > 0 ? (
                  <ScrollArea className="h-[300px] w-full pr-4">
                    <div className="space-y-3">
                      {sortedNotes.map(note => (
                        <div key={note.id} className="p-3 bg-secondary/50 rounded-md text-sm relative group">
                          <p className="whitespace-pre-wrap">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <FormattedNoteTimestamp createdAt={note.createdAt} />
                          </p>
                           <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteRequest(note.id, 'note', 'this note')}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                           </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet for this deal.</p>
                )}
              </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5 text-muted-foreground"/>Associated Tasks ({tasks.length})</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                    </Button>
                </div>
                </CardHeader>
                <CardContent>
                {tasks.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                    {tasks.map((task) => (
                        <div key={task.id} className={`p-3 border rounded-md hover:shadow-md transition-shadow ${task.completed ? 'opacity-60' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center">
                                    <Checkbox
                                        checked={task.completed}
                                        onCheckedChange={() => toggleTaskCompletion(task.id)}
                                        aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                                        className="mr-2"
                                        id={`task-completed-${task.id}`}
                                    />
                                    <label htmlFor={`task-completed-${task.id}`} className={`font-medium ${task.completed ? 'line-through' : ''}`}>{task.title}</label>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-7 w-7 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteRequest(task.id, 'task', task.title)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            {task.dueDate && <p className="text-xs text-muted-foreground ml-6">Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                            {task.description && <p className="text-xs text-muted-foreground ml-6 mt-1 line-clamp-2">{task.description}</p>}
                        </div>
                    ))}
                    </div>
                    </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No tasks associated with this deal yet.</p>
                )}
                </CardContent>
            </Card>
        </div>
      </div>


      <DealFormModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onSaveCallback={handleSaveDealCallback}
        deal={deal}
        contacts={allContactsList}
        companies={allCompaniesList}
      />
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
        onSaveCallback={handleSaveTaskCallback}
        task={editingTask}
        deals={allDealsList}
        contacts={allContactsList}
        defaultDealId={deal.id}
        defaultContactId={contact?.id}
      />
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteItem}
        itemName={itemToDelete?.name || "this item"}
        description={itemToDelete?.type === 'note' ? 'This action cannot be undone. This will permanently delete this note.' : undefined}
      />
    </div>
  );
}
