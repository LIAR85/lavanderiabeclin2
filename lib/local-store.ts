'use client'

import { DEFAULT_SETTINGS, type PricingSettings } from './config'

const PREFIX = 'beclin:'

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent('beclin:store', { detail: { key } }))
  } catch {
    /* ignore quota errors */
  }
}

// ---- Settings ----
export function getSettings(): PricingSettings {
  return read<PricingSettings>('settings', DEFAULT_SETTINGS)
}
export function saveSettings(s: PricingSettings) {
  write('settings', s)
}
export function resetSettings() {
  write('settings', DEFAULT_SETTINGS)
}

// ---- Inventory ----
export interface Purchase {
  id: string
  quantity: number
  presentation: string
  brand: string
  price: number
  date: string
}
export interface InventoryCard {
  id: string
  name: string
  unit: string
  stock: number
  purchases: Purchase[]
}
export function getInventory(): InventoryCard[] {
  return read<InventoryCard[]>('inventory', [])
}
export function saveInventory(cards: InventoryCard[]) {
  write('inventory', cards)
}

// ---- Expenses ----
export interface Expense {
  id: string
  concept: string
  amount: number
  category: string
  date: string
}
export function getExpenses(): Expense[] {
  return read<Expense[]>('expenses', [])
}
export function saveExpenses(items: Expense[]) {
  write('expenses', items)
}

// ---- Employees ----
export interface Employee {
  id: string
  name: string
  role: string
  phone: string
  active: boolean
}
export function getEmployees(): Employee[] {
  return read<Employee[]>('employees', [])
}
export function saveEmployees(items: Employee[]) {
  write('employees', items)
}

// ---- Payroll ----
export interface PayrollEntry {
  id: string
  employeeId: string
  employeeName: string
  period: string
  hours: number
  amount: number
  date: string
}
export function getPayroll(): PayrollEntry[] {
  return read<PayrollEntry[]>('payroll', [])
}
export function savePayroll(items: PayrollEntry[]) {
  write('payroll', items)
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase()
}
