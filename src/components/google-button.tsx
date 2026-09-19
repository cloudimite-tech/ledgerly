export function GoogleButton({ label }: { label: string }) {
  return (
    <a
      href="/api/auth/google"
      className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface text-sm font-medium text-fg transition hover:bg-surface-2 hover:border-primary/30"
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.5l6.6-6.6C35.3 2.5 30 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.7 6C12.2 13 17.6 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.6c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7C43.5 37.9 46.5 31.8 46.5 24.5z" />
        <path fill="#FBBC05" d="M10.3 19.2A14.5 14.5 0 0 0 9.5 24c0 1.7.3 3.3.8 4.8l-7.7 6A24 24 0 0 1 0 24c0-3.9.9-7.5 2.6-10.8l7.7 6z" />
        <path fill="#34A853" d="M24 48c6 0 11.3-2 15-5.3l-7.3-5.7c-2 1.4-4.6 2.2-7.7 2.2-6.4 0-11.8-3.5-13.7-9.2l-7.7 6C6.5 42.6 14.6 48 24 48z" />
      </svg>
      {label}
    </a>
  );
}
