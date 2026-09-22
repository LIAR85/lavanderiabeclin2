'use client'

import { Plus, Receipt, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { EXPENSE_CATEGORIES } from '@/lib/config'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  type Expense,
  getExpenses,
  saveExpenses,
  uid,
} from '@/lib/local-store'

export function AdminExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])

  useEffect(() => {
    setExpenses(getExpenses())
  }, [])

  function persist(next: Expense[]) {
    setExpenses(next)
    saveExpenses(next)
  }

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!concept.trim() || !amount) return
    persist([
      {
        id: uid(),
        concept: concept.trim(),
        amount: Number(amount) || 0,
        category,
        date: new Date().toISOString(),
      },
      ...expenses,
    ])
    setConcept('')
    setAmount('')
    toast.success('Gasto registrado')
  }

  const monthTotal = useMemo(() => {
    const now = new Date()
    return expenses
      .filter((e) => {
        const d = new Date(e.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((acc, e) => acc + e.amount, 0)
  }, [expenses])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-baseline justify-between p-4">
          <span className="text-sm text-muted-foreground">Gastos del mes</span>
          <span className="font-display text-2xl font-900 text-destructive">
            {formatCurrency(monthTotal)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={add} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-concept">Concepto</Label>
              <Input
                id="ex-concept"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Recibo de luz, renta…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ex-amount">Monto</Label>
                <Input
                  id="ex-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ex-cat">Categoría</Label>
                <Select
                  id="ex-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Button type="submit" className="font-700">
              <Plus className="size-4" /> Registrar gasto
            </Button>
          </form>
        </CardContent>
      </Card>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-12 text-center">
            <Receipt className="size-8 text-muted-foreground" />
            <p className="font-display text-lg font-800">Sin gastos</p>
            <p className="text-sm text-muted-foreground">
              Registra los gastos operativos del negocio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {expenses.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between p-3.5">
                <div className="flex flex-col">
                  <span className="font-600">{e.concept}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.category} · {formatDate(e.date)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-700 text-destructive">
                    {formatCurrency(e.amount)}
                  </span>
                  <button
                    onClick={() => persist(expenses.filter((x) => x.id !== e.id))}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Eliminar gasto"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
