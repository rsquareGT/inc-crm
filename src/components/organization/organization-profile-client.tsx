
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Organization } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PageSectionHeader } from '@/components/shared/page-section-header';
import { OrganizationFormModal } from './organization-form-modal';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Edit, Building, Image as ImageIcon, MapPin, Globe, DollarSign } from 'lucide-react';

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
      setOrganization(null);
    } finally {
      setIsLoadingOrg(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthenticated && user?.organizationId && !authLoading) {
      fetchOrganization(user.organizationId);
    } else if (!authLoading && !isAuthenticated) {
      setIsLoadingOrg(false);
    }
  }, [user, isAuthenticated, authLoading, fetchOrganization]);

  const handleSaveCallback = (updatedOrganization: Organization) => {
    setOrganization(updatedOrganization);
  };

  const formatAddress = (org: Organization | null) => {
    if (!org) return 'N/A';
    const parts = [org.street, org.city, org.state, org.postalCode, org.country].filter(Boolean);
    return parts.join(', ') || 'N/A';
  };

  if (authLoading || isLoadingOrg) {
    return (
      <div>
        <PageSectionHeader title="Organization Profile" description="View and manage your organization details." >
           <Skeleton className="h-10 w-32" /> {/* Edit Profile Button Skeleton */}
        </PageSectionHeader>
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <Skeleton className="h-32 w-32 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" /> {/* Title */}
            <Skeleton className="h-5 w-1/2 mx-auto" /> {/* Description */}
          </CardHeader>
          <CardContent className="mt-4 space-y-4 p-6">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-5 w-5 rounded-full" /> <Skeleton className="h-5 w-40" />
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-5 w-5 rounded-full" /> <Skeleton className="h-5 w-60" />
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-5 w-5 rounded-full" /> <Skeleton className="h-5 w-20" />
            </div>
            <div className="pt-2 border-t">
                <Skeleton className="h-4 w-1/4 mt-3 mb-2" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3 mt-1" />
            </div>
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
                <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
                <CardContent><p>You must be logged in as an admin to view this page.</p></CardContent>
            </Card>
        </div>
     );
  }
  
  if (!organization) {
    return (
      <div>
        <PageSectionHeader title="Organization Profile" description="View and manage your organization details." />
        <Card>
          <CardHeader><CardTitle>Error Loading Organization</CardTitle></CardHeader>
          <CardContent><p>Could not load organization details. It might not exist or an error occurred.</p></CardContent>
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
              className="rounded-full mx-auto mb-4 border object-contain bg-muted"
              data-ai-hint="company logo"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 border">
              <Building className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <CardTitle className="text-3xl font-bold">{organization.name}</CardTitle>
          <CardDescription>Organization ID: {organization.id}</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 space-y-3 p-6">
          <div className="flex items-center">
            <Building className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
            <span className="text-lg">{organization.name}</span>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
            <span className="text-lg">Currency: {organization.currencySymbol || '$'}</span>
          </div>
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mt-2 mb-1 flex items-center">
                <MapPin className="h-4 w-4 mr-2"/> Address
            </h4>
            <p className="text-sm">{formatAddress(organization)}</p>
          </div>
          
        </CardContent>
         <CardFooter className="p-6 pt-2 text-xs text-muted-foreground">
            <p>Last updated: {new Date(organization.updatedAt).toLocaleString()}</p>
        </CardFooter>
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
