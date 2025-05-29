import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo"; // Assuming you want your logo here

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-4">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white/90 dark:bg-slate-900/90 shadow-2xl backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
            Welcome Back!
          </CardTitle>
          <CardDescription className="text-base text-emerald-600 dark:text-emerald-300">
            Sign in to continue to DealFlow CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      <p className="mt-8 text-center text-sm text-emerald-700 dark:text-emerald-400">
        Don&apos;t have an account?{" "}
        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
          Contact support.
        </span>
      </p>
    </div>
  );
}
