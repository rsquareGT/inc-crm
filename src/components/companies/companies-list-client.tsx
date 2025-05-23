
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { MoreHorizontal, PlusCircle, Edit, Trash2, ExternalLink, LayoutGrid, ListFilter, ArrowUpDown } from 'lucide-react';
import type { Company, Contact } from '@/lib/types';
import { mockContacts } from '@/lib/mock-data'; // Still need mockContacts for the form's Account Manager dropdown for now, and until Contacts are DB driven
import { CompanyFormModal } from './company-form-modal';
import { CompanyCard } from './company-card';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { TagBadge } from '@/components/shared/tag-badge';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type SortByType = 'name' | 'industry' | 'createdAt' | '';

export function CompaniesListClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allContactsForForm, setAllContactsForForm] = useState<Contact[]>(mockContacts); // For Account Manager dropdown
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortByType>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch companies: ${response.statusText}`);
      }
      const data: Company[] = await response.json();
      setCompanies(data);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
      toast({ title: "Error Fetching Companies", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCompanies();
    // In a real app, allContactsForForm would also be fetched from an API
    // For now, we use mockContacts for the company form's Account Manager dropdown.
  }, [fetchCompanies]);

  const handleOpenModal = (company: Company | null = null) => {
    setEditingCompany(company);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  const handleSaveCompanyCallback = () => {
    // After saving (create or update), re-fetch companies to update the list
    fetchCompanies();
  };
  
  const handleDeleteCompany = (companyId: string) => {
    setCompanyToDelete(companyId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    const companyName = companies.find(c => c.id === companyToDelete)?.name || "Company";
    try {
      const response = await fetch(`/api/companies/${companyToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete company: ${response.statusText}`);
      }
      toast({ title: "Company Deleted", description: `Company "${companyName}" has been deleted.`});
      setCompanies(prevCompanies => prevCompanies.filter(c => c.id !== companyToDelete));
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ title: "Error Deleting Company", description: message, variant: "destructive" });
    } finally {
      setShowDeleteDialog(false);
      setCompanyToDelete(null);
    }
  };

  const displayedCompanies = useMemo(() => {
    let items = [...companies];

    if (searchTerm) {
      items = items.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.industry && company.industry.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (sortBy) {
      items.sort((a, b) => {
        let comparison = 0;
        const factor = sortOrder === 'asc' ? 1 : -1;

        if (sortBy === 'createdAt') {
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === 'name') {
          comparison = (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
        } else if (sortBy === 'industry') {
          comparison = (a.industry || '').toLowerCase().localeCompare((b.industry || '').toLowerCase());
        }
        return comparison * factor;
      });
    }
    return items;
  }, [companies, searchTerm, sortBy, sortOrder]);

  const formatAddressForList = (company: Company) => {
    return [company.city, company.state, company.country].filter(Boolean).join(', ') || 'N/A';
  };

  if (isLoading) {
    return (
      <div>
        <PageSectionHeader title="Companies" description="Manage your company directory." />
        <p className="text-center py-10">Loading companies...</p>
      </div>
    );
  }

  if (error && companies.length === 0) { // Only show full error if no data could be loaded at all
    return (
      <div>
        <PageSectionHeader title="Companies" description="Manage your company directory." />
        <p className="text-center py-10 text-destructive">Error loading companies: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <PageSectionHeader title="Companies" description="Manage your company directory." />

      <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-6">
        <Input
          placeholder="Filter by name or industry..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-full md:max-w-xs lg:max-w-sm"
        />
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortByType)}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="industry">Industry</SelectItem>
              <SelectItem value="createdAt">Date Created</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} aria-label="Toggle sort order">
            <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          </Button>
          <div className="flex items-center border rounded-md">
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} aria-label="List view">
              <ListFilter className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => handleOpenModal()} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Company
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className={viewMode === 'list' ? "p-0" : "pt-6"}>
          {viewMode === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      <Link href={`/companies/${company.id}`} className="hover:underline text-primary">
                        {company.name}
                      </Link>
                    </TableCell>
                    <TableCell>{company.industry || 'N/A'}</TableCell>
                    <TableCell>{formatAddressForList(company)}</TableCell>
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
                          <DropdownMenuItem asChild>
                            <Link href={`/companies/${company.id}`} className="flex items-center">
                              <ExternalLink className="mr-2 h-4 w-4" /> View Details
                            </Link>
                          </DropdownMenuItem>
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
                {displayedCompanies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No companies found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedCompanies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onEdit={() => handleOpenModal(company)}
                  onDelete={() => handleDeleteCompany(company.id)}
                />
              ))}
              {displayedCompanies.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-10">
                  No companies found matching your criteria.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CompanyFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveCallback={handleSaveCompanyCallback} // Renamed from onSave
        company={editingCompany}
        allContacts={allContactsForForm} // Pass all contacts for Account Manager dropdown
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
