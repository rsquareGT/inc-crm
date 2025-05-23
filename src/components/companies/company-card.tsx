
'use client';

import type { Company, User } from '@/lib/types'; // Added User
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TagBadge } from '@/components/shared/tag-badge';
import { MoreHorizontal, Edit, Trash2, ExternalLink, Building, Globe, MapPin, FileText, Users as UsersIcon } from 'lucide-react'; // Renamed Users to UsersIcon to avoid conflict
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';

interface CompanyCardProps {
  company: Company;
  allUsers: User[]; // Added allUsers to find account manager name
  onEdit: (company: Company) => void;
  onDelete: (companyId: string) => void;
}

export function CompanyCard({ company, allUsers, onEdit, onDelete }: CompanyCardProps) {
  const tags = company.tags || [];
  const displayAddress = [company.city, company.state, company.country].filter(Boolean).join(', ');
  const accountManager = company.accountManagerId ? allUsers.find(u => u.id === company.accountManagerId) : undefined;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 bg-card flex flex-col h-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold leading-tight">
            <Link href={`/companies/${company.id}`} className="hover:underline text-primary">
              {company.name}
            </Link>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/companies/${company.id}`} className="flex items-center w-full">
                  <ExternalLink className="mr-2 h-4 w-4" /> View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(company)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(company.id)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2 text-sm flex-grow">
        {company.industry && (
          <div className="flex items-center text-muted-foreground">
            <Building className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate" title={company.industry}>{company.industry}</span>
          </div>
        )}
        {company.website && (
          <div className="flex items-center text-muted-foreground">
            <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
            <a
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate flex items-center"
              title={company.website}
            >
              {company.website} <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
            </a>
          </div>
        )}
        {displayAddress && (
          <div className="flex items-center text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate" title={displayAddress}>{displayAddress}</span>
          </div>
        )}
        {company.companySize && (
          <div className="flex items-center text-muted-foreground">
            <UsersIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate" title={company.companySize}>{company.companySize}</span>
          </div>
        )}
        {accountManager && (
          <div className="flex items-center text-muted-foreground">
             <UserCircle className="h-4 w-4 mr-2 flex-shrink-0" /> {/* Assuming UserCircle icon */}
             <span className="truncate" title={`${accountManager.firstName} ${accountManager.lastName}`}>
               AM: {accountManager.firstName} {accountManager.lastName}
             </span>
          </div>
        )}
        {company.description && (
          <div className="flex items-start text-muted-foreground pt-1">
            <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-xs line-clamp-2" title={company.description}>{company.description}</p>
          </div>
        )}
      </CardContent>
      {(tags || []).length > 0 && (
        <CardFooter className="px-4 pt-2 pb-4 flex flex-wrap gap-1 border-t mt-auto">
          {tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {tags.length > 3 && <Badge variant="outline">+{tags.length - 3}</Badge>}
        </CardFooter>
      )}
    </Card>
  );
}
