import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { ThemeToggle } from "./theme-toggle";
import { Bus, LogOut } from "lucide-react";
import type { ReactNode } from "react";

type NavItem = { to: string; label: string; icon: ReactNode };

export function AppShell({ nav, children, title }: { nav: NavItem[]; children: ReactNode; title: string }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    void navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
              <Bus className="size-4" />
            </div>
            <div className="leading-tight">
              <p className="font-display font-extrabold text-lg text-foreground">UniRoute</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((n) => {
              const active = path === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {n.icon}
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition text-sm font-medium text-muted-foreground"
              title="Sign out and return to home"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <div className="lg:hidden border-t border-border overflow-x-auto">
          <div className="flex gap-1 px-3 py-2 min-w-max">
            {nav.map((n) => {
              const active = path === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground bg-muted"
                  }`}
                >
                  {n.icon}
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
