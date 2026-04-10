import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Questionnaire from "@/pages/Questionnaire";

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const upsertMock = vi.fn();
const fromMock = vi.fn(() => ({ select: selectMock, upsert: upsertMock }));
const signOutMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    signOut: signOutMock,
  }),
}));

describe("Questionnaire", () => {
  beforeEach(() => {
    maybeSingleMock.mockResolvedValue({ data: null });
    upsertMock.mockResolvedValue({ data: null, error: null });
    fromMock.mockClear();
    selectMock.mockClear();
    eqMock.mockClear();
    maybeSingleMock.mockClear();
    upsertMock.mockClear();
    signOutMock.mockClear();
  });

  it("shows the correct question content on consecutive steps", async () => {
    render(
      <MemoryRouter>
        <Questionnaire />
      </MemoryRouter>
    );

    expect(
      await screen.findByText("What best describes your primary professional background?")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Risk, Audit or Compliance" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("What is your current seniority level?")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("What best describes your primary professional background?")
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Senior Manager" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("How many years of professional experience do you have?")).toBeInTheDocument();
    });
    expect(screen.queryByText("What is your current seniority level?")).not.toBeInTheDocument();
  });
});