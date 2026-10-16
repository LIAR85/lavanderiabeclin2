'use client'

import { Loader2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/format'
import { useClients } from '@/lib/hooks'

export function AdminClients() {
  const { data, isLoading } = useClients()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data ?? []
    return (data ?? []).filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o correo"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay clientes para mostrar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <Card key={client.id}>
              <CardContent className="flex flex-col gap-2 p-4 text-sm">
                <p className="font-display text-base font-800 leading-tight">{client.name}</p>
                <p className="text-muted-foreground">{client.phone}</p>
                <p className="truncate text-muted-foreground">
                  {client.email || 'Sin correo'}
                </p>
                <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                  <p>Alta: {formatDate(client.created_at)}</p>
                  <p>Actualizado: {formatDate(client.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
