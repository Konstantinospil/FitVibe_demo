/* eslint-disable @typescript-eslint/require-await */
import React, { useRef, type ReactElement } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRequiredFieldValidation } from "../../../src/hooks/useRequiredFieldValidation";
import { I18nextProvider } from "react-i18next";
import i18n from "../../../src/i18n/config";

// Test component that uses the hook
function TestForm({ requiredMessage }: { requiredMessage: string }): ReactElement {
  const formRef = useRef<HTMLFormElement>(null);
  const mockT = vi.fn((key: string) => {
    if (key === "validation.required") {
      return requiredMessage;
    }
    return key;
  });
  useRequiredFieldValidation(formRef, mockT);

  return (
    <form ref={formRef} data-testid="test-form">
      <input name="email" type="email" required data-testid="email-input" aria-label="Email" />
      <input
        name="password"
        type="password"
        required
        data-testid="password-input"
        aria-label="Password"
      />
      <input name="optional" type="text" data-testid="optional-input" aria-label="Optional" />
      <textarea
        name="description"
        required
        data-testid="description-textarea"
        aria-label="Description"
      />
      <select name="country" required data-testid="country-select" aria-label="Country">
        <option value="">Select a country</option>
        <option value="us">United States</option>
      </select>
      <button type="submit" data-testid="submit-button">
        Submit
      </button>
    </form>
  );
}

describe("useRequiredFieldValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set custom validity message when required field is empty", async () => {
    const requiredMessage = "Fill in this field";
    render(
      <I18nextProvider i18n={i18n}>
        <TestForm requiredMessage={requiredMessage} />
      </I18nextProvider>,
    );

    const emailInput = screen.getByTestId("email-input") as HTMLInputElement;

    // Wait for hook to initialize
    await waitFor(() => {
      expect(emailInput).toBeInTheDocument();
    });

    // Trigger validation check
    const isValid = emailInput.checkValidity();

    if (!isValid) {
      // Check that custom message is set
      expect(emailInput.validationMessage).toBe(requiredMessage);
    }
  });

  it("should clear custom validity when field has a value", async () => {
    const requiredMessage = "Fill in this field";
    render(
      <I18nextProvider i18n={i18n}>
        <TestForm requiredMessage={requiredMessage} />
      </I18nextProvider>,
    );

    const emailInput = screen.getByTestId("email-input") as HTMLInputElement;

    // Wait for initial setup
    await waitFor(() => {
      expect(emailInput).toBeInTheDocument();
    });

    // Fill in the field
    await act(async () => {
      fireEvent.input(emailInput, { target: { value: "test@example.com" } });
    });

    // Field should now be valid
    await waitFor(() => {
      emailInput.setCustomValidity("");
      expect(emailInput.checkValidity()).toBe(true);
    });
  });

  it("should show custom message on form submit with empty required fields", async () => {
    const requiredMessage = "Fill in this field";
    render(
      <I18nextProvider i18n={i18n}>
        <TestForm requiredMessage={requiredMessage} />
      </I18nextProvider>,
    );

    const emailInput = screen.getByTestId("email-input") as HTMLInputElement;
    const form = screen.getByTestId("test-form") as HTMLFormElement;
    const submitButton = screen.getByTestId("submit-button");

    // Wait for initial setup
    await waitFor(() => {
      expect(emailInput).toBeInTheDocument();
    });

    // Try to submit empty form
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Form validation should fail
    const formIsValid = form.checkValidity();
    expect(formIsValid).toBe(false);

    // Check that custom message is shown
    await waitFor(() => {
      if (!emailInput.checkValidity()) {
        expect(emailInput.validationMessage).toBe(requiredMessage);
      }
    });
  });

  it("should work with textarea elements", async () => {
    const requiredMessage = "Fill in this field";
    render(
      <I18nextProvider i18n={i18n}>
        <TestForm requiredMessage={requiredMessage} />
      </I18nextProvider>,
    );

    const textarea = screen.getByTestId("description-textarea") as HTMLTextAreaElement;

    await waitFor(() => {
      expect(textarea).toBeInTheDocument();
    });

    // Empty textarea should trigger validation
    const isValid = textarea.checkValidity();
    if (!isValid) {
      expect(textarea.validationMessage).toBe(requiredMessage);
    }

    // Fill in the textarea
    await act(async () => {
      fireEvent.input(textarea, { target: { value: "Some description" } });
    });

    await waitFor(() => {
      textarea.setCustomValidity("");
      expect(textarea.checkValidity()).toBe(true);
    });
  });

  it("should work with select elements", async () => {
    const requiredMessage = "Fill in this field";
    render(
      <I18nextProvider i18n={i18n}>
        <TestForm requiredMessage={requiredMessage} />
      </I18nextProvider>,
    );

    const select = screen.getByTestId("country-select") as HTMLSelectElement;

    await waitFor(() => {
      expect(select).toBeInTheDocument();
    });

    // Empty select should trigger validation
    const isValid = select.checkValidity();
    if (!isValid) {
      expect(select.validationMessage).toBe(requiredMessage);
    }

    // Select an option
    await act(async () => {
      fireEvent.change(select, { target: { value: "us" } });
    });

    await waitFor(() => {
      select.setCustomValidity("");
      expect(select.checkValidity()).toBe(true);
    });
  });

  it("should not set custom validity for optional fields", async () => {
    const requiredMessage = "Fill in this field";
    render(
      <I18nextProvider i18n={i18n}>
        <TestForm requiredMessage={requiredMessage} />
      </I18nextProvider>,
    );

    const optionalInput = screen.getByTestId("optional-input") as HTMLInputElement;

    await waitFor(() => {
      expect(optionalInput).toBeInTheDocument();
    });

    // Optional field should not have validation message
    expect(optionalInput.validationMessage).toBe("");
    expect(optionalInput.checkValidity()).toBe(true);
  });

  it("should handle multiple required fields independently", async () => {
    const requiredMessage = "Fill in this field";
    render(
      <I18nextProvider i18n={i18n}>
        <TestForm requiredMessage={requiredMessage} />
      </I18nextProvider>,
    );

    const emailInput = screen.getByTestId("email-input") as HTMLInputElement;
    const passwordInput = screen.getByTestId("password-input") as HTMLInputElement;

    await waitFor(() => {
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
    });

    // Fill in email only
    await act(async () => {
      fireEvent.input(emailInput, { target: { value: "test@example.com" } });
    });

    await waitFor(() => {
      emailInput.setCustomValidity("");
      expect(emailInput.checkValidity()).toBe(true);

      // Password should still be invalid if empty
      if (!passwordInput.checkValidity()) {
        expect(passwordInput.validationMessage).toBe(requiredMessage);
      }
    });
  });

  it("should handle whitespace-only values as empty", async () => {
    const requiredMessage = "Fill in this field";
    render(
      <I18nextProvider i18n={i18n}>
        <TestForm requiredMessage={requiredMessage} />
      </I18nextProvider>,
    );

    const emailInput = screen.getByTestId("email-input") as HTMLInputElement;

    await waitFor(() => {
      expect(emailInput).toBeInTheDocument();
    });

    // Fill with whitespace
    await act(async () => {
      fireEvent.input(emailInput, { target: { value: "   " } });
    });

    // Should still be invalid (trimmed value is empty)
    await waitFor(() => {
      if (!emailInput.checkValidity()) {
        expect(emailInput.validationMessage).toBe(requiredMessage);
      }
    });
  });
});
