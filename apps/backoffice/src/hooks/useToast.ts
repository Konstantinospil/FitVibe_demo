type ToastHandler = (message: string) => void;

type ToastApi = {
  success: ToastHandler;
  error: ToastHandler;
};

export const useToast = (): ToastApi => {
  const notify = (message: string) => {
    if (typeof window !== "undefined") {
      window.alert(message);
    }
  };

  return {
    success: notify,
    error: notify,
  };
};
