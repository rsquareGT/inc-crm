"use client";

import type { Contact, Company } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/shared/tag-badge";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  UserCircle,
  Mail,
  Phone,
  Building,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface ContactCardProps {
  contact: Contact;
  company?: Company; // Optional company object if available
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
}

export function ContactCard({ contact, company, onEdit, onDelete }: ContactCardProps) {
  const tags = contact.tags || [];
  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 bg-card flex flex-col h-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center min-w-0">
            <UserCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
            <CardTitle className="text-lg font-semibold leading-tight truncate" title={fullName}>
              <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary">
                {fullName}
              </Link>
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/contacts/${contact.id}`} className="flex items-center w-full">
                  <ExternalLink className="mr-2 h-4 w-4" /> View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(contact)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(contact.id)}
                className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2 text-sm flex-grow">
        {contact.email && (
          <div className="flex items-center text-muted-foreground">
            <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
            <a
              href={`mailto:${contact.email}`}
              className="text-primary hover:underline truncate"
              title={contact.email}
            >
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center text-muted-foreground">
            <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate" title={contact.phone}>
              {contact.phone}
            </span>
          </div>
        )}
        {company && (
          <div className="flex items-center text-muted-foreground">
            <Building className="h-4 w-4 mr-2 flex-shrink-0" />
            <Link
              href={`/companies/${company.id}`}
              className="text-primary hover:underline truncate"
              title={company.name}
            >
              {company.name}
            </Link>
          </div>
        )}
        {contact.description && (
          <div className="flex items-start text-muted-foreground pt-1">
            <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-xs line-clamp-2" title={contact.description}>
              {contact.description}
            </p>
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
