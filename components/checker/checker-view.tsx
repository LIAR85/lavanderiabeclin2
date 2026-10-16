'use client'

import { Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  type AttendanceRecord,
  getAttendanceRecords,
  getEmployees,
  saveAttendanceRecords,
  uid,
} from '@/lib/local-store'

export function CheckerView() {
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    setAttendance(getAttendanceRecords())
  }, [])

  function register(eventType: 'in' | 'out') {
    const people = getEmployees()
    const employee = people.find(
      (p) => p.active && p.employeeNumber === employeeNumber.trim(),
    )

    if (!employee) {
      toast.error('Número de empleado no encontrado')
      return
    }

    const next: AttendanceRecord[] = [
      {
        id: uid(),
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        employeeName: employee.name,
        eventType,
        timestamp: new Date().toISOString(),
      },
      ...attendance,
    ]

    setAttendance(next)
    saveAttendanceRecords(next)
    setEmployeeNumber('')
    toast.success(eventType === 'in' ? 'Entrada registrada' : 'Salida registrada')
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="border-sky-200 bg-gradient-to-b from-sky-50 to-white shadow-sm">
        <CardContent className="flex flex-col gap-5 p-5 md:p-6">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-sky-100 p-2.5 text-sky-700">
              <Clock3 className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-900 text-sky-900">Checador de personal</h2>
              <p className="text-sm text-slate-600">
                Captura tu número de empleado para registrar entrada o salida.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="checker-employee-number">Número de empleado</Label>
            <Input
              id="checker-employee-number"
              placeholder="Ej. E001"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              className="h-12 text-xl font-800 tracking-wide"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button onClick={() => register('in')} className="h-12 text-base font-800">
              Registrar entrada
            </Button>
            <Button variant="outline" onClick={() => register('out')} className="h-12 text-base font-800">
              Registrar salida
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
