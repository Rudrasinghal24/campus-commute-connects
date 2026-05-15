import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  tone = "primary",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "primary" | "accent" | "success" | "warning" | "danger";
  icon?: ReactNode;
}) {
  const colors: Record<string, string> = {
    primary: "text-primary",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };
  return (
    <div className="bg-card p-5 rounded-3xl shadow-sm border border-border">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && <div className={`${colors[tone]} opacity-70`}>{icon}</div>}
      </div>
      <h3 className={`text-3xl font-display font-extrabold ${colors[tone]}`}>{value}</h3>
      {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
    </div>
  );
}
