
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Briefcase, DollarSign, ListChecks, UserPlus, AlertTriangle, CheckCircle2, Loader2, UserCircle as UserIcon } from 'lucide-react';
import type { Task, Deal, Contact, DealStage } from '@/lib/types';
import { TaskFormModal } from '@/components/tasks/task-form-modal';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { StatsCard } from './stats-card';
import { format, subDays, isWithinInterval } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskCard } from './task-card'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardFooter } from '../ui/card';
import { useAuth } from '@/contexts/auth-context';

export function DashboardClient() {
  const { isAuthenticated, isLoading: authContextIsLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isTaskFormDataLoading, setIsTaskFormDataLoading] = useState(true); // For TaskFormModal deals/contacts

  const [error, setError] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  // Define TaskCardSkeleton before its use
  const TaskCardSkeleton = () => (
    <Card className="mb-3 shadow-md">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-grow mr-2">
            <Skeleton className="h-5 w-5 rounded-sm" /> {/* Checkbox */}
            <Skeleton className="h-5 w-3/4" /> {/* Title */}
          </div>
          <Skeleton className="h-6 w-6" /> {/* Dropdown Trigger */}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-2 space-y-1.5 text-sm">
        <Skeleton className="h-4 w-1/2" /> {/* Due Date */}
        <Skeleton className="h-4 w-2/3" /> {/* Related To */}
        <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
      </CardContent>
      <CardFooter className="px-4 pt-1 pb-3 flex flex-wrap gap-1">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardFooter>
    </Card>
  );

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
      setError(prev => prev ? `${prev}\n${message}` : message); 
      toast({ title: `Error Fetching ${entityName}`, description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchTaskFormRelatedData = useCallback(async () => {
    setIsTaskFormDataLoading(true);
     try {
      const [dealsRes, contactsRes] = await Promise.all([
        fetch('/api/deals'),
        fetch('/api/contacts'),
      ]);
      if (dealsRes.ok) setDeals(await dealsRes.json()); 
      else throw new Error('Failed to fetch deals for task form');
      if (contactsRes.ok) setContacts(await contactsRes.json()); 
      else throw new Error('Failed to fetch contacts for task form');
    } catch (err) {
      console.error("Error fetching data for task form:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Loading Task Form Data", description: message, variant: "destructive" });
    } finally {
      setIsTaskFormDataLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthenticated && !authContextIsLoading) {
      fetchData('/api/tasks', setTasks, setIsLoadingTasks, 'tasks');
      fetchData('/api/deals', setDeals, setIsLoadingDeals, 'deals'); 
      fetchData('/api/contacts', setContacts, setIsLoadingContacts, 'contacts');
    } else if (!authContextIsLoading && !isAuthenticated) {
      setTasks([]);
      setDeals([]);
      setContacts([]);
      setIsLoadingTasks(false);
      setIsLoadingDeals(false);
      setIsLoadingContacts(false);
      setIsTaskFormDataLoading(false);
    }
  }, [fetchData, isAuthenticated, authContextIsLoading]); 
  
  useEffect(() => {
    if (isTaskModalOpen && isAuthenticated && !authContextIsLoading) {
      if (deals.length === 0 || contacts.length === 0 || isTaskFormDataLoading) {
         fetchTaskFormRelatedData();
      }
    }
  }, [isTaskModalOpen, isAuthenticated, authContextIsLoading, deals, contacts, isTaskFormDataLoading, fetchTaskFormRelatedData]);


  const handleOpenTaskModal = (task: Task | null = null) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveTaskCallback = () => {
    if (isAuthenticated) fetchData('/api/tasks', setTasks, setIsLoadingTasks, 'tasks');
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
      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? task : t)); 
    }
  };

  const stats = useMemo(() => {
    const openDeals = deals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost');
    const openDealsValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
    const pendingTasksCount = tasks.filter(t => !t.completed).length;
    const sevenDaysAgo = subDays(new Date(), 7);
    const newContactsLast7Days = contacts.filter(c => c.createdAt && new Date(c.createdAt) >= sevenDaysAgo).length;
    
    return {
      openDealsCount: openDeals.length,
      openDealsValue: openDealsValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      pendingTasksCount,
      newContactsLast7Days
    };
  }, [deals, tasks, contacts]);

  if (authContextIsLoading || (isAuthenticated && (isLoadingTasks || isLoadingDeals || isLoadingContacts))) {
     return (
      <div>
        <PageSectionHeader title="Dashboard" description="Your sales and activity overview." />
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <StatsCard title="Open Deals" value="0" icon={<Briefcase className="h-5 w-5 text-muted-foreground" />} isLoading={true} />
              <StatsCard title="Value of Open Deals" value="$0" icon={<DollarSign className="h-5 w-5 text-muted-foreground" />} isLoading={true} />
              <StatsCard title="Pending Tasks" value="0" icon={<ListChecks className="h-5 w-5 text-muted-foreground" />} isLoading={true} />
              <StatsCard title="New Contacts (Last 7 Days)" value="0" icon={<UserPlus className="h-5 w-5 text-muted-foreground" />} isLoading={true} />
            </div>
          </div>
          <div className="lg:col-span-1 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold tracking-tight">My Tasks</h2>
              <Button disabled size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-16rem)] rounded-md border p-1 pr-3 bg-secondary/30">
              <div className="p-3">
                {Array.from({ length: 3 }).map((_, index) => <TaskCardSkeleton key={`skeleton-task-${index}`} />)}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    );
  }


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

  if (!isAuthenticated && !authContextIsLoading) {
    return (
      <div>
        <PageSectionHeader title="Dashboard" description="Your sales and activity overview." />
        <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-20rem)]">
           <p>Please log in to view the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageSectionHeader title="Dashboard" description="Your sales and activity overview." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
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
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold tracking-tight">My Tasks</h2>
            <Button onClick={() => handleOpenTaskModal()} disabled={isTaskFormDataLoading || isLoadingDeals || isLoadingContacts} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Task
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-16rem)] rounded-md border p-1 pr-3 bg-secondary/30">
            <div className="p-3">
            {isLoadingTasks ? (
              Array.from({ length: 3 }).map((_, index) => <TaskCardSkeleton key={`skeleton-task-${index}`} />)
            ) : tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  allDeals={deals}
                  allContacts={contacts}
                  onToggleCompletion={toggleTaskCompletion}
                  onEdit={handleOpenTaskModal}
                  onDelete={handleDeleteTask}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-10">No tasks found. Get started by adding one!</p>
            )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        onSaveCallback={handleSaveTaskCallback}
        task={editingTask}
        deals={deals}
        contacts={contacts}
        defaultDealId={editingTask?.relatedDealId}
        defaultContactId={editingTask?.relatedContactId}
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
