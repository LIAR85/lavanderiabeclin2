'use client'

import {
  Boxes,
  Lock,
  Receipt,
  Settings2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ADMIN_PASSWORD } from '@/lib/config'
import { cn } from '@/lib/utils'
import { AdminExpenses } from './admin-expenses'
import { AdminInventory } from './admin-inventory'
import { AdminMetrics } from './admin-metrics'
import { AdminPeople } from './admin-people'
import { AdminSettings } from './admin-settings'

type Tab = 'metrics' | 'inventory' | 'expenses' | 'people' | 'settings'

const TABS: { key: Tab; label: string; icon: typeof TrendingUp }[] = [
  { key: 'metrics', label: 'Métricas', icon: TrendingUp },
  { key: 'inventory', label: 'Inventario', icon: Boxes },
  { key: 'expenses', label: 'Gastos', icon: Receipt },
  { key: 'people', label: 'Personal', icon: Users },
  { key: 'settings', label: 'Ajustes', icon: Settings2 },
]

export function AdminView() {
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('metrics')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pass === ADMIN_PASSWORD) {
      setAuthed(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  const content = useMemo(() => {
    switch (tab) {
      case 'metrics':
        return <AdminMetrics />
      case 'inventory':
        return <AdminInventory />
      case 'expenses':
        return <AdminExpenses />
      case 'people':
        return <AdminPeople />
      case 'settings':
        return <AdminSettings />
    }
  }, [tab])

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm pt-8">
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                <Lock className="size-6" />
              </div>
              <h2 className="font-display text-xl font-900">Área administrativa</h2>
              <p className="text-sm text-muted-foreground">
                Introduce la contraseña maestra para acceder a métricas y gestión.
              </p>
            </div>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-pass">Contraseña</Label>
                <Input
                  id="admin-pass"
                  type="password"
                  value={pass}
                  onChange={(e) => {
                    setPass(e.target.value)
                    setError(false)
                  }}
                  autoFocus
                />
                {error && (
                  <p className="text-sm font-600 text-destructive">
                    Contraseña incorrecta
                  </p>
                )}
              </div>
              <Button type="submit" className="h-11 font-800">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-700 transition-colors',
                tab === t.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-foreground',
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>
      {content}
    </div>
  )
}
