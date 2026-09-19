export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-fg">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19V5" /><path d="M4 19h16" /><path d="m8 14 3.5-4 3 2.5L20 6" />
        </svg>
      </span>
      <span className="font-serif text-lg font-medium tracking-tight">Ledgerly</span>
    </div>
  );
}
