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
import { type Expense, getExpenses, saveExpenses, uid } from '@/lib/local-store'

export function AdminExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    setExpenses(getExpenses())
  }, [])

  function persist(next: Expense[]) {
    setExpenses(next)
    saveExpenses(next)
  }

  function clearForm() {
    setEditingId(null)
    setConcept('')
    setAmount('')
    setCategory(EXPENSE_CATEGORIES[0])
    setExpenseDate(new Date().toISOString().slice(0, 10))
  }

  function submitExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!concept.trim() || !amount) return
    const payload: Expense = {
      id: editingId ?? uid(),
      concept: concept.trim(),
      amount: Number(amount) || 0,
      category,
      date: expenseDate
        ? new Date(`${expenseDate}T12:00:00`).toISOString()
        : new Date().toISOString(),
    }
    if (editingId) {
      persist(expenses.map((entry) => (entry.id === editingId ? payload : entry)))
      toast.success('Gasto actualizado')
    } else {
      persist([payload, ...expenses])
      toast.success('Gasto registrado')
    }
    clearForm()
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id)
    setConcept(expense.concept)
    setAmount(String(expense.amount))
    setCategory(expense.category)
    setExpenseDate((expense.date || '').slice(0, 10))
  }

  function removeExpense(id: string) {
    persist(expenses.filter((x) => x.id !== id))
    if (editingId === id) clearForm()
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
          <form onSubmit={submitExpense} className="flex flex-col gap-3">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-date">Fecha del gasto</Label>
              <Input
                id="ex-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="font-700">
                <Plus className="size-4" /> {editingId ? 'Guardar cambios' : 'Registrar gasto'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={clearForm}>
                  Cancelar edición
                </Button>
              )}
            </div>
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
                <div className="flex items-center gap-2">
                  <span className="font-700 text-destructive">
                    {formatCurrency(e.amount)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => startEdit(e)}>
                    Editar
                  </Button>
                  <button
                    onClick={() => removeExpense(e.id)}
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
