import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExerciseTypeManager } from "../../src/components/admin/ExerciseTypeManager";

vi.mock("react-i18next", () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

describe("ExerciseTypeManager", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an empty state after loading placeholder types", async () => {
    render(<ExerciseTypeManager />);
    expect(await screen.findByText("admin.exerciseTypes.empty")).toBeInTheDocument();
  });

  it("creates, edits, and deletes an exercise type", async () => {
    const onTypeCreated = vi.fn();
    const onTypeUpdated = vi.fn();
    const onTypeDeleted = vi.fn();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));

    render(
      <ExerciseTypeManager
        onTypeCreated={onTypeCreated}
        onTypeUpdated={onTypeUpdated}
        onTypeDeleted={onTypeDeleted}
      />,
    );
    expect(await screen.findByText("admin.exerciseTypes.empty")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "admin.exerciseTypes.create" })[0]);

    fireEvent.change(screen.getByLabelText(/admin.exerciseTypes.code/), {
      target: { value: "str" },
    });
    fireEvent.change(screen.getByLabelText(/admin.exerciseTypes.name/), {
      target: { value: "Strength" },
    });
    fireEvent.change(screen.getByPlaceholderText("admin.exerciseTypes.descriptionPlaceholder"), {
      target: { value: "Heavy lifts" },
    });
    fireEvent.click(screen.getByRole("button", { name: "common.create" }));

    await waitFor(() => expect(onTypeCreated).toHaveBeenCalled());
    expect(onTypeCreated.mock.calls[0][0]).toEqual(
      expect.objectContaining({ code: "str", nameEn: "Strength", descriptionEn: "Heavy lifts" }),
    );
    expect(screen.getByText("Strength (str)")).toBeInTheDocument();
    expect(screen.getByText("Heavy lifts")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "common.edit" }));
    fireEvent.change(screen.getByLabelText(/admin.exerciseTypes.name/), {
      target: { value: "Power" },
    });
    fireEvent.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() =>
      expect(onTypeUpdated).toHaveBeenCalledWith(expect.objectContaining({ nameEn: "Power" })),
    );
    expect(screen.getByText("Power (str)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "common.delete" }));
    expect(onTypeDeleted).toHaveBeenCalled();
    expect(screen.queryByText("Power (str)")).not.toBeInTheDocument();
  });

  it("cancels create and skips delete when confirm is declined", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    const onTypeCreated = vi.fn();
    const onTypeDeleted = vi.fn();

    render(<ExerciseTypeManager onTypeCreated={onTypeCreated} onTypeDeleted={onTypeDeleted} />);
    expect(await screen.findByText("admin.exerciseTypes.empty")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "admin.exerciseTypes.create" })[0]);
    fireEvent.change(screen.getByLabelText(/admin.exerciseTypes.code/), {
      target: { value: "end" },
    });
    fireEvent.change(screen.getByLabelText(/admin.exerciseTypes.name/), {
      target: { value: "Endurance" },
    });
    fireEvent.click(screen.getByRole("button", { name: "common.create" }));
    expect(await screen.findByText("Endurance (end)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "common.delete" }));
    expect(onTypeDeleted).not.toHaveBeenCalled();
    expect(screen.getByText("Endurance (end)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "common.edit" }));
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    expect(screen.queryByRole("button", { name: "common.save" })).not.toBeInTheDocument();
  });
});
