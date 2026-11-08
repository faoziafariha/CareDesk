import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  Flag,
  Search,
} from "lucide-react";
import type { User } from "../types";
import type {
  NetworkState,
  NetworkAction,
  Appointment,
  CareGoal,
} from "./store";
import { patientTimeline, timelineCsv } from "./journey";
export const journeyTabs = [
  "Care overview",
  "Care plans",
  "Appointments",
  "Care timeline",
];
const date = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export default function CareJourney({
  state,
  user,
  patientId,
  tab,
  onAction,
}: {
  state: NetworkState;
  user: User;
  patientId: string;
  tab: string;
  onAction: (action: NetworkAction, message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [goal, setGoal] = useState({ title: "", description: "", dueDate: "" });
  const [booking, setBooking] = useState({
    title: "",
    mode: "Video" as Appointment["mode"],
    scheduledAt: "",
    note: "",
  });
  const goals = state.goals.filter((g) => g.patientId === patientId);
  const appointments = state.appointments.filter(
    (a) => a.patientId === patientId,
  );
  const profile = state.profiles.find((p) => p.patientId === patientId);
  const timeline = patientTimeline(state, user, patientId);
  const matches = (value: unknown) =>
    JSON.stringify(value).toLowerCase().includes(query.toLowerCase());
  const shownGoals = goals.filter(
    (g) => (filter === "all" || g.status === filter) && matches(g),
  );
  const shownAppointments = appointments
    .filter((a) => (filter === "all" || a.status === filter) && matches(a))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const shownTimeline = timeline.filter(
    (t) => (filter === "all" || t.kind === filter) && matches(t),
  );
  function exportTimeline() {
    const blob = new Blob([timelineCsv(shownTimeline)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `synthetic-${patientId}-timeline.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="journey-details">
      {tab === "Care overview" ? (
        <>
          <div className="profile-banner">
            <div>
              <span className="eyebrow">FICTIONAL CARE PROFILE</span>
              <h2>{profile?.careFocus || "Care planning"}</h2>
              <p>
                {profile?.careNote ||
                  "No additional coordination preference recorded."}
              </p>
            </div>
            <span className="pill">Training scenario</span>
          </div>
          <div className="profile-grid">
            <section className="network-panel">
              <h3>Care coordination preferences</h3>
              <dl>
                <div>
                  <dt>Coordinator</dt>
                  <dd>{profile?.careCoordinator || "Not assigned"}</dd>
                </div>
                <div>
                  <dt>Preferred contact</dt>
                  <dd>{profile?.preferredContact || "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>{profile?.language || "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Enrolled</dt>
                  <dd>
                    {profile
                      ? new Date(profile.enrolledAt).toLocaleDateString()
                      : "Not recorded"}
                  </dd>
                </div>
              </dl>
              <p className="network-subtle">
                These are fictional coordination preferences, not a verified
                diagnosis, clinical plan or live contact channel.
              </p>
            </section>
            <section className="network-panel">
              <h3>Planning progress</h3>
              <div className="planning-progress">
                <strong>
                  {goals.filter((g) => g.status === "completed").length}
                  <span> / {goals.length}</span>
                </strong>
                <span>care tasks completed</span>
              </div>
              <progress
                aria-label="Completed care tasks"
                value={goals.filter((g) => g.status === "completed").length}
                max={Math.max(1, goals.length)}
              />
              <p className="network-subtle">
                Task completion only. This is not a health score or measure of
                treatment effectiveness.
              </p>
              <div className="overview-next">
                <CalendarDays size={17} />
                <span>
                  {
                    appointments.filter(
                      (a) =>
                        a.status === "scheduled" || a.status === "requested",
                    ).length
                  }{" "}
                  planned or requested visits
                </span>
              </div>
            </section>
          </div>
          <section className="network-panel overview-topics">
            <h3>Make your next conversation useful</h3>
            <div>
              {[
                [
                  "Your observations",
                  "Describe what changed, when it happened and questions you want to ask.",
                ],
                [
                  "Your medication record",
                  "Bring the original list or packaging for the care team to reconcile.",
                ],
                [
                  "Your sharing choices",
                  "Review which example care portals you have allowed to see this vault.",
                ],
              ].map(([title, text]) => (
                <article key={title}>
                  <CheckCircle2 size={17} />
                  <h4>{title}</h4>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="journey-toolbar">
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Search care records"
                placeholder={`Search ${tab.toLowerCase()}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter care records"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">
                All {tab === "Care timeline" ? "record types" : "statuses"}
              </option>
              {(tab === "Care plans"
                ? ["planned", "in-progress", "completed"]
                : tab === "Appointments"
                  ? ["requested", "scheduled", "completed", "cancelled"]
                  : [
                      "Patient report",
                      "Prescription",
                      "Intervention",
                      "Care goal",
                      "Appointment",
                    ]
              ).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {tab === "Care timeline" && (
              <button
                className="secondary"
                onClick={exportTimeline}
                disabled={!shownTimeline.length}
              >
                <Download size={14} /> Export filtered CSV
              </button>
            )}
          </div>
          {tab === "Care timeline" ? (
            <section className="network-panel">
              <div className="network-section-heading">
                <h2>Care timeline</h2>
                <span className="pill">{shownTimeline.length} records</span>
              </div>
              <p className="network-subtle">
                A combined view of fictional care records and appointments. This
                is not a security audit log.
              </p>
              {shownTimeline.map((r) => (
                <article className="timeline-entry" key={`${r.kind}-${r.id}`}>
                  <div className="timeline-dot" />
                  <div>
                    <span>
                      {r.kind} · {date(r.date)}
                    </span>
                    <h3>{r.title}</h3>
                    <p>{r.detail}</p>
                    <span className="pill">{r.status}</span>
                  </div>
                </article>
              ))}
              {!shownTimeline.length && (
                <p className="empty-small">No records match these filters.</p>
              )}
            </section>
          ) : (
            <div className="care-record-layout">
              <section className="network-panel">
                <div className="network-section-heading">
                  <h2>{tab}</h2>
                  <span className="pill">
                    {tab === "Care plans"
                      ? shownGoals.length
                      : shownAppointments.length}{" "}
                    matching
                  </span>
                </div>
                {tab === "Care plans" ? (
                  <>
                    {shownGoals.map((g) => (
                      <article className="care-record" key={g.id}>
                        <div>
                          <Flag size={18} />
                          <h3>{g.title}</h3>
                          <span
                            className={`network-badge ${g.status === "completed" ? "active" : "pending"}`}
                          >
                            {g.status}
                          </span>
                        </div>
                        <p>{g.description}</p>
                        <small>
                          Due {g.dueDate} · {g.author}
                        </small>
                        <label className="record-status">
                          Task status
                          <select
                            aria-label={`Status for ${g.title}`}
                            value={g.status}
                            onChange={(e) =>
                              onAction(
                                {
                                  type: "setGoalStatus",
                                  patientId,
                                  goalId: g.id,
                                  status: e.target.value as CareGoal["status"],
                                },
                                "Care task updated.",
                              )
                            }
                          >
                            <option value="planned">Planned</option>
                            <option value="in-progress">In progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </label>
                      </article>
                    ))}
                    {!shownGoals.length && (
                      <p className="empty-small">
                        No care tasks match these filters.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {shownAppointments.map((a) => (
                      <article className="care-record" key={a.id}>
                        <div>
                          <CalendarDays size={18} />
                          <h3>{a.title}</h3>
                          <span
                            className={`network-badge ${a.status === "completed" ? "active" : a.status === "cancelled" ? "rejected" : "pending"}`}
                          >
                            {a.status}
                          </span>
                        </div>
                        <strong>{date(a.scheduledAt)}</strong>
                        <small>
                          {a.mode} · {a.author}
                        </small>
                        <p>{a.note}</p>
                        {(a.status === "scheduled" ||
                          a.status === "requested") && (
                          <div className="actions">
                            {user.role !== "patient" &&
                              a.status === "requested" && (
                                <button
                                  className="secondary"
                                  onClick={() =>
                                    onAction(
                                      {
                                        type: "setAppointmentStatus",
                                        patientId,
                                        appointmentId: a.id,
                                        status: "scheduled",
                                      },
                                      "Appointment confirmed in this browser. No invitation was sent.",
                                    )
                                  }
                                >
                                  Confirm
                                </button>
                              )}
                            {user.role !== "patient" && (
                              <button
                                className="secondary"
                                onClick={() =>
                                  onAction(
                                    {
                                      type: "setAppointmentStatus",
                                      patientId,
                                      appointmentId: a.id,
                                      status: "completed",
                                    },
                                    "Appointment marked complete.",
                                  )
                                }
                              >
                                <CheckCircle2 size={13} /> Complete
                              </button>
                            )}
                            <button
                              className="network-reject"
                              onClick={() =>
                                onAction(
                                  {
                                    type: "setAppointmentStatus",
                                    patientId,
                                    appointmentId: a.id,
                                    status: "cancelled",
                                  },
                                  "Appointment cancelled in this demo.",
                                )
                              }
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                    {!shownAppointments.length && (
                      <p className="empty-small">
                        No appointments match these filters.
                      </p>
                    )}
                  </>
                )}
              </section>
              <section className="network-panel network-entry">
                <h2>
                  {tab === "Care plans"
                    ? "Add a care task"
                    : "Request / schedule a visit"}
                </h2>
                <p className="network-subtle">
                  {tab === "Care plans"
                    ? "Track coordination tasks and patient goals. No treatment advice is generated."
                    : "Local demo booking only. No calendar invitation, call, or video session is created."}
                </p>
                {tab === "Care plans" ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onAction(
                        { type: "addGoal", patientId, ...goal },
                        "Care task added to the fictional plan.",
                      );
                    }}
                  >
                    <label>
                      Task title
                      <input
                        required
                        maxLength={120}
                        value={goal.title}
                        onChange={(e) =>
                          setGoal({ ...goal, title: e.target.value })
                        }
                        placeholder="e.g. Prepare my visit questions"
                      />
                    </label>
                    <label>
                      Details
                      <textarea
                        required
                        maxLength={1000}
                        rows={4}
                        value={goal.description}
                        onChange={(e) =>
                          setGoal({ ...goal, description: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Due date
                      <input
                        type="date"
                        required
                        value={goal.dueDate}
                        onChange={(e) =>
                          setGoal({ ...goal, dueDate: e.target.value })
                        }
                      />
                    </label>
                    <button type="submit" className="network-wide">
                      Add care task
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onAction(
                        {
                          type: "bookAppointment",
                          patientId,
                          ...booking,
                          scheduledAt: new Date(
                            booking.scheduledAt,
                          ).toISOString(),
                        },
                        user.role === "patient"
                          ? "Visit request saved. The care team can confirm it."
                          : "Visit scheduled locally. No external invitation was sent.",
                      );
                    }}
                  >
                    <label>
                      Visit purpose
                      <input
                        required
                        maxLength={120}
                        value={booking.title}
                        onChange={(e) =>
                          setBooking({ ...booking, title: e.target.value })
                        }
                        placeholder="e.g. Care-plan follow-up"
                      />
                    </label>
                    <label>
                      Visit format
                      <select
                        value={booking.mode}
                        onChange={(e) =>
                          setBooking({
                            ...booking,
                            mode: e.target.value as Appointment["mode"],
                          })
                        }
                      >
                        {["Video", "Telephone", "In person"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Preferred date and time
                      <input
                        type="datetime-local"
                        required
                        value={booking.scheduledAt}
                        onChange={(e) =>
                          setBooking({
                            ...booking,
                            scheduledAt: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Coordination note (optional)
                      <textarea
                        maxLength={1000}
                        rows={3}
                        value={booking.note}
                        onChange={(e) =>
                          setBooking({ ...booking, note: e.target.value })
                        }
                      />
                    </label>
                    <button type="submit" className="network-wide">
                      {user.role === "patient"
                        ? "Request visit"
                        : "Schedule visit"}
                    </button>
                  </form>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </section>
  );
}
