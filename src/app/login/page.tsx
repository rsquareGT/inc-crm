import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo"; // Assuming you want your logo here

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md shadow-xl bg-background">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back!</CardTitle>
          <CardDescription>Sign in to continue to DealFlow CRM.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account? Contact support.
      </p>
    </div>
  );
}
