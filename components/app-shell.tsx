'use client'

import { LayoutGrid, PlusCircle, ScanLine, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { AdminView } from '@/components/admin/admin-view'
import { NewOrderForm } from '@/components/counter/new-order-form'
import { TicketDialog } from '@/components/counter/ticket-dialog'
import { ProcessBoard } from '@/components/process/process-board'
import { ScannerView } from '@/components/scanner/scanner-view'
import { useOnlineStatus } from '@/lib/hooks'
import type { OrderWithClient } from '@/lib/types'
import { cn } from '@/lib/utils'

type Tab = 'reception' | 'process' | 'scanner' | 'admin'

const NAV: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'reception', label: 'Recepción', icon: PlusCircle },
  { key: 'process', label: 'Proceso', icon: LayoutGrid },
  { key: 'scanner', label: 'Entrega', icon: ScanLine },
  { key: 'admin', label: 'Admin', icon: ShieldCheck },
]

export function AppShell() {
  const [tab, setTab] = useState<Tab>('reception')
  const [ticketOrder, setTicketOrder] = useState<OrderWithClient | null>(null)
  const online = useOnlineStatus()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5">
              <Image
                src="/beclin-logo.png"
                alt="beClin — Expertos Lavando"
                width={128}
                height={96}
                priority
                className="h-11 w-auto"
              />
            </div>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-base font-800 tracking-tight text-foreground">
                Sistema de Órdenes
              </span>
              <span className="text-xs font-600 text-muted-foreground">
                Lavandería beClin · Expertos Lavando
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-700',
                online
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              <span
                className={cn(
                  'size-2 rounded-full',
                  online ? 'bg-success' : 'bg-destructive',
                )}
              />
              {online ? 'En línea' : 'Sin conexión'}
            </span>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((n) => {
                const Icon = n.icon
                return (
                  <button
                    key={n.key}
                    onClick={() => setTab(n.key)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-700 transition-colors',
                      tab === n.key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    {n.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 sm:pb-8">
        {tab === 'reception' && (
          <NewOrderForm
            online={online}
            onCreated={(order) => setTicketOrder(order)}
          />
        )}
        {tab === 'process' && <ProcessBoard />}
        {tab === 'scanner' && <ScannerView />}
        {tab === 'admin' && <AdminView />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {NAV.map((n) => {
            const Icon = n.icon
            const active = tab === n.key
            return (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-600 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('size-5', active && 'stroke-[2.5]')} />
                {n.label}
              </button>
            )
          })}
        </div>
      </nav>

      <TicketDialog
        order={ticketOrder}
        offline={false}
        onClose={() => setTicketOrder(null)}
      />
    </div>
  )
}
