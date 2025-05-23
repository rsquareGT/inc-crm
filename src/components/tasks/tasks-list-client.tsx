'use client';

import React, { useState, useEffect } from 'react';
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
import { MoreHorizontal, PlusCircle, Edit, Trash2, Link2 } from 'lucide-react';
import type { Task, Deal, Contact } from '@/lib/types';
import { mockTasks, mockDeals, mockContacts } from '@/lib/mock-data';
import { TaskFormModal } from './task-form-modal';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { TagBadge } from '@/components/shared/tag-badge';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function TasksListClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setTasks(mockTasks);
    setDeals(mockDeals);
    setContacts(mockContacts);
  }, []);

  const handleOpenModal = (task: Task | null = null) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveTask = (taskToSave: Task) => {
    setTasks((prevTasks) => {
      const existingIndex = prevTasks.findIndex((t) => t.id === taskToSave.id);
      if (existingIndex > -1) {
        const updatedTasks = [...prevTasks];
        updatedTasks[existingIndex] = taskToSave;
        toast({ title: "Task Updated", description: `Task "${taskToSave.title}" updated.` });
        return updatedTasks;
      }
      toast({ title: "Task Created", description: `New task "${taskToSave.title}" added.` });
      return [...prevTasks, taskToSave];
    });
  };
  
  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      const taskTitle = tasks.find(t => t.id === taskToDelete)?.title || "Task";
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskToDelete));
      toast({ title: "Task Deleted", description: `Task "${taskTitle}" has been deleted.`, variant: "destructive" });
    }
    setShowDeleteDialog(false);
    setTaskToDelete(null);
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() } : task
      )
    );
  };

  const getRelatedItemName = (task: Task): React.ReactNode => {
    if (task.relatedDealId) {
      const deal = deals.find(d => d.id === task.relatedDealId);
      return deal ? <Link href="/deals" className="hover:underline text-primary">{deal.name}</Link> : 'N/A';
    }
    if (task.relatedContactId) {
      const contact = contacts.find(c => c.id === task.relatedContactId);
      return contact ? <Link href="/contacts" className="hover:underline text-primary">{contact.firstName} {contact.lastName}</Link> : 'N/A';
    }
    return 'N/A';
  };

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
                      {task.tags.slice(0, 2).map(tag => <TagBadge key={tag} tag={tag} />)}
                      {task.tags.length > 2 && <Badge variant="outline">+{task.tags.length - 2}</Badge>}
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
        onSave={handleSaveTask}
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

// Dummy Card components if not imported from shadcn/ui directly or for structure
const Card = ({className, children}: {className?: string, children: React.ReactNode}) => <div className={`rounded-lg border bg-card text-card-foreground ${className}`}>{children}</div>;
const CardContent = ({className, children}: {className?: string, children: React.ReactNode}) => <div className={`${className}`}>{children}</div>;

