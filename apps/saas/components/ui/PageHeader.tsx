export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
