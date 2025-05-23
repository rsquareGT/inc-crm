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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit, Trash2, ExternalLink } from 'lucide-react';
import type { Company } from '@/lib/types';
import { mockCompanies } from '@/lib/mock-data';
import { CompanyFormModal } from './company-form-modal';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { TagBadge } from '@/components/shared/tag-badge';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function CompaniesListClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCompanies(mockCompanies);
  }, []);

  const handleOpenModal = (company: Company | null = null) => {
    setEditingCompany(company);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  const handleSaveCompany = (companyToSave: Company) => {
    setCompanies((prevCompanies) => {
      const existingIndex = prevCompanies.findIndex((c) => c.id === companyToSave.id);
      if (existingIndex > -1) {
        const updatedCompanies = [...prevCompanies];
        updatedCompanies[existingIndex] = companyToSave;
        toast({ title: "Company Updated", description: `Company "${companyToSave.name}" updated.` });
        return updatedCompanies;
      }
      toast({ title: "Company Created", description: `New company "${companyToSave.name}" added.` });
      return [...prevCompanies, companyToSave];
    });
  };

  const handleDeleteCompany = (companyId: string) => {
    setCompanyToDelete(companyId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteCompany = () => {
    if (companyToDelete) {
      const companyName = companies.find(c => c.id === companyToDelete)?.name || "Company";
      setCompanies(prevCompanies => prevCompanies.filter(c => c.id !== companyToDelete));
      toast({ title: "Company Deleted", description: `Company "${companyName}" has been deleted.`, variant: "destructive" });
    }
    setShowDeleteDialog(false);
    setCompanyToDelete(null);
  };

  return (
    <div>
      <PageSectionHeader title="Companies" description="Manage your company directory.">
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Company
        </Button>
      </PageSectionHeader>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.industry || 'N/A'}</TableCell>
                  <TableCell>
                    {company.website ? (
                      <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                        {company.website} <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {company.tags.slice(0, 2).map(tag => <TagBadge key={tag} tag={tag} />)}
                      {company.tags.length > 2 && <Badge variant="outline">+{company.tags.length - 2}</Badge>}
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
                        <DropdownMenuItem onClick={() => handleOpenModal(company)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteCompany(company.id)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {companies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No companies found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CompanyFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCompany}
        company={editingCompany}
      />

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteCompany}
        itemName={companies.find(c => c.id === companyToDelete)?.name || "this company"}
      />
    </div>
  );
}

// Dummy Card components if not imported from shadcn/ui directly or for structure
const Card = ({className, children}: {className?: string, children: React.ReactNode}) => <div className={`rounded-lg border bg-card text-card-foreground ${className}`}>{children}</div>;
const CardContent = ({className, children}: {className?: string, children: React.ReactNode}) => <div className={`${className}`}>{children}</div>;

