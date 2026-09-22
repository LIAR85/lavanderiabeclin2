'use client'

import { Plus, Trash2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { EMPLOYEE_ROLES } from '@/lib/config'
import {
  type Employee,
  getEmployees,
  saveEmployees,
  uid,
} from '@/lib/local-store'

export function AdminPeople() {
  const [people, setPeople] = useState<Employee[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState(EMPLOYEE_ROLES[0])
  const [phone, setPhone] = useState('')

  useEffect(() => {
    setPeople(getEmployees())
  }, [])

  function persist(next: Employee[]) {
    setPeople(next)
    saveEmployees(next)
  }

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    persist([
      ...people,
      {
        id: uid(),
        name: name.trim(),
        role,
        phone: phone.trim(),
        active: true,
      },
    ])
    setName('')
    setPhone('')
    toast.success('Empleado agregado')
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={add} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-name">Nombre</Label>
              <Input
                id="emp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-role">Puesto</Label>
                <Select
                  id="emp-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {EMPLOYEE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-phone">Teléfono</Label>
                <Input
                  id="emp-phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="font-700">
              <Plus className="size-4" /> Agregar empleado
            </Button>
          </form>
        </CardContent>
      </Card>

      {people.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-12 text-center">
            <UserRound className="size-8 text-muted-foreground" />
            <p className="font-display text-lg font-800">Sin personal</p>
            <p className="text-sm text-muted-foreground">
              Registra a tu equipo de trabajo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {people.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-secondary font-800 text-primary">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-600">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.role}
                      {p.phone ? ` · ${p.phone}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => persist(people.filter((x) => x.id !== p.id))}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Eliminar ${p.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
