import type { User } from "../types";
import { canAccessNetwork, type NetworkState } from "./store";
export type TimelineEntry = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  date: string;
  status: string;
};
export function patientTimeline(
  state: NetworkState,
  user: User,
  patientId: string,
): TimelineEntry[] {
  if (!canAccessNetwork(state, user, patientId)) return [];
  return [
    ...state.reports
      .filter((r) => r.patientId === patientId)
      .map((r) => ({
        id: r.id,
        kind: "Patient report",
        title: `${r.kind}: ${r.value}`,
        detail: r.note,
        date: r.createdAt,
        status: "Self-reported",
      })),
    ...state.prescriptions
      .filter((r) => r.patientId === patientId)
      .map((r) => ({
        id: r.id,
        kind: "Prescription",
        title: r.medication,
        detail: r.instructions,
        date: r.createdAt,
        status: "Training record",
      })),
    ...state.interventions
      .filter((r) => r.patientId === patientId)
      .map((r) => ({
        id: r.id,
        kind: "Intervention",
        title: r.category,
        detail: r.note,
        date: r.createdAt,
        status: r.status,
      })),
    ...state.goals
      .filter((r) => r.patientId === patientId)
      .map((r) => ({
        id: r.id,
        kind: "Care goal",
        title: r.title,
        detail: r.description,
        date: r.createdAt,
        status: r.status,
      })),
    ...state.appointments
      .filter((r) => r.patientId === patientId)
      .map((r) => ({
        id: r.id,
        kind: "Appointment",
        title: r.title,
        detail: `${r.mode}. ${r.note}`,
        date: r.scheduledAt,
        status: r.status,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}
export function timelineCsv(entries: TimelineEntry[]) {
  const cell = (value: string) => {
    const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [
    "Type,Title,Details,Date,Status",
    ...entries.map((r) =>
      [r.kind, r.title, r.detail, r.date, r.status].map(cell).join(","),
    ),
  ].join("\r\n");
}
