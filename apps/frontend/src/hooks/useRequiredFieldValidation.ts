import { useEffect, type RefObject } from "react";
import type { TFunction } from "i18next";

/**
 * Hook to set custom i18n validation messages for required HTML form inputs.
 * This ensures that HTML5 native validation messages are displayed in the current language.
 *
 * @param formRef - Reference to the form element
 * @param t - Translation function from i18next
 */
export function useRequiredFieldValidation(
  formRef: RefObject<HTMLFormElement>,
  t: TFunction,
): void {
  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const requiredMessage = t("validation.required");

    const setValidity = (
      element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    ): void => {
      // Set custom message for when field is empty
      if (element.value.trim() === "") {
        element.setCustomValidity(requiredMessage);
      } else {
        // Clear custom validity to allow other validation to work
        element.setCustomValidity("");
      }
    };

    // Set custom validity message for all required inputs
    const requiredInputs = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input[required], textarea[required], select[required]",
      ),
    );

    // Initialize validity for all required inputs
    requiredInputs.forEach((input) => {
      setValidity(input);
    });

    // Create event handlers
    const handleInput = (event: Event): void => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (target.hasAttribute("required")) {
        setValidity(target);
      }
    };

    const handleInvalid = (event: Event): void => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (target.hasAttribute("required") && target.value.trim() === "") {
        target.setCustomValidity(requiredMessage);
      }
    };

    // Add event listeners to form (using event delegation)
    form.addEventListener("input", handleInput);
    form.addEventListener("invalid", handleInvalid, true);

    // Cleanup: remove event listeners
    return () => {
      form.removeEventListener("input", handleInput);
      form.removeEventListener("invalid", handleInvalid, true);
    };
  }, [formRef, t]);
}
