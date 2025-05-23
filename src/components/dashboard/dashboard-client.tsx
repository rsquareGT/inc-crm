
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { MoreHorizontal, PlusCircle, Edit, Trash2, Briefcase, DollarSign, ListChecks, UserPlus, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type { Task, Deal, Contact, DealStage } from '@/lib/types';
import { TaskFormModal } from '@/components/tasks/task-form-modal';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { TagBadge } from '@/components/shared/tag-badge';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from './stats-card';
import { format, subDays, isWithinInterval } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isFormDataLoading, setIsFormDataLoading] = useState(true); // For TaskFormModal deals/contacts

  const [error, setError] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async (endpoint: string, setData: React.Dispatch<React.SetStateAction<any[]>>, setLoading: React.Dispatch<React.SetStateAction<boolean>>, entityName: string) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to fetch ${entityName}` }));
        throw new Error(errorData.error || `Failed to fetch ${entityName}: ${response.statusText}`);
      }
      const data = await response.json();
      setData(data);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : `An unknown error occurred fetching ${entityName}.`;
      setError(prev => prev ? `${prev}\n${message}` : message); // Append errors
      toast({ title: `Error Fetching ${entityName}`, description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData('/api/tasks', setTasks, setIsLoadingTasks, 'tasks');
    fetchData('/api/deals', setDeals, setIsLoadingDeals, 'deals');
    fetchData('/api/contacts', setContacts, setIsLoadingContacts, 'contacts');
  }, [fetchData]);
  
  // For Task Form Modal
  useEffect(() => {
    const fetchFormDropdownData = async () => {
        setIsFormDataLoading(true);
        // Deals and Contacts are already being fetched for stats, no need to refetch if already loaded
        if (!isLoadingDeals && !isLoadingContacts) {
            setIsFormDataLoading(false);
        }
    };
    if (isLoadingDeals || isLoadingContacts) {
        // Wait until main data is loaded if this effect runs early
    } else {
        fetchFormDropdownData();
    }
  }, [isLoadingDeals, isLoadingContacts]);


  const handleOpenTaskModal = (task: Task | null = null) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveTaskCallback = () => {
    fetchData('/api/tasks', setTasks, setIsLoadingTasks, 'tasks'); // Refresh tasks list
    handleCloseTaskModal();
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Updating Task", description: message, variant: "destructive" });
      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? task : t)); // Revert on error
    }
  };

  const getRelatedItemName = (task: Task): React.ReactNode => {
    if (task.relatedDealId) {
      const deal = deals.find(d => d.id === task.relatedDealId);
      return deal ? <Link href={`/deals/${deal.id}`} className="hover:underline text-primary">{deal.name}</Link> : 'N/A';
    }
    if (task.relatedContactId) {
      const contact = contacts.find(c => c.id === task.relatedContactId);
      if (contact) {
        return <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary">{contact.firstName} {contact.lastName}</Link>;
      }
      return 'N/A';
    }
    return 'N/A';
  };

  const stats = useMemo(() => {
    const openDeals = deals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost');
    const openDealsValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
    const pendingTasksCount = tasks.filter(t => !t.completed).length;
    const sevenDaysAgo = subDays(new Date(), 7);
    const newContactsLast7Days = contacts.filter(c => new Date(c.createdAt) >= sevenDaysAgo).length;
    
    return {
      openDealsCount: openDeals.length,
      openDealsValue: openDealsValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      pendingTasksCount,
      newContactsLast7Days
    };
  }, [deals, tasks, contacts]);

  if (error && tasks.length === 0 && deals.length === 0 && contacts.length === 0) {
    return (
      <div>
        <PageSectionHeader title="Dashboard" description="Your sales and activity overview." />
        <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-20rem)]">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Dashboard Data</h2>
          <p className="text-muted-foreground whitespace-pre-line">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageSectionHeader title="Dashboard" description="Your sales and activity overview." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard 
          title="Open Deals" 
          value={stats.openDealsCount} 
          icon={<Briefcase className="h-5 w-5 text-muted-foreground" />}
          isLoading={isLoadingDeals}
        />
        <StatsCard 
          title="Value of Open Deals" 
          value={stats.openDealsValue} 
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
          isLoading={isLoadingDeals}
        />
        <StatsCard 
          title="Pending Tasks" 
          value={stats.pendingTasksCount} 
          icon={<ListChecks className="h-5 w-5 text-muted-foreground" />}
          isLoading={isLoadingTasks}
        />
        <StatsCard 
          title="New Contacts (Last 7 Days)" 
          value={stats.newContactsLast7Days} 
          icon={<UserPlus className="h-5 w-5 text-muted-foreground" />}
          isLoading={isLoadingContacts}
        />
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">My Tasks</h2>
          <Button onClick={() => handleOpenTaskModal()} disabled={isFormDataLoading || isLoadingDeals || isLoadingContacts}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
          </Button>
        </div>
        
        {isLoadingTasks ? (
          <div className="overflow-x-auto rounded-md border">
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
                {Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`skeleton-task-${index}`}>
                    <TableCell><Checkbox disabled className="opacity-50" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-12 rounded-full" /><Skeleton className="h-5 w-12 rounded-full" /></div></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : tasks.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
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
                          <DropdownMenuItem onClick={() => handleOpenTaskModal(task)} disabled={isFormDataLoading}>
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
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10">No tasks found. Get started by adding one!</p>
        )}
      </div>

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        onSaveCallback={handleSaveTaskCallback}
        task={editingTask}
        deals={deals}
        contacts={contacts}
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

    
