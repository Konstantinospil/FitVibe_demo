import { useToast as useToastContext } from "../../contexts/ToastContext";

export interface ToastOptions {
  variant: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number;
}

export const useToast = () => {
  const toast = useToastContext();

  return {
    showToast: (options: ToastOptions) => {
      const message = options.title ? `${options.title}: ${options.message}` : options.message;
      toast.showToast(options.variant, message, options.duration);
    },
    success: (message: string, duration?: number) => toast.success(message, duration),
    error: (message: string, duration?: number) => toast.error(message, duration),
    warning: (message: string, duration?: number) => toast.warning(message, duration),
    info: (message: string, duration?: number) => toast.info(message, duration),
  };
};
