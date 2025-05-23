
'use client';

import React, { useState, useEffect } from 'react';
import type { Deal, Contact, Company, Note, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DealFormModal } from './deal-form-modal';
import { TaskFormModal } from '@/components/tasks/task-form-modal';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { mockDeals, mockContacts, mockCompanies, mockTasks, generateId } from '@/lib/mock-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, ArrowLeft, DollarSign, User, Building, Briefcase, FileText, MessageSquarePlus, MessageSquareText, CheckCircle, CalendarDays, ListChecks } from 'lucide-react';
import { TagBadge } from '@/components/shared/tag-badge';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { format } from 'date-fns'; // No longer directly used here for notes
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DEAL_STAGES } from '@/lib/constants';
import { FormattedNoteTimestamp } from '@/components/shared/formatted-note-timestamp';

interface DealDetailsClientProps {
  initialDeal: Deal;
  initialContact?: Contact;
  initialCompany?: Company;
  initialTasks: Task[]; // This prop might become less critical if we always filter from global
  allContacts: Contact[];
  allCompanies: Company[];
  allDeals: Deal[]; // For task form
}

export function DealDetailsClient({
  initialDeal,
  initialContact,
  initialCompany,
  // initialTasks, // We will primarily rely on filtering mockTasks directly
  allContacts,
  allCompanies,
  allDeals,
}: DealDetailsClientProps) {
  const [deal, setDeal] = useState<Deal>(initialDeal);
  const [contact, setContact] = useState<Contact | undefined>(initialContact);
  const [company, setCompany] = useState<Company | undefined>(initialCompany);
  const [tasks, setTasks] = useState<Task[]>([]); // Initialize as empty, will be populated by useEffect
  const [newNoteContent, setNewNoteContent] = useState('');

  const { toast } = useToast();

  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'task' | 'note'; name: string } | null>(null);

  useEffect(() => {
    setDeal(initialDeal);
    setContact(initialContact);
    setCompany(initialCompany);
    // Always filter tasks from global mockTasks based on the current deal
    if (initialDeal?.id) {
      const currentDealRelatedTasks = mockTasks.filter(t => t.relatedDealId === initialDeal.id);
      setTasks(currentDealRelatedTasks);
    } else {
      setTasks([]); // Handle case where initialDeal might not be fully loaded or valid
    }
  }, [initialDeal, initialContact, initialCompany]);


  const handleSaveDeal = (updatedDeal: Deal) => {
    setDeal(updatedDeal);
    const index = mockDeals.findIndex(d => d.id === updatedDeal.id);
    if (index !== -1) mockDeals[index] = updatedDeal;
    if (updatedDeal.contactId) {
        setContact(allContacts.find(c => c.id === updatedDeal.contactId));
    } else {
        setContact(undefined);
    }
    if (updatedDeal.companyId) {
        setCompany(allCompanies.find(c => c.id === updatedDeal.companyId));
    } else {
        setCompany(undefined);
    }
    toast({ title: "Deal Updated", description: `Deal "${updatedDeal.name}" details saved.` });
    setIsDealModalOpen(false);
  };

  const handleSaveTask = (taskFromForm: Task) => {
    if (editingTask) { // Editing an existing task
      const taskIndexInMock = mockTasks.findIndex(mt => mt.id === editingTask.id);
      if (taskIndexInMock !== -1) {
        mockTasks[taskIndexInMock] = { ...taskFromForm }; // Update in global mockTasks
      }
      toast({ title: "Task Updated", description: `Task "${taskFromForm.title}" updated.` });
    } else { // Adding a new task
      // Ensure relatedDealId is set to the current deal.id (taskFromForm will have it if pre-filled)
      const newTaskWithRelation = { ...taskFromForm, relatedDealId: deal.id };
      mockTasks.push(newTaskWithRelation); // Add to global mockTasks
      toast({ title: "Task Created", description: `New task "${newTaskWithRelation.title}" added for this deal.` });
    }
  
    // Refresh local tasks state for this deal directly from the (now updated) global mockTasks
    const updatedDealRelatedTasks = mockTasks.filter(t => t.relatedDealId === deal.id);
    setTasks(updatedDealRelatedTasks);
  
    setIsTaskModalOpen(false);
    setEditingTask(null); // Clear editingTask state
  };
  
  const toggleTaskCompletion = (taskId: string) => {
    const taskIndexInMock = mockTasks.findIndex(t => t.id === taskId);
    if (taskIndexInMock !== -1) {
      mockTasks[taskIndexInMock].completed = !mockTasks[taskIndexInMock].completed;
      mockTasks[taskIndexInMock].updatedAt = new Date().toISOString();
    }
    // Refresh local tasks state
    const updatedDealRelatedTasks = mockTasks.filter(t => t.relatedDealId === deal.id);
    setTasks(updatedDealRelatedTasks);
  };

  const handleDeleteRequest = (id: string, type: 'task' | 'note', name: string) => {
    setItemToDelete({ id, type, name });
    setShowDeleteDialog(true);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'task') {
      const mockIndex = mockTasks.findIndex(mt => mt.id === itemToDelete.id);
      if (mockIndex !== -1) {
        mockTasks.splice(mockIndex, 1); // Remove from global mockTasks
      }
      // Refresh local tasks state
      const updatedDealRelatedTasks = mockTasks.filter(t => t.relatedDealId === deal.id);
      setTasks(updatedDealRelatedTasks);
      toast({ title: "Task Deleted", description: `Task "${itemToDelete.name}" deleted.`, variant: "destructive" });
    } else if (itemToDelete.type === 'note') {
      setDeal(prevDeal => {
        const updatedNotes = prevDeal.notes.filter(note => note.id !== itemToDelete.id);
        const dealIndex = mockDeals.findIndex(d => d.id === prevDeal.id);
        if (dealIndex !== -1) {
          mockDeals[dealIndex].notes = updatedNotes;
        }
        return { ...prevDeal, notes: updatedNotes };
      });
      toast({ title: "Note Deleted", description: "Note has been deleted.", variant: "destructive" });
    }
    setShowDeleteDialog(false);
    setItemToDelete(null);
  };

  const handleAddNote = () => {
    if (newNoteContent.trim() === '') {
      toast({ title: "Cannot add empty note", variant: "destructive" });
      return;
    }
    const newNote: Note = {
      id: generateId(),
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString(),
    };
    setDeal(prevDeal => {
      const updatedNotes = [newNote, ...prevDeal.notes];
      const dealIndex = mockDeals.findIndex(d => d.id === prevDeal.id);
      if (dealIndex !== -1) {
        mockDeals[dealIndex].notes = updatedNotes;
      }
      return { ...prevDeal, notes: updatedNotes };
    });
    setNewNoteContent('');
    toast({ title: "Note Added", description: "New note saved for this deal." });
  };
  
  const sortedNotes = deal.notes ? [...deal.notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

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
                <p className="text-muted-foreground flex items-center">
                <Building className="mr-2 h-4 w-4" />
                <Link href={`/companies/${company.id}`} className="hover:underline text-primary">{company.name}</Link>
                </p>
            )}
            {contact && (
                <p className="text-muted-foreground flex items-center">
                <User className="mr-2 h-4 w-4" />
                <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary">{contact.firstName} {contact.lastName}</Link>
                </p>
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
                  />
                  <Button onClick={handleAddNote} size="sm">
                    <MessageSquarePlus className="mr-2 h-4 w-4" /> Add Note
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
        onSave={handleSaveDeal}
        deal={deal}
        contacts={allContacts}
        companies={allCompanies}
      />
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        task={editingTask}
        deals={allDeals}
        contacts={allContacts}
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

