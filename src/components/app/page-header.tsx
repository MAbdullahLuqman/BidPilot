export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-400/80">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-heading text-3xl leading-tight tracking-tight md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
