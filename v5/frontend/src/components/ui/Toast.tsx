import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
}

const toastStyles: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
  error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
  warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
  info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
}

interface ToastContextValue {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const addToast = React.useCallback((toast: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            duration={toast.duration || 5000}
            onOpenChange={(open) => {
              if (!open) removeToast(toast.id)
            }}
            className={cn(
              'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all',
              'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
              toastStyles[toast.type]
            )}
          >
            {toastIcons[toast.type]}
            <div className="flex-1 space-y-1">
              <ToastPrimitive.Title className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {toast.title}
              </ToastPrimitive.Title>
              {toast.description && (
                <ToastPrimitive.Description className="text-sm text-gray-600 dark:text-gray-400">
                  {toast.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 text-gray-500 opacity-0 transition-opacity hover:text-gray-900 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 dark:text-gray-400 dark:hover:text-gray-100">
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

// Convenience hooks for common toast types
export function useToastActions() {
  const { addToast } = useToast()

  return React.useMemo(
    () => ({
      success: (title: string, description?: string) =>
        addToast({ type: 'success', title, description }),
      error: (title: string, description?: string) =>
        addToast({ type: 'error', title, description }),
      warning: (title: string, description?: string) =>
        addToast({ type: 'warning', title, description }),
      info: (title: string, description?: string) =>
        addToast({ type: 'info', title, description }),
    }),
    [addToast]
  )
}
