
'use client';

import type { Activity } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { FormattedNoteTimestamp } from './formatted-note-timestamp';
import { 
  UserRound, Briefcase, DollarSign, ListChecks, StickyNote, Edit3, Trash2, PlusCircle, CheckCircle2 
} from 'lucide-react';

const getActivityIcon = (entityType: Activity['entityType']) => {
  switch (entityType) {
    case 'contact': return <UserRound className="h-4 w-4 text-indigo-500" />;
    case 'company': return <Briefcase className="h-4 w-4 text-sky-500" />;
    case 'deal': return <DollarSign className="h-4 w-4 text-amber-500" />;
    case 'task': return <ListChecks className="h-4 w-4 text-lime-500" />;
    case 'note': return <StickyNote className="h-4 w-4 text-slate-500" />;
    default: return <Edit3 className="h-4 w-4 text-gray-500" />;
  }
};

const getActivityActionVisual = (activityType: Activity['activityType']) => {
  if (activityType.startsWith('created_') || activityType.startsWith('added_note_to_')) {
    return { icon: <PlusCircle className="h-3.5 w-3.5 text-green-500" />, colorClass: "text-green-600 dark:text-green-400" };
  }
  if (activityType.startsWith('updated_')) {
    return { icon: <Edit3 className="h-3.5 w-3.5 text-blue-500" />, colorClass: "text-blue-600 dark:text-blue-400" };
  }
  if (activityType.startsWith('deleted_') || activityType.startsWith('deleted_note_from_')) {
    return { icon: <Trash2 className="h-3.5 w-3.5 text-red-500" />, colorClass: "text-red-600 dark:text-red-400" };
  }
  if (activityType === 'completed_task') {
    return { icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />, colorClass: "text-green-600 dark:text-green-400" };
  }
  return { icon: <Edit3 className="h-3.5 w-3.5 text-gray-500" />, colorClass: "text-gray-600 dark:text-gray-400" };
};

const getActivityDescription = (activity: Activity): React.ReactNode => {
  const userName = `${activity.user?.firstName || 'User'} ${activity.user?.lastName || ''}`.trim();
  const entityLink = activity.entityName ? (
    <Link href={`/${activity.entityType}s/${activity.entityId}`} className="font-medium text-primary hover:underline">
      {activity.entityType} "{activity.entityName}"
    </Link>
  ) : (
    `a ${activity.entityType}`
  );

  switch (activity.activityType) {
    case 'created_contact': return <><span className="font-medium">{userName}</span> created {entityLink}.</>;
    case 'updated_contact': return <><span className="font-medium">{userName}</span> updated {entityLink}.</>;
    case 'deleted_contact': return <><span className="font-medium">{userName}</span> deleted {entityLink}.</>;
    
    case 'created_company': return <><span className="font-medium">{userName}</span> created {entityLink}.</>;
    case 'updated_company': return <><span className="font-medium">{userName}</span> updated {entityLink}.</>;
    case 'deleted_company': return <><span className="font-medium">{userName}</span> deleted {entityLink}.</>;

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
    case 'deleted_deal': return <><span className="font-medium">{userName}</span> deleted {entityLink}.</>;

    case 'created_task': return <><span className="font-medium">{userName}</span> created task {entityLink}.</>;
    case 'updated_task': return <><span className="font-medium">{userName}</span> updated task {entityLink}.</>;
    case 'completed_task': return <><span className="font-medium">{userName}</span> completed task {entityLink}.</>;
    case 'deleted_task': return <><span className="font-medium">{userName}</span> deleted task {entityLink}.</>;

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


interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const userInitials = 
    activity.user?.firstName && activity.user?.lastName 
    ? `${activity.user.firstName[0]}${activity.user.lastName[0]}`.toUpperCase() 
    : activity.user?.email ? activity.user.email[0].toUpperCase() : 'U';
  
  const actionVisual = getActivityActionVisual(activity.activityType);

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-border/50 last:border-b-0 hover:bg-secondary/30 transition-colors duration-150 px-2 rounded-md">
      <div className="flex-shrink-0 pt-0.5">{actionVisual.icon}</div>
      <div className="flex-1 text-sm">
        <div className="flex items-center space-x-1.5 mb-0.5">
            <Avatar className="h-5 w-5">
                <AvatarImage src={activity.user?.profilePictureUrl} alt={`${activity.user?.firstName} ${activity.user?.lastName}`} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
            </Avatar>
            <p className="text-foreground leading-tight">
                {getActivityDescription(activity)}
            </p>
        </div>
        <div className="text-xs text-muted-foreground ml-1"> {/* Adjusted margin for timestamp */}
          <FormattedNoteTimestamp createdAt={activity.createdAt} />
        </div>
      </div>
    </div>
  );
}
