import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExerciseArchiveDialog } from "../../src/components/exercises/ExerciseArchiveDialog";

const deleteExercise = vi.fn();
const showToast = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../src/components/ui/Toast", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("../../src/services/api", () => ({
  deleteExercise: (...args: unknown[]) => deleteExercise(...args),
}));

describe("ExerciseArchiveDialog", () => {
  beforeEach(() => {
    deleteExercise.mockReset().mockResolvedValue(undefined);
    showToast.mockReset();
  });

  it("does not render when closed", () => {
    render(
      <ExerciseArchiveDialog
        exerciseId="ex-1"
        exerciseName="Squat"
        isOpen={false}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("archives an exercise and closes", async () => {
    const onClose = vi.fn();
    const onArchived = vi.fn();
    render(
      <ExerciseArchiveDialog
        exerciseId="ex-1"
        exerciseName="Squat"
        isOpen
        onClose={onClose}
        onArchived={onArchived}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /exercises.archive$/ }));
    await waitFor(() => expect(deleteExercise).toHaveBeenCalledWith("ex-1"));
    expect(onArchived).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith({
      variant: "success",
      title: "exercises.archived",
      message: "exercises.archivedMessage",
    });
  });

  it("shows an error toast when archival fails", async () => {
    deleteExercise.mockRejectedValue(new Error("fail"));
    render(
      <ExerciseArchiveDialog exerciseId="ex-1" exerciseName="Squat" isOpen onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /exercises.archive$/ }));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        variant: "error",
        title: "exercises.archiveFailed",
        message: "exercises.archiveFailedMessage",
      }),
    );
  });
});
