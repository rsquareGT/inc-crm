
import { AppPageShell } from '@/components/layout/app-page-shell';
import { EditProfileForm } from '@/components/profile/edit-profile-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditProfilePage() {
  return (
    <AppPageShell>
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">Edit Your Profile</CardTitle>
            <CardDescription>
              Update your personal information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditProfileForm />
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
