
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Organization } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { OrganizationFormModal } from './organization-form-modal';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Edit, Building, Image as ImageIcon } from 'lucide-react';

export function OrganizationProfileClient() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchOrganization = useCallback(async (orgId: string) => {
    setIsLoadingOrg(true);
    try {
      const response = await fetch(`/api/organizations/${orgId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch organization details');
      }
      const data: Organization = await response.json();
      setOrganization(data);
    } catch (err) {
      console.error("Error fetching organization:", err);
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
      setOrganization(null); // Set to null on error to indicate failure
    } finally {
      setIsLoadingOrg(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthenticated && user?.organizationId && !authLoading) {
      fetchOrganization(user.organizationId);
    } else if (!authLoading && !isAuthenticated) {
      // Not authenticated, or no org ID, stop loading
      setIsLoadingOrg(false);
    }
  }, [user, isAuthenticated, authLoading, fetchOrganization]);

  const handleSaveCallback = (updatedOrganization: Organization) => {
    setOrganization(updatedOrganization); // Update local state with saved data
  };

  if (authLoading || isLoadingOrg) {
    return (
      <div>
        <PageSectionHeader title="Organization Profile" description="View and manage your organization details." />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-5 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-4">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
     return (
        <div>
            <PageSectionHeader title="Organization Profile" description="View and manage your organization details." />
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You must be logged in to view this page.</p>
                </CardContent>
            </Card>
        </div>
     );
  }
  
  if (!organization) {
    return (
      <div>
        <PageSectionHeader title="Organization Profile" description="View and manage your organization details." />
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Could not load organization details. It might not exist or you may not have permission.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div>
      <PageSectionHeader title="Organization Profile" description="View and manage your organization details.">
        {isAdmin && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        )}
      </PageSectionHeader>
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          {organization.logoUrl ? (
            <Image
              src={organization.logoUrl}
              alt={`${organization.name} logo`}
              width={128}
              height={128}
              className="rounded-full mx-auto mb-4 border object-contain"
              data-ai-hint="company logo"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 border">
              <ImageIcon className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <CardTitle className="text-3xl font-bold">{organization.name}</CardTitle>
          <CardDescription>Organization ID: {organization.id}</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 space-y-3">
          <div className="flex items-center">
            <Building className="h-5 w-5 mr-3 text-muted-foreground" />
            <span className="text-lg">{organization.name}</span>
          </div>
           {/* Add more organization details here as they become available */}
        </CardContent>
      </Card>

      {isAdmin && organization && (
        <OrganizationFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          organization={organization}
          onSaveCallback={handleSaveCallback}
        />
      )}
    </div>
  );
}
