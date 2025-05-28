"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; // Added
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false), // Added
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const {
    login: contextLogin,
    isAuthenticated,
    user: authUser,
    isLoading: authContextLoading,
  } = useAuth();
  const { toast } = useToast();

  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [loginApiSuccess, setLoginApiSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState("Sign In");
  const redirectInitiated = useRef(false);

  const {
    register,
    handleSubmit,
    control, // Needed for Checkbox
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    console.log("LoginForm: onSubmit called with data:", data);
    setIsSubmittingForm(true);
    setLoginApiSuccess(false);
    setFormError(null);
    redirectInitiated.current = false;

    try {
      const loginSuccessful = await contextLogin(data.email, data.password, data.rememberMe); // Pass rememberMe
      if (loginSuccessful) {
        console.log(
          "LoginForm: contextLogin reported success. Waiting for context update and redirect effect."
        );
        setLoginApiSuccess(true);
        // Redirection is handled by useEffect watching isAuthenticated
      } else {
        setFormError(
          "Login successful by API, but failed to verify session via context. Please try again."
        );
        console.warn(
          "LoginForm: contextLogin reported failure to verify session after API success."
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred during login.";
      setFormError(message);
      toast({ title: "Login Failed", description: message, variant: "destructive" });
      console.error("LoginForm: contextLogin threw an error:", error);
    } finally {
      // Only set submitting to false if redirect hasn't been triggered by useEffect
      // This state will be re-evaluated by the button text logic
      if (!redirectInitiated.current && !loginApiSuccess) {
        setIsSubmittingForm(false);
      }
    }
  };

  useEffect(() => {
    console.log(
      `LoginForm useEffect: isAuthenticated: ${isAuthenticated}, authContextLoading: ${authContextLoading}, loginApiSuccess: ${loginApiSuccess}, authUser: ${!!authUser}, redirectInitiated: ${redirectInitiated.current}`
    );
    if (
      loginApiSuccess &&
      isAuthenticated &&
      !authContextLoading &&
      authUser &&
      !redirectInitiated.current
    ) {
      console.log(
        "LoginForm useEffect: Conditions met for redirect. Attempting redirect to /dashboard."
      );
      redirectInitiated.current = true;
      router.push("/dashboard");
    }
  }, [isAuthenticated, authContextLoading, authUser, loginApiSuccess, router]);

  useEffect(() => {
    if (isSubmittingForm) {
      if (loginApiSuccess && !redirectInitiated.current) {
        setButtonText("Validated. Please wait...");
      } else if (redirectInitiated.current) {
        setButtonText("Redirecting...");
      } else {
        setButtonText("Validating User...");
      }
    } else {
      setButtonText("Sign In");
    }
  }, [isSubmittingForm, loginApiSuccess, redirectInitiated.current]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md">
          {formError}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register("email")}
          disabled={isSubmittingForm}
          className={errors.email || formError ? "border-destructive" : ""}
        />
        {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
          disabled={isSubmittingForm}
          className={errors.password || formError ? "border-destructive" : ""}
        />
        {errors.password && (
          <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="rememberMe" {...register("rememberMe")} disabled={isSubmittingForm} />
        <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground">
          Remember me
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmittingForm}>
        {isSubmittingForm ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="mr-2 h-4 w-4" />
        )}
        {buttonText}
      </Button>
    </form>
  );
}
