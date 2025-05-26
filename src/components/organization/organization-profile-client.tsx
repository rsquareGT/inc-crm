
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
import { Edit, Building, Image as ImageIcon, MapPin, Globe, DollarSign, Clock } from 'lucide-react';
import { TIMEZONE_OPTIONS } from '@/lib/constants';
import { FormattedNoteTimestamp } from '@/components/shared/formatted-note-timestamp'; // Added

export function OrganizationProfileClient() {
  const { user, organization: authOrganization, isLoading: authLoading, isAuthenticated, fetchUser } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(authOrganization); 
  const [isLoadingOrg, setIsLoadingOrg] = useState(true); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchLocalOrganization = useCallback(async (orgId: string) => {
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
      console.error("Error fetching organization locally:", err);
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
      setOrganization(null); 
    } finally {
      setIsLoadingOrg(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authOrganization) {
      setOrganization(authOrganization);
      setIsLoadingOrg(false);
    } else if (isAuthenticated && user?.organizationId && !authLoading) {
      fetchLocalOrganization(user.organizationId);
    } else if (!authLoading && !isAuthenticated) {
      setIsLoadingOrg(false);
      setOrganization(null);
    }
  }, [user, isAuthenticated, authLoading, authOrganization, fetchLocalOrganization]);


  const handleSaveCallback = (updatedOrganization: Organization) => {
    setOrganization(updatedOrganization);
    fetchUser(); 
  };

  const formatAddress = (org: Organization | null) => {
    if (!org) return 'N/A';
    const parts = [org.street, org.city, org.state, org.postalCode, org.country].filter(Boolean);
    return parts.join(', ') || 'N/A';
  };

  const displayTimezone = (timezoneValue?: string) => {
    if (!timezoneValue) return 'N/A';
    const tzOption = TIMEZONE_OPTIONS.find(tz => tz.value === timezoneValue);
    return tzOption ? tzOption.label : timezoneValue;
  };


  if (authLoading || (isLoadingOrg && !authOrganization) ) {
    return (
      <div>
        <PageSectionHeader title="Organization Profile" description="View and manage your organization details." >
           <Skeleton className="h-10 w-32" /> 
        </PageSectionHeader>
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <Skeleton className="h-32 w-32 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" /> 
            <Skeleton className="h-5 w-1/2 mx-auto" /> 
          </CardHeader>
          <CardContent className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-6">
            <div className="space-y-1">
                <Skeleton className="h-4 w-1/3 mb-1" />
                <Skeleton className="h-5 w-2/3" />
            </div>
             <div className="space-y-1">
                <Skeleton className="h-4 w-1/3 mb-1" />
                <Skeleton className="h-5 w-2/3" />
            </div>
            <div className="space-y-1 md:col-span-2">
                <Skeleton className="h-4 w-1/4 mb-1" />
                <Skeleton className="h-5 w-full" />
            </div>
             <div className="space-y-1">
                <Skeleton className="h-4 w-1/3 mb-1" />
                <Skeleton className="h-5 w-1/2" />
            </div>
             <div className="space-y-1">
                <Skeleton className="h-4 w-1/3 mb-1" />
                <Skeleton className="h-5 w-1/2" />
            </div>
          </CardContent>
           <CardFooter className="p-6 pt-2 text-xs text-muted-foreground">
            <Skeleton className="h-4 w-1/3" />
        </CardFooter>
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
        <CardContent className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 p-6">
            <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center"><Building className="h-4 w-4 mr-2"/> Name</h4>
                <p className="text-sm">{organization.name}</p>
            </div>
             <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center"><DollarSign className="h-4 w-4 mr-2"/> Currency Symbol</h4>
                <p className="text-sm">{organization.currencySymbol || 'N/A'}</p>
            </div>

            <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center"><MapPin className="h-4 w-4 mr-2"/> Address</h4>
                <p className="text-sm">{formatAddress(organization)}</p>
            </div>
           
            <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center"><Clock className="h-4 w-4 mr-2"/> Timezone</h4>
                <p className="text-sm">{displayTimezone(organization.timezone)}</p>
            </div>
        </CardContent>
         <CardFooter className="p-6 pt-2 text-xs text-muted-foreground">
            <p>Last updated: <FormattedNoteTimestamp createdAt={organization.updatedAt} /></p> {/* Updated */}
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
