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
  const stored = read<Partial<PricingSettings>>('settings', DEFAULT_SETTINGS)
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    basePrices: { ...DEFAULT_SETTINGS.basePrices, ...stored.basePrices },
    bagFactors: { ...DEFAULT_SETTINGS.bagFactors, ...stored.bagFactors },
    variantPrices: { ...stored.variantPrices },
  }
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
  employeeNumber: string
  pin: string
  name: string
  role: string
  phone: string
  dailyRate: number
  active: boolean
  // Legacy fields from previous schema; kept optional for smooth migration.
  scheduleStart?: string
  scheduleEnd?: string
  hourlyRate?: number
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

// ---- Delivery capacity (calendar) ----
export type IroningLimitedService = 'planchado' | 'lavado_planchado'

export interface DailyIroningConfig {
  limits: Record<IroningLimitedService, number>
  unlimited: Record<IroningLimitedService, boolean>
}

export interface DeliveryCapacityConfig {
  byDate: Record<string, DailyIroningConfig>
  defaultConfig: DailyIroningConfig
}

const DEFAULT_DELIVERY_CAPACITY: DeliveryCapacityConfig = {
  byDate: {},
  defaultConfig: {
    limits: {
      planchado: 40,
      lavado_planchado: 40,
    },
    unlimited: {
      planchado: false,
      lavado_planchado: false,
    },
  },
}

function asValidLimit(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const int = Math.floor(n)
  if (int < 0) return fallback
  return int
}

function asValidBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeDay(raw: unknown, fallbackLimit: number): DailyIroningConfig {
  if (typeof raw === 'number') {
    const limit = asValidLimit(raw, fallbackLimit)
    return {
      limits: {
        planchado: limit,
        lavado_planchado: limit,
      },
      unlimited: {
        planchado: false,
        lavado_planchado: false,
      },
    }
  }

  const candidate = raw as {
    limits?: Partial<Record<IroningLimitedService, number>>
    unlimited?: Partial<Record<IroningLimitedService, boolean>>
  }

  return {
    limits: {
      planchado: asValidLimit(candidate?.limits?.planchado, fallbackLimit),
      lavado_planchado: asValidLimit(
        candidate?.limits?.lavado_planchado,
        fallbackLimit,
      ),
    },
    unlimited: {
      planchado: asValidBool(candidate?.unlimited?.planchado, false),
      lavado_planchado: asValidBool(candidate?.unlimited?.lavado_planchado, false),
    },
  }
}

function normalizeDeliveryCapacity(raw: unknown): DeliveryCapacityConfig {
  const candidate = raw as {
    byDate?: Record<string, unknown>
    defaultIroningDailyMax?: number
    defaultConfig?: unknown
  }

  const legacyDefault = asValidLimit(candidate?.defaultIroningDailyMax, 40)
  const defaultConfig = normalizeDay(candidate?.defaultConfig, legacyDefault)
  const byDateRaw = candidate?.byDate ?? {}
  const byDate: Record<string, DailyIroningConfig> = {}

  for (const [key, value] of Object.entries(byDateRaw)) {
    byDate[key] = normalizeDay(value, defaultConfig.limits.planchado)
  }

  return {
    byDate,
    defaultConfig,
  }
}

export function getDeliveryCapacityConfig(): DeliveryCapacityConfig {
  const raw = read<unknown>('delivery_capacity', DEFAULT_DELIVERY_CAPACITY)
  return normalizeDeliveryCapacity(raw)
}

export function saveDeliveryCapacityConfig(config: DeliveryCapacityConfig) {
  write('delivery_capacity', config)
}

// ---- Attendance ----
export type AttendanceEventType = 'in' | 'out'

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeNumber: string
  employeeName: string
  eventType: AttendanceEventType
  timestamp: string
}

export function getAttendanceRecords(): AttendanceRecord[] {
  return read<AttendanceRecord[]>('attendance_records', [])
}

export function saveAttendanceRecords(items: AttendanceRecord[]) {
  write('attendance_records', items)
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase()
}
