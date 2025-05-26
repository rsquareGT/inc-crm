
'use client';

import type { Activity } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Link from 'next/link';
import { FormattedNoteTimestamp } from './formatted-note-timestamp'; // Assuming this exists
import { 
  Contact, UserRound, Briefcase, ListChecks, StickyNote, Edit3, Trash2, PlusCircle, CheckCircle2 
} from 'lucide-react';

const getEntityIcon = (entityType: Activity['entityType']) => {
  switch (entityType) {
    case 'contact': return <UserRound className="h-4 w-4" />;
    case 'company': return <Briefcase className="h-4 w-4" />;
    case 'deal': return <DollarSign className="h-4 w-4" />; // Using DollarSign for deals
    case 'task': return <ListChecks className="h-4 w-4" />;
    case 'note': return <StickyNote className="h-4 w-4" />;
    default: return <Edit3 className="h-4 w-4" />;
  }
};

const getActivityVerb = (activityType: Activity['activityType']): string => {
  if (activityType.startsWith('created_')) return 'created';
  if (activityType.startsWith('updated_')) return 'updated';
  if (activityType.startsWith('deleted_')) return 'deleted';
  if (activityType.startsWith('added_note_to_')) return 'added a note to';
  if (activityType.startsWith('deleted_note_from_')) return 'deleted a note from';
  if (activityType === 'completed_task') return 'completed';
  return 'interacted with';
};

const getActivityActionIcon = (activityType: Activity['activityType']) => {
  if (activityType.startsWith('created_') || activityType.startsWith('added_note_to_')) return <PlusCircle className="h-3 w-3 text-green-500" />;
  if (activityType.startsWith('updated_')) return <Edit3 className="h-3 w-3 text-blue-500" />;
  if (activityType.startsWith('deleted_') || activityType.startsWith('deleted_note_from_')) return <Trash2 className="h-3 w-3 text-red-500" />;
  if (activityType === 'completed_task') return <CheckCircle2 className="h-3 w-3 text-green-500" />;
  return <Edit3 className="h-3 w-3" />;
};

interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const userInitials = 
    activity.user?.firstName && activity.user?.lastName 
    ? `${activity.user.firstName[0]}${activity.user.lastName[0]}`.toUpperCase() 
    : activity.user?.email ? activity.user.email[0].toUpperCase() : 'U';

  const entityPath = `/${activity.entityType}s/${activity.entityId}`; // e.g., /contacts/contact-123

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-border/50 last:border-b-0">
      <Avatar className="h-8 w-8">
        <AvatarImage src={activity.user?.profilePictureUrl} alt={`${activity.user?.firstName} ${activity.user?.lastName}`} />
        <AvatarFallback>{userInitials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 text-sm">
        <p className="text-foreground">
          <span className="font-medium">{activity.user?.firstName || 'User'} {activity.user?.lastName || ''}</span>
          {' '}
          {getActivityVerb(activity.activityType)}
          {' '}
          {activity.entityName ? (
            <Link href={entityPath} className="font-medium text-primary hover:underline">
              {activity.entityType} "{activity.entityName}"
            </Link>
          ) : (
            `a ${activity.entityType}`
          )}
          {activity.activityType === 'updated_deal_stage' && activity.details?.old_stage && activity.details?.new_stage && (
            <> from <span className="font-semibold">{activity.details.old_stage}</span> to <span className="font-semibold">{activity.details.new_stage}</span></>
          )}
          { (activity.activityType.includes('added_note') || activity.activityType.includes('deleted_note')) && activity.details?.noteContentPreview && (
            <>: <span className="italic text-muted-foreground">"{activity.details.noteContentPreview}..."</span></>
          )}
        </p>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center">
          {getActivityActionIcon(activity.activityType)}
          <span className="mx-1">&middot;</span>
          <FormattedNoteTimestamp createdAt={activity.createdAt} />
        </div>
      </div>
    </div>
  );
}
