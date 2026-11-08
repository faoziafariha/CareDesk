import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowUpRight,
  Search,
  Plus,
  Users,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  LogOut,
  ChevronRight,
  FileText,
  Paperclip,
  Check,
  Menu,
  RefreshCw,
} from "lucide-react";
import { call, demo, login, logout, watchUser } from "./api";
import { resetDemo } from "./demo";
import type {
  Role,
  User,
  Patient,
  Encounter,
  Note,
  Audit,
  Metric,
  Attachment,
} from "./types";
import "./style.css";
import CareNetwork, { networkPages } from "./network/CareNetwork";
const roles: Role[] = demo
  ? ["patient", "clinician", "pharmacist", "admin", "frontdesk"]
  : ["clinician", "frontdesk", "admin", "patient"];
const roleLabels: Record<Role, string> = {
  patient: "Patient",
  clinician: "Doctor",
  pharmacist: "Pharmacy",
  admin: "Super admin",
  frontdesk: "Front desk",
};
const demoUser = (role: Role): User => ({
  uid: `demo-${role}`,
  role,
  email: `${role}@caredesk.example`,
});
function App() {
  const [user, setUser] = useState<User | null>(
    demo ? demoUser("clinician") : null,
  );
  const [page, setPage] = useState(demo ? "Care network" : "Workspace");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [enc, setEnc] = useState<Encounter | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const clinical = user && ["clinician", "admin"].includes(user.role);
  useEffect(() => watchUser(setUser), []);
  async function task(fn: () => Promise<void>) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    if (!user) return;
    setPatients(await call(user, { action: "listPatients" }));
  }
  useEffect(() => {
    setSelected(null);
    setEnc(null);
    setText("");
    setPage(demo ? "Care network" : "Workspace");
    void task(refresh);
  }, [user]);
  async function openPatient(p: Patient) {
    if (!user) return;
    await task(async () => {
      setSelected(await call(user, { action: "getPatient", patientId: p.id }));
      setEnc(null);
      setNotes([]);
      setText("");
      setEncounters(
        await call(user, { action: "listEncounters", patientId: p.id }),
      );
      setAttachments(
        clinical || user.role === "patient"
          ? await call(user, { action: "listAttachments", patientId: p.id })
          : [],
      );
    });
  }
  async function openEncounter(e: Encounter) {
    await task(async () => {
      setEnc(e);
      setText("");
      setNotes(
        await call(user!, {
          action: "listNotes",
          patientId: selected!.id,
          encounterId: e.id,
        }),
      );
    });
  }
  async function navigate(p: string) {
    setPage(p);
    setMenu(false);
    if (p === "Audit trail")
      await task(async () =>
        setAudit(await call(user!, { action: "listAudit" })),
      );
    if (p === "AI operations")
      await task(async () =>
        setMetrics(await call(user!, { action: "listMetrics" })),
      );
  }
  if (!user)
    return (
      <main className="login">
        <div className="brand">
          <Activity /> CareDesk
        </div>
        <h1>
          A little more care.
          <br />A lot less friction.
        </h1>
        <p>Sign in to your clinic workspace.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void task(async () => {
              await login(String(f.get("email")), String(f.get("password")));
            });
          }}
        >
          <label>
            Email
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button disabled={busy}>
            Sign in <ArrowUpRight size={16} />
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        <small>Synthetic data only. Not for clinical use.</small>
      </main>
    );
  return (
    <div className="app">
      <aside className={menu ? "sidebar mobile-open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            void navigate(demo ? "Care network" : "Workspace");
          }}
        >
          <span>
            <Activity size={22} />
          </span>
          CareDesk<span className="brand-dot">®</span>
        </a>
        <div className="clinic">
          <div className="clinic-icon">N</div>
          <div>
            <b>{demo ? "CareDesk Network" : "Northstar Clinic"}</b>
            <small>Connected care workspace</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <span className="nav-label">YOUR WORKSPACE</span>
        <nav>
          {[
            ...(demo
              ? [
                  ["Care network", Activity],
                  ["Pharmacy registration", Plus],
                  ["Care coordination", ClipboardList],
                  ["Consent & privacy", ShieldCheck],
                ]
              : []),
            ["Workspace", Users],
            ...(user.role === "admin"
              ? [
                  ["Audit trail", ShieldCheck],
                  ["AI operations", Sparkles],
                ]
              : []),
          ].map(([name, Icon]) => (
            <button
              key={String(name)}
              className={page === name ? "nav active" : "nav"}
              onClick={() => void navigate(String(name))}
            >
              <Icon size={18} />
              {String(name)}
              {name === "Workspace" && <span>{patients.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="trust">
            <ShieldCheck size={19} />
            <b>Built with care.</b>
            <p>
              Access controlled. Activity audited.
              <br />
              Synthetic data, always.
            </p>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                e.preventDefault();
                setNotice(
                  "See README.md in the repository for architecture, security decisions, and deployment instructions.",
                );
              }}
            >
              Project documentation <ArrowUpRight size={13} />
            </a>
          </div>
          <div className="account">
            <div className="avatar">{user.role.slice(0, 2).toUpperCase()}</div>
            <div>
              <b>{demo ? "Demo workspace" : user.email}</b>
              <small>{user.role}</small>
            </div>
            {!demo && (
              <button
                className="icon"
                aria-label="Sign out"
                onClick={() => void logout()}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main">
        <header>
          <button
            className="icon menu"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <div>
            Clinic <ChevronRight size={13} /> <b>{page}</b>
          </div>
          <div className="header-right">
            <span className="status-dot" />
            {demo ? "Interactive demo" : "Firebase connected"}
            <span className="divider" />
            <ShieldCheck size={16} />
            <span>Secure workspace</span>
          </div>
        </header>
        <div className="demo-banner">
          <span>
            <b>
              {demo ? "A safe space to explore." : "Portfolio environment."}
            </b>{" "}
            All records are fictional.{" "}
            {demo
              ? "Changes stay in this browser."
              : "Never enter real patient information."}
          </span>
          {demo && (
            <label>
              View as{" "}
              <select
                aria-label="Demo role"
                value={user.role}
                onChange={(e) => setUser(demoUser(e.target.value as Role))}
              >
                {roles.map((r) => (
                  <option value={r} key={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <main>
          {!networkPages.includes(page) && (
            <div className="page-heading">
              <div>
                <div className="eyebrow">NORTHSTAR / CARE OPERATIONS</div>
                <h1>
                  {page === "Workspace" ? "Good care starts here." : page}
                </h1>
                <p>
                  {page === "Workspace"
                    ? "Your patients, encounters, and clinical notes. In one thoughtful workspace."
                    : page === "Audit trail"
                      ? "A traceable record of access and changes across the clinic."
                      : "Provider performance and usage, without storing clinical prompts."}
                </p>
              </div>
              {page === "Workspace" &&
                ["admin", "clinician", "frontdesk"].includes(user.role) && (
                  <button onClick={() => setModal(true)}>
                    <Plus size={16} /> Add patient
                  </button>
                )}
            </div>
          )}
          {error && (
            <div className="message error" role="alert">
              {error}
              <button className="icon" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {notice && (
            <div className="message" role="status">
              {notice}
              <button className="icon" onClick={() => setNotice("")}>
                ×
              </button>
            </div>
          )}
          {busy && (
            <div className="loading" role="status">
              Working…
            </div>
          )}
          {networkPages.includes(page) ? (
            <CareNetwork
              user={user}
              page={page}
              navigate={(p) => void navigate(p)}
            />
          ) : page === "Workspace" ? (
            <>
              <section className="stats">
                <div>
                  <span>
                    Patient directory <Users size={17} />
                  </span>
                  <strong>{String(patients.length).padStart(2, "0")}</strong>
                  <small>Records available to your role</small>
                </div>
                <div>
                  <span>
                    Current access <ShieldCheck size={17} />
                  </span>
                  <strong className="capitalize">{user.role}</strong>
                  <small>
                    Permissions enforced by the server in Firebase mode
                  </small>
                </div>
                <div className="accent-stat">
                  <span>
                    Clinical copilot <Sparkles size={17} />
                  </span>
                  <strong>More time for care.</strong>
                  <small>
                    {demo
                      ? "Explore a local SOAP draft template"
                      : "AI drafts require clinician review"}
                  </small>
                </div>
              </section>
              <section className="workspace">
                <div className="directory">
                  <div className="section-title">
                    <h2>
                      Patients <span>{patients.length}</span>
                    </h2>
                    <button
                      className="icon"
                      aria-label="Refresh patients"
                      disabled={busy}
                      onClick={() => void task(refresh)}
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search patients"
                      placeholder="Search name or record ID"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <kbd>⌕</kbd>
                  </label>
                  <div className="list-label">PATIENT / RECORD</div>
                  <div className="patient-list">
                    {patients
                      .filter((p) =>
                        `${p.name} ${p.id}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((p, i) => (
                        <button
                          className={`patient-row ${selected?.id === p.id ? "selected" : ""}`}
                          key={p.id}
                          onClick={() => void openPatient(p)}
                        >
                          <div className={`avatar color-${i % 4}`}>
                            {p.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div>
                            <b>{p.name}</b>
                            <small>
                              {p.id.slice(0, 12)} · {p.dob}
                            </small>
                          </div>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    {!patients.length && (
                      <p className="empty-small">
                        No records yet. Add your first synthetic patient.
                      </p>
                    )}
                  </div>
                  <div className="directory-footer">
                    <span className="status-dot" />
                    {demo ? "Browser-local demo" : "Audited patient access"}
                    <small>Up to 50 records</small>
                  </div>
                </div>
                <div className="detail">
                  {!selected ? (
                    <div className="empty">
                      <div className="empty-art">
                        <div className="mini-card">
                          <div className="avatar color-0">AM</div>
                          <div>
                            <i />
                            <i />
                          </div>
                          <Check size={15} />
                        </div>
                        <div className="art-note">
                          <ClipboardList size={23} />
                          <i />
                          <i />
                        </div>
                        <div className="spark">✦</div>
                      </div>
                      <span className="eyebrow">A CLEARER PICTURE OF CARE</span>
                      <h2>Every patient has a story.</h2>
                      <p>
                        Select a patient to view their encounters,
                        <br />
                        manage notes, and keep care moving.
                      </p>
                      <div className="empty-tags">
                        <span>
                          <ShieldCheck size={13} /> Role-based access
                        </span>
                        <span>
                          <FileText size={13} /> Audited records
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="patient-header">
                        <div className="avatar color-0">
                          {selected.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <h2>{selected.name}</h2>
                          <p>
                            {selected.dob} · {selected.id.slice(0, 12)}
                          </p>
                        </div>
                        <span className="pill">Synthetic record</span>
                      </div>
                      <div className="demographics">
                        <div>
                          <small>PHONE</small>
                          {selected.phone}
                        </div>
                        <div>
                          <small>ADDRESS</small>
                          {selected.address}
                        </div>
                      </div>
                      <div className="section-title">
                        <h3>Encounters</h3>
                        {clinical && (
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => {
                              const reason = window.prompt(
                                "Reason for this synthetic encounter:",
                              );
                              if (reason?.trim())
                                void task(async () => {
                                  await call(user, {
                                    action: "createEncounter",
                                    patientId: selected.id,
                                    reason,
                                  });
                                  await openPatient(selected);
                                });
                            }}
                          >
                            <Plus size={14} /> New encounter
                          </button>
                        )}
                      </div>
                      {encounters.length === 0 && (
                        <p className="empty-small">No encounters recorded.</p>
                      )}
                      {encounters.map((e) => (
                        <button
                          key={e.id}
                          className={`encounter ${enc?.id === e.id ? "chosen" : ""}`}
                          disabled={user.role === "frontdesk" || busy}
                          onClick={() => void openEncounter(e)}
                        >
                          <ClipboardList size={19} />
                          <div>
                            <b>{e.reason}</b>
                            <small>
                              {new Date(e.createdAt).toLocaleDateString()} ·{" "}
                              {e.status}
                            </small>
                          </div>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                      {user.role === "frontdesk" && (
                        <p className="helper">
                          Clinical notes are restricted to clinicians,
                          administrators, and the record’s patient.
                        </p>
                      )}
                      {enc && (
                        <div className="notes">
                          <div className="section-title">
                            <h3>Clinical notes</h3>
                            <span className="pill">{enc.status}</span>
                          </div>
                          {notes.map((n) => (
                            <article key={n.id}>
                              <small>
                                {n.authorId} ·{" "}
                                {new Date(n.createdAt).toLocaleString()}
                              </small>
                              <pre>{n.text}</pre>
                            </article>
                          ))}
                          {!notes.length && (
                            <p className="helper">
                              No notes recorded for this encounter.
                            </p>
                          )}
                          {clinical && enc.status === "open" && (
                            <>
                              <label htmlFor="note">Encounter note</label>
                              <textarea
                                id="note"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter fictional visit observations…"
                                rows={7}
                                maxLength={8000}
                              />
                              <p className="helper">
                                {demo
                                  ? "Demo uses a local template, not an LLM."
                                  : "External AI processing: use synthetic details only. Redaction is best effort."}{" "}
                                Review every draft before saving.
                              </p>
                              <div className="actions">
                                <button
                                  className="secondary"
                                  disabled={busy || !text.trim()}
                                  onClick={() =>
                                    void task(async () => {
                                      const r = await call(user, {
                                        action: "draftNote",
                                        patientId: selected.id,
                                        encounterId: enc.id,
                                        text,
                                      });
                                      setText(r.text);
                                      setNotice(
                                        `Draft prepared via ${r.provider}. Review before saving.`,
                                      );
                                    })
                                  }
                                >
                                  <Sparkles size={14} />{" "}
                                  {demo ? "Template draft" : "Draft with AI"}
                                </button>
                                <button
                                  disabled={busy || !text.trim()}
                                  onClick={() =>
                                    void task(async () => {
                                      await call(user, {
                                        action: "saveNote",
                                        patientId: selected.id,
                                        encounterId: enc.id,
                                        text,
                                      });
                                      setText("");
                                      setNotes(
                                        await call(user, {
                                          action: "listNotes",
                                          patientId: selected.id,
                                          encounterId: enc.id,
                                        }),
                                      );
                                      setNotice(
                                        "Note saved. It is now part of the audit trail.",
                                      );
                                    })
                                  }
                                >
                                  Save note
                                </button>
                                <button
                                  className="secondary"
                                  disabled={
                                    busy || !notes.length || !!text.trim()
                                  }
                                  onClick={() =>
                                    void task(async () => {
                                      await call(user, {
                                        action: "signEncounter",
                                        patientId: selected.id,
                                        encounterId: enc.id,
                                      });
                                      setEnc({ ...enc, status: "signed" });
                                      setEncounters(
                                        encounters.map((e) =>
                                          e.id === enc.id
                                            ? { ...e, status: "signed" }
                                            : e,
                                        ),
                                      );
                                      setNotice(
                                        "Encounter signed. Notes are locked.",
                                      );
                                    })
                                  }
                                >
                                  <Check size={14} /> Sign
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {(clinical || user.role === "patient") && (
                        <div className="attachments">
                          <div className="section-title">
                            <h3>
                              <Paperclip size={15} /> Documents
                            </h3>
                            {clinical && (
                              <label className="file-button">
                                Upload PDF
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  disabled={busy}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    if (f.size > 750000) {
                                      setError(
                                        "PDF must be smaller than 750 KB.",
                                      );
                                      return;
                                    }
                                    void task(async () => {
                                      const bytes = new Uint8Array(
                                        await f.arrayBuffer(),
                                      );
                                      if (
                                        new TextDecoder().decode(
                                          bytes.slice(0, 5),
                                        ) !== "%PDF-"
                                      )
                                        throw new Error("Choose a valid PDF.");
                                      let binary = "";
                                      for (const b of bytes)
                                        binary += String.fromCharCode(b);
                                      await call(user, {
                                        action: "uploadAttachment",
                                        patientId: selected.id,
                                        name: f.name,
                                        base64: btoa(binary),
                                      });
                                      setAttachments(
                                        await call(user, {
                                          action: "listAttachments",
                                          patientId: selected.id,
                                        }),
                                      );
                                    });
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>
                          {attachments.length === 0 && (
                            <p className="helper">
                              No documents attached. Synthetic PDFs only, up to
                              750 KB.
                            </p>
                          )}
                          {attachments.map((a) => (
                            <button
                              className="document"
                              key={a.id}
                              disabled={busy}
                              onClick={() =>
                                void task(async () => {
                                  const { url } = await call(user, {
                                    action: "getAttachment",
                                    patientId: selected.id,
                                    attachmentId: a.id,
                                  });
                                  if (demo) {
                                    const response = await fetch(url);
                                    const blob = await response.blob();
                                    const object = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = object;
                                    link.download = a.name;
                                    link.click();
                                    setTimeout(
                                      () => URL.revokeObjectURL(object),
                                      1000,
                                    );
                                  } else {
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.target = "_blank";
                                    link.rel = "noopener noreferrer";
                                    link.click();
                                  }
                                })
                              }
                            >
                              <FileText size={14} />
                              {a.name}
                              <ArrowUpRight size={14} />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            </>
          ) : page === "Audit trail" ? (
            <section className="panel">
              <div className="section-title">
                <h2>Recent activity</h2>
                <span className="pill">Latest 100 events</span>
              </div>
              <label className="search">
                <Search size={16} />
                <input
                  aria-label="Filter audit trail"
                  placeholder="Filter by actor, patient, or action"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </label>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Patient</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit
                      .filter((a) =>
                        JSON.stringify(a)
                          .toLowerCase()
                          .includes(filter.toLowerCase()),
                      )
                      .map((a) => (
                        <tr key={a.id}>
                          <td>{new Date(a.createdAt).toLocaleString()}</td>
                          <td>{a.actor}</td>
                          <td>{a.action}</td>
                          <td>{a.patientId}</td>
                          <td>
                            <span className="pill">{a.outcome}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!audit.length && (
                <p>
                  No activity yet. Open a patient record to generate an event.
                </p>
              )}
              <h3>Role administration</h3>
              <form
                className="role-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void task(async () => {
                    await call(user, {
                      action: "setRole",
                      uid: String(f.get("uid")),
                      role: String(f.get("role")),
                    });
                    setNotice(
                      "Role assigned. The user must sign in again to refresh claims.",
                    );
                  });
                }}
              >
                <input
                  aria-label="Firebase user UID"
                  name="uid"
                  placeholder="Firebase user UID"
                  required
                />
                <select name="role" aria-label="Assign role">
                  {roles.map((r) => (
                    <option value={r} key={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
                <button disabled={busy || demo}>Assign role</button>
              </form>
              {demo && (
                <p className="helper">
                  Role assignment is available only in authenticated Firebase
                  mode.
                </p>
              )}
            </section>
          ) : (
            <section className="panel">
              <div className="stats">
                <div>
                  <span>Provider attempts</span>
                  <strong>{metrics.length}</strong>
                  <small>Latest 100 attempts</small>
                </div>
                <div>
                  <span>Success rate</span>
                  <strong>
                    {metrics.length
                      ? Math.round(
                          (metrics.filter((m) => m.status === "success")
                            .length /
                            metrics.length) *
                            100,
                        ) + "%"
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>p95 latency</span>
                  <strong>
                    {metrics.length
                      ? [...metrics].sort((a, b) => a.latencyMs - b.latencyMs)[
                          Math.ceil(metrics.length * 0.95) - 1
                        ].latencyMs + " ms"
                      : "—"}
                  </strong>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Model</th>
                      <th>Latency</th>
                      <th>Tokens</th>
                      <th>Cost (USD)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => (
                      <tr key={m.id}>
                        <td>{m.provider}</td>
                        <td>{m.model}</td>
                        <td>{m.latencyMs} ms</td>
                        <td>{m.tokens}</td>
                        <td>
                          {m.costUsd === null
                            ? "Unavailable"
                            : m.costUsd.toFixed(6)}
                        </td>
                        <td>{m.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!metrics.length && (
                <div className="empty-small">
                  <Sparkles />
                  <h3>No provider requests yet.</h3>
                  <p>
                    {demo
                      ? "Local templates make no API calls and create no fabricated usage metrics."
                      : "Draft a note with AI to record real provider attempts."}
                  </p>
                </div>
              )}
            </section>
          )}
          <footer>
            <span>
              CareDesk <span className="footer-dot">·</span> Thoughtful software
              for better care.
            </span>
            <span>
              Portfolio project · Not for clinical use{" "}
              {demo && (
                <button
                  className="text-button"
                  onClick={() => {
                    if (confirm("Reset all browser demo records?")) {
                      resetDemo();
                      setSelected(null);
                      setEnc(null);
                      void task(refresh);
                    }
                  }}
                >
                  Reset demo
                </button>
              )}
            </span>
          </footer>
        </main>
      </div>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-title">A new patient story.</h2>
            <p>Add a fictional record to your workspace.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void task(async () => {
                  await call(user, {
                    action: "createPatient",
                    patient: {
                      name: String(f.get("name")),
                      dob: String(f.get("dob")),
                      phone: String(f.get("phone")),
                      address: String(f.get("address")),
                      patientUid: String(f.get("patientUid")) || undefined,
                    },
                  });
                  setModal(false);
                  await refresh();
                });
              }}
            >
              <label>
                Full name
                <input name="name" required maxLength={100} autoFocus />
              </label>
              <label>
                Date of birth
                <input
                  name="dob"
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                />
              </label>
              <label>
                Phone
                <input name="phone" required maxLength={40} />
              </label>
              <label>
                Address
                <input name="address" required maxLength={200} />
              </label>
              {user.role === "admin" && (
                <label>
                  Patient Auth UID (optional)
                  <input name="patientUid" maxLength={128} />
                </label>
              )}
              <div className="actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setModal(false)}
                >
                  Cancel
                </button>
                <button disabled={busy}>Create patient</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
