import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionState = vi.hoisted(() => ({
  state: { error: null } as { error: string | null },
  action: vi.fn(),
  pending: false,
}));

const visitorAction = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: vi.fn(() => [actionState.state, actionState.action, actionState.pending]),
  };
});

vi.mock("@/app/login/actions", () => ({
  loginAction: vi.fn(),
  visitorLoginAction: visitorAction,
}));

import { LoginForm } from "@/app/login/login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    actionState.state = { error: null };
    actionState.pending = false;
    actionState.action.mockReset();
    visitorAction.mockClear();
  });

  it("collects the actor ID and secret without exposing the secret as text", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Actor ID")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("CMS access key")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("CMS access key")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("button", { name: "Open control center" })).toBeEnabled();
  });

  it("renders the server action error as an alert", () => {
    actionState.state = { error: "The supplied credentials are not valid." };

    render(<LoginForm />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The supplied credentials are not valid.",
    );
  });

  it("disables duplicate submission while authentication is pending", () => {
    actionState.pending = true;

    render(<LoginForm />);

    expect(screen.getByRole("button", { name: /Signing in/ })).toBeDisabled();
  });

  it("offers visitor access without asking for another credential", async () => {
    render(<LoginForm />);

    const visitorButton = screen.getByRole("button", { name: "Continue as visitor" });
    expect(visitorButton).toBeEnabled();
    expect(screen.getByText(/without sending a CMS bearer credential/i)).toBeVisible();

    fireEvent.submit(visitorButton.closest("form")!);
    await waitFor(() => expect(visitorAction).toHaveBeenCalledOnce());
  });
});
