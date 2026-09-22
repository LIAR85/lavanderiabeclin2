'use client'

import { Package, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { INVENTORY_PRESETS } from '@/lib/config'
import { formatCurrency } from '@/lib/format'
import {
  getInventory,
  type InventoryCard,
  type Purchase,
  saveInventory,
  uid,
} from '@/lib/local-store'

export function AdminInventory() {
  const [cards, setCards] = useState<InventoryCard[]>([])
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('L')
  const [purchaseFor, setPurchaseFor] = useState<InventoryCard | null>(null)

  useEffect(() => {
    setCards(getInventory())
  }, [])

  function persist(next: InventoryCard[]) {
    setCards(next)
    saveInventory(next)
  }

  function addCard(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    persist([
      ...cards,
      { id: uid(), name: newName.trim(), unit: newUnit, stock: 0, purchases: [] },
    ])
    setNewName('')
    toast.success('Insumo agregado')
  }

  function removeCard(id: string) {
    persist(cards.filter((c) => c.id !== id))
  }

  function addPurchase(card: InventoryCard, p: Purchase) {
    persist(
      cards.map((c) =>
        c.id === card.id
          ? { ...c, stock: c.stock + p.quantity, purchases: [p, ...c.purchases] }
          : c,
      ),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={addCard} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="inv-name">Nuevo insumo</Label>
              <Input
                id="inv-name"
                list="inv-presets"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Detergente, bolsas…"
              />
              <datalist id="inv-presets">
                {INVENTORY_PRESETS.map((p) => (
                  <option key={p.name} value={p.name} />
                ))}
              </datalist>
            </div>
            <div className="flex w-full flex-col gap-1.5 sm:w-28">
              <Label htmlFor="inv-unit">Unidad</Label>
              <Select
                id="inv-unit"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              >
                <option value="L">L</option>
                <option value="kg">kg</option>
                <option value="pza">pza</option>
                <option value="caja">caja</option>
              </Select>
            </div>
            <Button type="submit" className="font-700">
              <Plus className="size-4" /> Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <Card key={card.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Package className="size-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-700">{card.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Existencia: {card.stock} {card.unit}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCard(card.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={`Eliminar ${card.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <Button
                  variant="secondary"
                  className="font-700"
                  onClick={() => setPurchaseFor(card)}
                >
                  <Plus className="size-4" /> Registrar compra
                </Button>
                {card.purchases.length > 0 && (
                  <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {card.purchases.slice(0, 3).map((p) => (
                      <li key={p.id} className="flex justify-between">
                        <span>
                          {p.quantity} {card.unit} · {p.brand || 'genérico'}
                        </span>
                        <span>{formatCurrency(p.price)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PurchaseDialog
        card={purchaseFor}
        onClose={() => setPurchaseFor(null)}
        onSave={(p) => {
          if (purchaseFor) addPurchase(purchaseFor, p)
          setPurchaseFor(null)
          toast.success('Compra registrada')
        }}
      />
    </div>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 py-12 text-center">
        <Package className="size-8 text-muted-foreground" />
        <p className="font-display text-lg font-800">Sin insumos</p>
        <p className="text-sm text-muted-foreground">
          Agrega insumos para llevar el control de existencias y compras.
        </p>
      </CardContent>
    </Card>
  )
}

function PurchaseDialog({
  card,
  onClose,
  onSave,
}: {
  card: InventoryCard | null
  onClose: () => void
  onSave: (p: Purchase) => void
}) {
  const [quantity, setQuantity] = useState('1')
  const [presentation, setPresentation] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')

  useEffect(() => {
    if (card) {
      setQuantity('1')
      setPresentation('')
      setBrand('')
      setPrice('')
    }
  }, [card])

  if (!card) return null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: uid(),
      quantity: Number(quantity) || 0,
      presentation: presentation.trim(),
      brand: brand.trim(),
      price: Number(price) || 0,
      date: new Date().toISOString(),
    })
  }

  return (
    <Dialog open={!!card} onClose={onClose} title={`Compra · ${card.name}`}>
      <form onSubmit={submit} className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-qty">Cantidad ({card.unit})</Label>
            <Input
              id="p-qty"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-price">Precio total</Label>
            <Input
              id="p-price"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-brand">Marca</Label>
          <Input
            id="p-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-pres">Presentación</Label>
          <Input
            id="p-pres"
            value={presentation}
            onChange={(e) => setPresentation(e.target.value)}
            placeholder="Garrafa 20 L, caja 12 pza…"
          />
        </div>
        <Button type="submit" className="h-11 font-800">
          Guardar compra
        </Button>
      </form>
    </Dialog>
  )
}
