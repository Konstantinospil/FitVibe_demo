import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Label } from "../../src/components/ui/Label";

const testI18n = i18n.createInstance();
void testI18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: {} } },
  keySeparator: false,
  initImmediate: false,
});

describe("Label", () => {
  it("renders required indicator and error styling", () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <Label required error>
          Name
        </Label>
      </I18nextProvider>,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("validation.required")).toHaveTextContent("*");
  });
});
