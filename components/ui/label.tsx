import * as React from 'react'
import { cn } from '@/lib/utils'

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      className={cn(
        'text-sm font-600 leading-none text-foreground/90',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
