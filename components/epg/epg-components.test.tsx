import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEpgAction: vi.fn(),
  updateEpgAction: vi.fn(),
  deleteEpgAction: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/components/epg/actions", () => ({
  createEpgAction: mocks.createEpgAction,
  updateEpgAction: mocks.updateEpgAction,
  deleteEpgAction: mocks.deleteEpgAction,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

import { DeleteEpgForm } from "@/components/epg/delete-epg-form";
import { EpgForm } from "@/components/epg/epg-form";
import { EpgNavigation } from "@/components/epg/epg-navigation";
import { EpgSchedule } from "@/components/epg/epg-schedule";
import { localDayWindow } from "@/components/epg/time";
import type { EpgProgram, LiveChannel } from "@/lib/types";

const scheduleWindow = {
  date: "2026-07-13",
  windowStart: "2026-07-12T21:00:00.000Z",
  windowEnd: "2026-07-13T21:00:00.000Z",
};
const program: EpgProgram = {
  id: "program-1",
  channelId: "channel-1",
  programName: "Morning News",
  startTime: "2026-07-13T06:00:00.000Z",
  endTime: "2026-07-13T07:00:00.000Z",
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
};
const channels: LiveChannel[] = [
  { id: "channel-1", name: "Saat News", slug: "saat-news", createdAt: "", updatedAt: "" },
  { id: "channel/two", name: "Saat Sports", slug: "saat-sports", createdAt: "", updatedAt: "" },
];

function expectedSchedulePath(channelId: string, date: string) {
  const window = localDayWindow(date)!;
  return `/channels/${encodeURIComponent(channelId)}/epg?${new URLSearchParams({ date, ...window })}`;
}

describe("EPG forms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createEpgAction.mockResolvedValue({ status: "idle" });
    mocks.updateEpgAction.mockResolvedValue({ status: "idle" });
    mocks.deleteEpgAction.mockResolvedValue({ status: "idle" });
  });

  it("preserves every submitted create field after an overlap error", async () => {
    mocks.createEpgAction.mockResolvedValueOnce({
      status: "error",
      errorCode: "EPG_SCHEDULE_OVERLAP",
      message: "This program overlaps another schedule entry.",
    });
    const { container } = render(<EpgForm channelId="channel-1" window={scheduleWindow} />);

    fireEvent.change(screen.getByLabelText("Program name"), { target: { value: "Breakfast Show" } });
    fireEvent.change(screen.getByLabelText("Starts (your local time)"), { target: { value: "2026-07-13T11:15" } });
    fireEvent.change(screen.getByLabelText("Ends (your local time)"), { target: { value: "2026-07-13T12:30" } });
    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("EPG_SCHEDULE_OVERLAP");
    expect(screen.getByLabelText("Program name")).toHaveValue("Breakfast Show");
    expect(screen.getByLabelText("Starts (your local time)")).toHaveValue("2026-07-13T11:15");
    expect(screen.getByLabelText("Ends (your local time)")).toHaveValue("2026-07-13T12:30");
    const submitted = mocks.createEpgAction.mock.calls[0][1] as FormData;
    expect(submitted.get("programName")).toBe("Breakfast Show");
  });

  it("includes the ETag and links back to the exact edit page on conflict", async () => {
    mocks.updateEpgAction.mockResolvedValueOnce({
      status: "error",
      errorCode: "EPG_WRITE_CONFLICT",
      message: "The program changed while you were editing it.",
    });
    const { container } = render(
      <EpgForm channelId="channel-1" program={program} etag={'"program-v4"'} window={scheduleWindow} />,
    );

    fireEvent.change(screen.getByLabelText("Program name"), { target: { value: "Updated News" } });
    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("EPG_WRITE_CONFLICT");
    expect(screen.getByLabelText("Program name")).toHaveValue("Updated News");
    expect(container.querySelector('input[name="etag"]')).toHaveValue('"program-v4"');
    expect(screen.getByRole("link", { name: "Reload latest program" })).toHaveAttribute(
      "href",
      `/channels/channel-1/epg/program-1/edit?${new URLSearchParams(scheduleWindow)}`,
    );
    const submitted = mocks.updateEpgAction.mock.calls[0][1] as FormData;
    expect(submitted.get("programName")).toBe("Updated News");
  });

  it("cancels or submits program deletion according to confirmation", async () => {
    const confirm = vi.spyOn(window, "confirm");
    const { container } = render(
      <DeleteEpgForm channelId="channel-1" programId="program-1" programName="Morning News" {...scheduleWindow} />,
    );
    const form = container.querySelector("form")!;

    confirm.mockReturnValueOnce(false);
    fireEvent.submit(form);
    expect(mocks.deleteEpgAction).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.submit(form);
    await waitFor(() => expect(mocks.deleteEpgAction).toHaveBeenCalledOnce());
  });
});

describe("EPG navigation and schedule", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves between days, selected dates, and channels with exact local windows", () => {
    render(<EpgNavigation channels={channels} channelId="channel-1" {...scheduleWindow} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(mocks.push).toHaveBeenLastCalledWith(expectedSchedulePath("channel-1", "2026-07-12"));

    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(mocks.push).toHaveBeenLastCalledWith(expectedSchedulePath("channel-1", "2026-07-14"));

    fireEvent.change(screen.getByLabelText("Schedule date"), { target: { value: "2026-08-01" } });
    expect(mocks.push).toHaveBeenLastCalledWith(expectedSchedulePath("channel-1", "2026-08-01"));

    fireEvent.change(screen.getByLabelText("Channel"), { target: { value: "channel/two" } });
    expect(mocks.push).toHaveBeenLastCalledWith(expectedSchedulePath("channel/two", "2026-07-13"));
  });

  it("replaces stale window parameters with the selected local day window", async () => {
    render(
      <EpgNavigation
        channels={channels}
        channelId="channel-1"
        date="2026-07-13"
        windowStart="2000-01-01T00:00:00.000Z"
        windowEnd="2000-01-02T00:00:00.000Z"
      />,
    );

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith(expectedSchedulePath("channel-1", "2026-07-13"));
    });
  });

  it("shows an empty state and otherwise sorts programs chronologically", () => {
    const { rerender } = render(<EpgSchedule programs={[]} channelId="channel-1" window={scheduleWindow} />);
    expect(screen.getByText("No programs on this day")).toBeInTheDocument();

    const later = { ...program, id: "later", programName: "Late Show", startTime: "2026-07-13T09:00:00.000Z", endTime: "2026-07-13T10:30:00.000Z" };
    const earlier = { ...program, id: "earlier", programName: "Early Show", startTime: "2026-07-13T05:00:00.000Z", endTime: "2026-07-13T05:30:00.000Z" };
    rerender(<EpgSchedule programs={[later, earlier]} channelId="channel-1" window={scheduleWindow} />);

    const articles = screen.getAllByRole("article");
    expect(within(articles[0]).getByText("Early Show")).toBeInTheDocument();
    expect(within(articles[1]).getByText("Late Show")).toBeInTheDocument();
    expect(within(articles[1]).getByText("1h 30m")).toBeInTheDocument();
    expect(within(articles[0]).getByRole("link", { name: "Edit Early Show" })).toHaveAttribute(
      "href",
      `/channels/channel-1/epg/earlier/edit?${new URLSearchParams(scheduleWindow)}`,
    );
  });
});
