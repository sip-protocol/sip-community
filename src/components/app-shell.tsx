import type { ReactNode } from 'react'
import { MessagesSquare } from 'lucide-react'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header role="banner" className="border-b">
        <div className="mx-auto max-w-3xl flex items-center gap-2 p-4">
          <MessagesSquare className="size-5" aria-hidden />
          <span className="font-semibold">SIP Community</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
      <footer
        role="contentinfo"
        className="border-t p-4 text-sm text-muted-foreground"
      >
        <div className="mx-auto max-w-3xl">
          Async · privacy-respecting · open-source
        </div>
      </footer>
    </div>
  )
}
