
'use client';

import type { Activity } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { FormattedNoteTimestamp } from './formatted-note-timestamp';
import { 
  UserRound, Briefcase, DollarSign, ListChecks, StickyNote, Edit3, Trash2, PlusCircle, CheckCircle2, Building as OrgIcon 
} from 'lucide-react';

const getActivityIcon = (entityType: Activity['entityType'], activityType: Activity['activityType']) => {
  if (activityType.startsWith('created_') || activityType.startsWith('added_note_to_')) {
    return <PlusCircle className="h-3.5 w-3.5 text-green-500" />;
  }
  if (activityType.startsWith('updated_') || activityType === 'completed_task' || activityType === 'activated_user' || activityType === 'deactivated_user') {
    if (activityType === 'completed_task' || activityType === 'activated_user') return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    if (activityType === 'deactivated_user') return <UserXIcon className="h-3.5 w-3.5 text-orange-500" />; 
    return <Edit3 className="h-3.5 w-3.5 text-blue-500" />;
  }
  if (activityType.startsWith('deleted_') || activityType.startsWith('deleted_note_from_')) {
    return <Trash2 className="h-3.5 w-3.5 text-red-500" />;
  }
  
  switch (entityType) {
    case 'contact': return <UserRound className="h-4 w-4 text-indigo-500" />;
    case 'company': return <Briefcase className="h-4 w-4 text-sky-500" />;
    case 'deal': return <DollarSign className="h-4 w-4 text-amber-500" />;
    case 'task': return <ListChecks className="h-4 w-4 text-lime-500" />;
    case 'note': return <StickyNote className="h-4 w-4 text-slate-500" />;
    case 'organization': return <OrgIcon className="h-4 w-4 text-purple-500" />;
    case 'user': return <UserRound className="h-4 w-4 text-teal-500" />;
    default: return <Edit3 className="h-4 w-4 text-gray-500" />;
  }
};

const UserXIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="7" x2="17" y2="13"/><line x1="17" y1="7" x2="23" y2="13"/></svg>
);


