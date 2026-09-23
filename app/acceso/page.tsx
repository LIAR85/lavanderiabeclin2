import { Suspense } from 'react'
import { AccessForm } from '@/components/access/access-form'

export default function AccesoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/40 px-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Cargando acceso...</div>}>
        <AccessForm />
      </Suspense>
    </main>
  )
}
