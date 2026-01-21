"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster({
  position = "top-right",
}: {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}) {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className={`fixed flex flex-col gap-2 w-full md:max-w-[420px] p-4 ${position === "top-right" ? "top-0 right-0" :
          position === "top-left" ? "top-0 left-0" :
            position === "bottom-left" ? "bottom-0 left-0" :
              "bottom-0 right-0"
        }`} />
    </ToastProvider>
  )
}
