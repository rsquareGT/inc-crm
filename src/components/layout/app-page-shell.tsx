import { AppHeader } from './app-header';

interface AppPageShellProps {
  children: React.ReactNode;
}

export function AppPageShell({ children }: AppPageShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container py-8 max-w-screen-2xl">
        {children}
      </main>
    </div>
  );
}
