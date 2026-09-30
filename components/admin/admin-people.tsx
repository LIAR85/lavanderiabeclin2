'use client'

import { Plus, Trash2, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { EMPLOYEE_ROLES } from '@/lib/config'
import {
  type AttendanceRecord,
  type Employee,
  getAttendanceRecords,
  getEmployees,
  saveAttendanceRecords,
  saveEmployees,
  uid,
} from '@/lib/local-store'

export function AdminPeople() {
  const [people, setPeople] = useState<Employee[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState(EMPLOYEE_ROLES[0])
  const [phone, setPhone] = useState('')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [pin, setPin] = useState('')
  const [dailyRate, setDailyRate] = useState('0')

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])

  const payrollPreview = useMemo(() => {
    const byEmployee = new Map<string, AttendanceRecord[]>()
    for (const a of attendance) {
      const list = byEmployee.get(a.employeeId) ?? []
      list.push(a)
      byEmployee.set(a.employeeId, list)
    }

    return people.map((p) => {
      const events = (byEmployee.get(p.id) ?? []).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      let openIn: number | null = null
      let totalMs = 0
      const workedDays = new Set<string>()

      for (const ev of events) {
        const t = new Date(ev.timestamp).getTime()
        if (ev.eventType === 'in') {
          openIn = t
        } else if (ev.eventType === 'out' && openIn != null) {
          const elapsedMs = Math.max(0, t - openIn)
          totalMs += elapsedMs
          if (elapsedMs > 0) {
            workedDays.add(new Date(openIn).toISOString().slice(0, 10))
          }
          openIn = null
        }
      }

      const hours = totalMs / (1000 * 60 * 60)
      return {
        employeeId: p.id,
        employeeName: p.name,
        hours,
        daysWorked: workedDays.size,
        amount: workedDays.size * (p.dailyRate ?? 0),
      }
    })
  }, [attendance, people])

  useEffect(() => {
    const raw = getEmployees()
    const normalized = raw.map((p, idx) => ({
      ...p,
      employeeNumber: p.employeeNumber ?? `E${String(idx + 1).padStart(3, '0')}`,
      pin: p.pin ?? '1234',
      dailyRate:
        typeof p.dailyRate === 'number'
          ? p.dailyRate
          : typeof p.hourlyRate === 'number'
            ? p.hourlyRate * 8
            : 0,
    }))
    setPeople(normalized)
    saveEmployees(normalized)
    setAttendance(getAttendanceRecords())
  }, [])

  function persist(next: Employee[]) {
    setPeople(next)
    saveEmployees(next)
  }

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (!employeeNumber.trim() || !pin.trim()) {
      toast.error('Captura número de empleado y contraseña')
      return
    }
    if (people.some((p) => p.employeeNumber === employeeNumber.trim())) {
      toast.error('Ese número de empleado ya existe')
      return
    }

    const parsedDailyRate = Number(dailyRate)
    persist([
      ...people,
      {
        id: uid(),
        employeeNumber: employeeNumber.trim(),
        pin: pin.trim(),
        name: name.trim(),
        role,
        phone: phone.trim(),
        dailyRate: Number.isFinite(parsedDailyRate) ? parsedDailyRate : 0,
        active: true,
      },
    ])
    setName('')
    setPhone('')
    setEmployeeNumber('')
    setPin('')
    setDailyRate('0')
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
                <Label htmlFor="emp-number">Número de empleado</Label>
                <Input
                  id="emp-number"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-pin">Contraseña</Label>
                <Input
                  id="emp-pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
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
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="emp-rate">Sueldo por día</Label>
                <Input
                  id="emp-rate"
                  inputMode="decimal"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
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
                      #{p.employeeNumber} · {p.role}
                      {p.phone ? ` · ${p.phone}` : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Sueldo diario: $ {p.dailyRate}
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

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 font-display text-base font-800">Historial de asistencia</h3>
          {attendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros todavía.</p>
          ) : (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {attendance.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-700">
                      {a.employeeName} · #{a.employeeNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.timestamp).toLocaleString('es-MX')}
                    </p>
                  </div>
                  <span className={a.eventType === 'in' ? 'font-700 text-success' : 'font-700 text-primary'}>
                    {a.eventType === 'in' ? 'Entrada' : 'Salida'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 font-display text-base font-800">Resumen de horas y sueldo</h3>
          <div className="flex flex-col gap-2">
            {payrollPreview.map((p) => (
              <div
                key={p.employeeId}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="font-600">{p.employeeName}</span>
                <span className="text-right">
                  {p.hours.toFixed(2)} h · {p.daysWorked} día(s) · ${p.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
