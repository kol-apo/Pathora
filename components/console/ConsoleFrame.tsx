import Sidebar, { type SidebarVariant } from '@/components/layout/Sidebar';

/** Page frame for the student, mentor and admin consoles: sidebar plus content. */
export default function ConsoleFrame({
  variant,
  title,
  subtitle,
  actions,
  children,
}: {
  variant: SidebarVariant;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar variant={variant} />
      <main className="px-5 pb-24 pt-8 md:px-10 lg:ml-[248px] lg:pb-10">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-7">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[26px] font-bold tracking-[-0.03em] text-ink md:text-[28px]">{title}</h1>
              {subtitle && <div className="mt-1.5 text-[15px] text-muted">{subtitle}</div>}
            </div>
            {actions}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
