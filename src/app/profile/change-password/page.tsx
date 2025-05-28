import { AppPageShell } from "@/components/layout/app-page-shell";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChangePasswordPage() {
  return (
    <AppPageShell>
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Change Your Password
            </CardTitle>
            <CardDescription>
              Enter your current password and your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
