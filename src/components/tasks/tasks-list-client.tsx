
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
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from 'lucide-react'; 
import type { Task, Deal, Contact, Company } from '@/lib/types';
// mock data for deals, contacts, companies is for form population only now
import { TaskFormModal } from './task-form-modal';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { TagBadge } from '@/components/shared/tag-badge';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card'; 

export function TasksListClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allDealsForForm, setAllDealsForForm] = useState<Deal[]>([]);
  const [allContactsForForm, setAllContactsForForm] = useState<Contact[]>([]);
  // const [allCompaniesForForm, setAllCompaniesForForm] = useState<Company[]>([]); // Not directly needed for task form, but good for context
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
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
  }, [toast]);

  const fetchFormData = useCallback(async () => {
    try {
      const [dealsRes, contactsRes] = await Promise.all([
        fetch('/api/deals'),
        fetch('/api/contacts'),
        // fetch('/api/companies') // If needed for company context for contacts
      ]);
      if (dealsRes.ok) setAllDealsForForm(await dealsRes.json());
      if (contactsRes.ok) setAllContactsForForm(await contactsRes.json());
      // if (companiesRes.ok) setAllCompaniesForForm(await companiesRes.json());
    } catch (err) {
      console.error("Error fetching data for task form:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Loading Form Data", description: message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchTasks();
    fetchFormData();
  }, [fetchTasks, fetchFormData]);

  const handleOpenModal = (task: Task | null = null) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveTaskCallback = () => {
    fetchTasks(); // Re-fetch tasks to update the list
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
    
    // Optimistic update
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
      // fetchTasks(); // Re-fetch or rely on optimistic update. For now, rely on optimistic.
      toast({ title: "Task Status Updated", description: `Task "${task.title}" marked as ${updatedTask.completed ? 'complete' : 'incomplete'}.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Updating Task", description: message, variant: "destructive" });
      // Revert optimistic update on error
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
        // Future enhancement: Could also link company if contact has one and allCompaniesForForm is populated
        return <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary">{contact.firstName} {contact.lastName}</Link>;
      }
      return 'N/A';
    }
    return 'N/A';
  };

  if (isLoading && tasks.length === 0) {
    return (
      <div>
        <PageSectionHeader title="Tasks" description="Manage your to-do list."/>
        <p className="text-center py-10">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div>
      <PageSectionHeader title="Tasks" description="Manage your to-do list.">
        <Button onClick={() => handleOpenModal()}>
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
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal(task)}>
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
              {tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">No tasks found.</TableCell>
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
