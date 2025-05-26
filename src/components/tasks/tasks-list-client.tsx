
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react'; 
import type { Task, Deal, Contact } from '@/lib/types';
import { TaskFormModal } from './task-form-modal';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { TagBadge } from '@/components/shared/tag-badge';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card'; 
import { Skeleton } from '@/components/ui/skeleton';
import { FormattedNoteTimestamp } from '@/components/shared/formatted-note-timestamp'; // Added
import { useAuth } from '@/contexts/auth-context'; // Added

export function TasksListClient() {
  const { isAuthenticated, isLoading: authContextIsLoading } = useAuth(); // Added
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allDealsForForm, setAllDealsForForm] = useState<Deal[]>([]);
  const [allContactsForForm, setAllContactsForForm] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDataLoading, setIsFormDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false); // Don't attempt to load if not authenticated
      setTasks([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch tasks: ${response.statusText}`);
      }
      const data: Task[] = await response.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
      toast({ title: "Error Fetching Tasks", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, isAuthenticated]);

  const fetchFormData = useCallback(async () => {
     if (!isAuthenticated) {
      setIsFormDataLoading(false); // Don't attempt to load if not authenticated
      setAllDealsForForm([]);
      setAllContactsForForm([]);
      return;
    }
    setIsFormDataLoading(true);
    try {
      const [dealsRes, contactsRes] = await Promise.all([
        fetch('/api/deals'),
        fetch('/api/contacts'),
      ]);
      if (dealsRes.ok) setAllDealsForForm(await dealsRes.json());
      else throw new Error('Failed to fetch deals for form');
      if (contactsRes.ok) setAllContactsForForm(await contactsRes.json());
      else throw new Error('Failed to fetch contacts for form');
    } catch (err) {
      console.error("Error fetching data for task form:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Loading Form Data", description: message, variant: "destructive" });
    } finally {
      setIsFormDataLoading(false);
    }
  }, [toast, isAuthenticated]);

  useEffect(() => {
    if (!authContextIsLoading) { // Wait for auth context to resolve
      fetchTasks();
      fetchFormData();
    }
  }, [fetchTasks, fetchFormData, authContextIsLoading]);


  const handleOpenModal = (task: Task | null = null) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveTaskCallback = () => {
    fetchTasks(); 
  };
  
  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    const taskTitle = tasks.find(t => t.id === taskToDelete)?.title || "Task";
    try {
      const response = await fetch(`/api/tasks/${taskToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete task');
      }
      toast({ title: "Task Deleted", description: `Task "${taskTitle}" has been deleted.` });
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskToDelete));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Deleting Task", description: message, variant: "destructive" });
    } finally {
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, completed: !task.completed, updatedAt: new Date().toISOString() };
    
    setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? updatedTask : t));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task completion');
      }
      toast({ title: "Task Status Updated", description: `Task "${task.title}" marked as ${updatedTask.completed ? 'complete' : 'incomplete'}.` });
       fetchTasks(); // Re-fetch to ensure consistency, especially if activity logging affects sort or display
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Updating Task", description: message, variant: "destructive" });
      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? task : t));
    }
  };

  const getRelatedItemName = (task: Task): React.ReactNode => {
    if (task.relatedDealId) {
      const deal = allDealsForForm.find(d => d.id === task.relatedDealId);
      return deal ? <Link href={`/deals/${deal.id}`} className="hover:underline text-primary">{deal.name}</Link> : 'N/A';
    }
    if (task.relatedContactId) {
      const contact = allContactsForForm.find(c => c.id === task.relatedContactId);
      if (contact) {
        return <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary">{contact.firstName} {contact.lastName}</Link>;
      }
      return 'N/A';
    }
    return 'N/A';
  };

  if (isLoading || isFormDataLoading || authContextIsLoading) {
    return (
      <div>
        <PageSectionHeader title="Tasks" description="Manage your to-do list.">
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
          </Button>
        </PageSectionHeader>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Related To</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created At</TableHead> {/* Added */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-row-${index}`}>
                    <TableCell><Skeleton className="h-6 w-6 rounded-sm" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-12 rounded-full" /><Skeleton className="h-5 w-12 rounded-full" /></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell> {/* Added */}
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div>
        <PageSectionHeader title="Tasks" description="Manage your to-do list.">
          <Button onClick={() => handleOpenModal()} disabled={isFormDataLoading}>
             <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
          </Button>
        </PageSectionHeader>
         <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-20rem)]">
            <p className="text-lg text-destructive">Error loading tasks: {error}</p>
        </div>
      </div>
    );
  }


  return (
    <div>
      <PageSectionHeader title="Tasks" description="Manage your to-do list.">
        <Button onClick={() => handleOpenModal()} disabled={isFormDataLoading || authContextIsLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
        </Button>
      </PageSectionHeader>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Related To</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Created At</TableHead> {/* Added */}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id} className={task.completed ? 'opacity-60' : ''}>
                  <TableCell>
                    <Checkbox 
                      checked={task.completed} 
                      onCheckedChange={() => toggleTaskCompletion(task.id)}
                      aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                    />
                  </TableCell>
                  <TableCell className={`font-medium ${task.completed ? 'line-through' : ''}`}>{task.title}</TableCell>
                  <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{getRelatedItemName(task)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(task.tags || []).slice(0, 2).map(tag => <TagBadge key={tag} tag={tag} />)}
                      {(task.tags || []).length > 2 && <Badge variant="outline">+{task.tags.length - 2}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell> {/* Added */}
                    <FormattedNoteTimestamp createdAt={task.createdAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal(task)} disabled={isFormDataLoading}>
                           <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {tasks.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">No tasks found.</TableCell> {/* Updated colSpan */}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TaskFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveCallback={handleSaveTaskCallback}
        task={editingTask}
        deals={allDealsForForm}
        contacts={allContactsForForm}
      />

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteTask}
        itemName={tasks.find(t => t.id === taskToDelete)?.title || "this task"}
      />
    </div>
  );
}
