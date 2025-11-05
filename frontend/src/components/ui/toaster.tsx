import * as React from "react"
import * as RT from "@radix-ui/react-toast"
import {
  ToastProvider as UIToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "./toast"
import { ToastProviderCtx, useToast } from "./use-toast"

function ToastItems() {
  const { toasts, dismiss } = useToast()
  return (
    <>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          className={
            t.variant === "destructive"
              ? "border-red-200"
              : t.variant === "success"
              ? "border-green-200"
              : ""
          }
          onOpenChange={(open) => !open && dismiss(t.id)}
        >
          {t.title && <ToastTitle>{t.title}</ToastTitle>}
          {t.description && <ToastDescription>{t.description}</ToastDescription>}
          <ToastClose />
        </Toast>
      ))}
    </>
  )
}

/**
 * Wrap your entire app with this provider so `useToast()` works anywhere.
 */
export function ToastRootProvider({ children }: { children: React.ReactNode }) {
  return (
    <RT.Provider swipeDirection="right">
      <ToastProviderCtx>
        <UIToastProvider>
          {children}
          {/* Renderer lives at root so toasts overlay above all routes */}
          <ToastItems />
          <ToastViewport />
        </UIToastProvider>
      </ToastProviderCtx>
    </RT.Provider>
  )
}
