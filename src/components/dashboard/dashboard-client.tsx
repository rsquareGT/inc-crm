
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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


export function DashboardClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isFormDataLoading, setIsFormDataLoading] = useState(true);

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
      setError(prev => prev ? `${prev}\n${message}` : message); 
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
  
  useEffect(() => {
    if (!isLoadingDeals && !isLoadingContacts) {
        setIsFormDataLoading(false);
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
    fetchData('/api/tasks', setTasks, setIsLoadingTasks, 'tasks');
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


  return (
    <div>
      <PageSectionHeader title="Dashboard" description="Your sales and activity overview." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6"> {/* Main content area */}
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
          {/* Future charts or other dashboard items can go here */}
        </div>

        <div className="lg:col-span-1 space-y-4"> {/* Sidebar-like area for tasks */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold tracking-tight">My Tasks</h2>
            <Button onClick={() => handleOpenTaskModal()} disabled={isFormDataLoading || isLoadingDeals || isLoadingContacts} size="sm">
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