const getActivityDescription = (activity: Activity): React.ReactNode => {
  const userName = `${activity.user?.firstName || 'User'} ${activity.user?.lastName || ''}`.trim();
  
  let entityDisplayName: string;
  let entityLinkPath = '';

  // Determine display name and link path based on entity type
  if (activity.entityType === 'organization') {
    entityLinkPath = `/organization/profile`; // No ID needed for the organization's own profile page
    entityDisplayName = activity.entityName ? `organization "${activity.entityName}"` : `the organization profile`;
  } else if (activity.entityType === 'user') {
    // No user detail page yet, so just display name.
    entityDisplayName = activity.entityName ? `user "${activity.entityName}"` : `a user account`;
    // entityLinkPath remains empty
  } else if (activity.entityType === 'task') {
    // Tasks don't have dedicated detail pages; they redirect to dashboard.
    // Display task name without a link.
    entityDisplayName = activity.entityName ? `task "${activity.entityName}"` : `a task`;
    // entityLinkPath remains empty
  } else { // For 'company', 'contact', 'deal'
    entityLinkPath = `/${activity.entityType}s/${activity.entityId}`;
    entityDisplayName = activity.entityName ? `${activity.entityType} "${activity.entityName}"` : `a ${activity.entityType}`;
  }


  const entityLink = entityLinkPath ? (
    <Link href={entityLinkPath} className="font-medium text-primary hover:underline">
      {entityDisplayName}
    </Link>
  ) : (
    <span className="font-medium">{entityDisplayName}</span>
  );

  const mainActionText = () => {
    switch (activity.activityType) {
      case 'created_contact': return <><span className="font-medium">{userName}</span> created {entityLink}.</>;
      case 'updated_contact': return <><span className="font-medium">{userName}</span> updated {entityLink}.</>;
      case 'deleted_contact': return <><span className="font-medium">{userName}</span> deleted contact "{activity.entityName || 'N/A'}".</>;
      
      case 'created_company': return <><span className="font-medium">{userName}</span> created {entityLink}.</>;
      case 'updated_company': return <><span className="font-medium">{userName}</span> updated {entityLink}.</>;
      case 'deleted_company': return <><span className="font-medium">{userName}</span> deleted company "{activity.entityName || 'N/A'}".</>;

      case 'created_deal': return <><span className="font-medium">{userName}</span> created {entityLink}.</>;
      case 'updated_deal_details': return <><span className="font-medium">{userName}</span> updated details for {entityLink}.</>;
      case 'updated_deal_stage':
        return (
          <>
            <span className="font-medium">{userName}</span> moved {entityLink}
            {activity.details?.old_stage && <> from <span className="font-semibold">{activity.details.old_stage}</span></>}
            {activity.details?.new_stage && <> to <span className="font-semibold">{activity.details.new_stage}</span></>}.
          </>
        );
      case 'deleted_deal': return <><span className="font-medium">{userName}</span> deleted deal "{activity.entityName || 'N/A'}".</>;

      case 'created_task': return <><span className="font-medium">{userName}</span> created {entityLink}.</>;
      case 'updated_task': return <><span className="font-medium">{userName}</span> updated {entityLink}.</>;
      case 'completed_task': return <><span className="font-medium">{userName}</span> completed {entityLink}.</>;
      case 'deleted_task': return <><span className="font-medium">{userName}</span> deleted task "{activity.entityName || 'N/A'}".</>;
      
      case 'updated_organization': return <><span className="font-medium">{userName}</span> updated {entityLink}.</>;
      
      case 'created_user': return <><span className="font-medium">{userName}</span> created {entityLink}.</>;
      case 'updated_user': return <><span className="font-medium">{userName}</span> updated {entityLink}.</>;
      case 'activated_user': return <><span className="font-medium">{userName}</span> activated {entityLink}.</>;
      case 'deactivated_user': return <><span className="font-medium">{userName}</span> deactivated {entityLink}.</>;


      case 'added_note_to_contact':
      case 'added_note_to_company':
      case 'added_note_to_deal':
        return (
          <>
            <span className="font-medium">{userName}</span> added a note to {entityLink}
            {activity.details?.noteContentPreview && <>: <span className="italic text-muted-foreground">"{activity.details.noteContentPreview}..."</span></>}
            .
          </>
        );
      case 'deleted_note_from_contact':
      case 'deleted_note_from_company':
      case 'deleted_note_from_deal':
         return (
          <>
            <span className="font-medium">{userName}</span> deleted a note from {entityLink}
            {activity.details?.noteContentPreview && <>: <span className="italic text-muted-foreground">"{activity.details.noteContentPreview}..."</span></>}
            .
          </>
        );
      default:
        return <><span className="font-medium">{userName}</span> performed an action on {entityLink}.</>;
    }
  };

  const changes = activity.details?.changes as Array<{ field: string; oldValue?: any; newValue?: any }> | undefined;

  return (
    <div>
      {mainActionText()}
      {changes && changes.length > 0 && (
        <ul className="mt-1 list-disc list-inside pl-4 text-xs text-muted-foreground space-y-0.5">
          {changes.map((change, index) => (
            <li key={index}>
              <span className="font-semibold">{change.field}</span>:
              {change.oldValue !== undefined && change.newValue !== undefined && change.oldValue !== null && change.newValue !== null && ` changed from "${String(change.oldValue).substring(0,50)}${String(change.oldValue).length > 50 ? '...' : ''}" to "${String(change.newValue).substring(0,50)}${String(change.newValue).length > 50 ? '...' : ''}"`}
              {change.oldValue === undefined && change.newValue !== undefined && ` set to "${String(change.newValue).substring(0,50)}${String(change.newValue).length > 50 ? '...' : ''}"`}
              {change.oldValue !== undefined && change.newValue === undefined && ` cleared (was "${String(change.oldValue).substring(0,50)}${String(change.oldValue).length > 50 ? '...' : ''}")`}
              {(change.oldValue === null || change.oldValue === '') && (change.newValue !== null && change.newValue !== '') && ` set to "${String(change.newValue).substring(0,50)}${String(change.newValue).length > 50 ? '...' : ''}"`}
              {(change.newValue === null || change.newValue === '') && (change.oldValue !== null && change.oldValue !== '') && ` cleared (was "${String(change.oldValue).substring(0,50)}${String(change.oldValue).length > 50 ? '...' : ''}")`}
              {(change.field.toLowerCase().includes('password') && change.newValue === '[REDACTED]') && ' changed'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const userInitials = 
    activity.user?.firstName && activity.user?.lastName 
    ? `${activity.user.firstName[0]}${activity.user.lastName[0]}`.toUpperCase() 
    : activity.user?.email ? activity.user.email[0].toUpperCase() : 'U';
  
  const icon = getActivityIcon(activity.entityType, activity.activityType);

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-border/50 last:border-b-0 hover:bg-secondary/30 transition-colors duration-150 px-2 rounded-md">
      <div className="flex-shrink-0 pt-0.5">{icon}</div>
      <div className="flex-1 text-sm">
        <div className="text-foreground leading-tight">
            {getActivityDescription(activity)}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          <FormattedNoteTimestamp createdAt={activity.createdAt} />
           {activity.user && (
             <span className="ml-1 text-muted-foreground/80">by {activity.user.firstName} {activity.user.lastName}</span>
           )}
        </div>
      </div>
    </div>
  );
}

    
