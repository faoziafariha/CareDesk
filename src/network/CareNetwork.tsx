import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  HeartPulse,
  LockKeyhole,
  Pill,
  Plus,
  Search as SearchIcon,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import fixtures from "../../fixtures/clinic.json";
import type { User } from "../types";
import {
  canAccessNetwork,
  checkDemoCode,
  issueDemoCode,
  readDraft,
  readNetwork,
  saveNetwork,
  updateNetwork,
  validateRegistration,
  writeDraft,
  type Challenge,
  type NetworkAction,
  type RegistrationDraft,
} from "./store";
import "./network.css";
import CareJourney, { journeyTabs } from "./CareJourney";
const emptyRegistration: RegistrationDraft = {
  name: "",
  contact: "",
  email: "",
  phone: "",
  address: "",
  license: "",
};
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const portalNames: Record<string, string> = {
  admin: "Super admin",
  clinician: "Doctor",
  pharmacist: "Pharmacy",
  patient: "Patient",
  frontdesk: "Front desk",
};
export const networkPages = [
  "Care network",
  "Pharmacy registration",
  "Care coordination",
  "Consent & privacy",
];
export default function CareNetwork({
  user,
  page,
  navigate,
}: {
  user: User;
  page: string;
  navigate: (page: string) => void;
}) {
  const [state, setState] = useState(readNetwork);
  const [recordQuery, setRecordQuery] = useState("");
  const [pharmacyQuery, setPharmacyQuery] = useState("");
  const [pharmacyStatus, setPharmacyStatus] = useState("all");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [patientId, setPatientId] = useState("p-1001");
  const [tab, setTab] = useState("Care overview");
  const draftKey = `caredesk-registration-draft:${user.uid}`;
  const challengeKey = `${draftKey}:challenge`;
  const [draft, setDraft] = useState(() =>
    readDraft(draftKey, emptyRegistration),
  );
  const [challenge, setChallenge] = useState<Challenge | null>(() =>
    readDraft<Challenge | null>(challengeKey, null),
  );
  const [code, setCode] = useState("");
  const [receipt, setReceipt] = useState("");
  const [time, setTime] = useState(Date.now());
  const [clinicalDraft, setClinicalDraft] = useState({
    kind: "Wellbeing",
    value: "",
    note: "",
    medication: "",
    instructions: "",
    category: "Adherence check-in",
  });
  useEffect(() => {
    setDraft(readDraft(draftKey, emptyRegistration));
    setChallenge(readDraft<Challenge | null>(challengeKey, null));
    setCode("");
    setReceipt("");
    setNotice("");
    setError("");
    setPatientId("p-1001");
    setClinicalDraft({
      kind: "Wellbeing",
      value: "",
      note: "",
      medication: "",
      instructions: "",
      category: "Adherence check-in",
    });
  }, [draftKey, challengeKey]);
  // No blur/focus/visibility handler resets either form. Persist on every edit.
  useEffect(() => {
    const timer = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === "caredesk-network-v1") setState(readNetwork());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const accessible = fixtures.patients.filter((p) =>
    canAccessNetwork(state, user, p.id),
  );
  const selected = accessible.find((p) => p.id === patientId) || accessible[0];
  const matchesRecord = (row: unknown) =>
    JSON.stringify(row).toLowerCase().includes(recordQuery.toLowerCase());
  const reports = state.reports.filter(
    (r) => r.patientId === selected?.id && matchesRecord(r),
  );
  const prescriptions = state.prescriptions.filter(
    (r) => r.patientId === selected?.id && matchesRecord(r),
  );
  const interventions = state.interventions.filter(
    (r) => r.patientId === selected?.id && matchesRecord(r),
  );
  const tabCounts: Record<string, number | undefined> = {
    "Patient reports": reports.length,
    Prescriptions: prescriptions.length,
    Interventions: interventions.length,
    "Care plans": state.goals.filter((g) => g.patientId === selected?.id)
      .length,
    Appointments: state.appointments.filter((a) => a.patientId === selected?.id)
      .length,
  };
  const visiblePharmacies = state.pharmacies.filter(
    (p) =>
      (pharmacyStatus === "all" || p.status === pharmacyStatus) &&
      JSON.stringify(p).toLowerCase().includes(pharmacyQuery.toLowerCase()),
  );
  const active = state.pharmacies.filter((p) => p.status === "active").length;
  const pending = state.pharmacies.filter((p) => p.status === "pending").length;
  const myConsent = state.consents.find((c) => c.patientId === "p-1001");
  function attempt(fn: () => void) {
    setError("");
    setNotice("");
    try {
      fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed. Please retry.");
    }
  }
  function mutate(action: NetworkAction, message: string) {
    attempt(() => {
      const next = updateNetwork(readNetwork(), user, action);
      saveNetwork(next);
      setState(next);
      setNotice(message);
    });
  }
  function editRegistration(field: keyof RegistrationDraft, value: string) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    writeDraft(draftKey, next);
    if (field === "phone") {
      setChallenge(null);
      localStorage.removeItem(challengeKey);
      setCode("");
    }
  }
  function sendCode() {
    attempt(() => {
      const valid = validateRegistration(draft);
      const next = issueDemoCode(valid.phone, challenge);
      setChallenge(next);
      writeDraft(challengeKey, next);
      setNotice(
        "Demo verification code generated. No SMS has been sent; use the code shown in the verification panel.",
      );
    });
  }
  function register() {
    attempt(() => {
      let verified: Challenge;
      try {
        verified = checkDemoCode(challenge, code, draft.phone);
      } catch (e) {
        if (challenge) {
          const next = { ...challenge, attempts: challenge.attempts + 1 };
          setChallenge(next);
          writeDraft(challengeKey, next);
        }
        throw e;
      }
      const next = updateNetwork(readNetwork(), user, {
        type: "register",
        draft,
        challenge: verified,
      });
      saveNetwork(next);
      setState(next);
      const item = next.pharmacies[0];
      setReceipt(item.reference);
      setNotice(
        `Registration received: ${item.reference}. Status: awaiting super admin review. No email or SMS was sent.`,
      );
      localStorage.removeItem(draftKey);
      localStorage.removeItem(challengeKey);
      setDraft(emptyRegistration);
      setChallenge(null);
      setCode("");
    });
  }
  const cooldown = challenge
    ? Math.max(0, Math.ceil((challenge.resendAt - time) / 1000))
    : 0;
  const canRegister = ["admin", "pharmacist"].includes(user.role);
  return (
    <div className="network">
      <div className="network-context">
        <span>
          <span className="status-dot" /> {portalNames[user.role]} portal
        </span>
        <span>Interactive care-network prototype · synthetic data only</span>
      </div>
      {notice && (
        <div className="network-message" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            className="icon"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="network-message network-error" role="alert">
          {error}
          <button
            className="icon"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}
      {page === "Care network" && (
        <>
          <section className="network-hero">
            <div>
              <span className="network-kicker">
                <HeartPulse size={15} /> CONNECTED CARE, CENTERED ON YOU
              </span>
              <h2>
                Better together.
                <br />
                <em>Healthier every day.</em>
              </h2>
              <p>
                One connected space for patients, doctors, and pharmacies. Help
                people manage their conditions with care that continues between
                visits.
              </p>
              <div className="network-hero-actions">
                <button
                  onClick={() =>
                    navigate(
                      user.role === "admin"
                        ? "Pharmacy registration"
                        : "Care coordination",
                    )
                  }
                >
                  {user.role === "admin"
                    ? "Manage pharmacy network"
                    : "Open care workspace"}
                  <ArrowUpRight size={16} />
                </button>
                <button
                  className="network-ghost"
                  onClick={() => navigate("Consent & privacy")}
                >
                  <ShieldCheck size={15} /> Explore patient controls
                </button>
              </div>
              <div className="network-hero-foot">
                <span>
                  <Check size={13} /> Patient-controlled sharing
                </span>
                <span>
                  <Check size={13} /> Human-reviewed care
                </span>
              </div>
            </div>
            <div
              className="vault-visual"
              aria-label="Illustration of a connected patient vault"
            >
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="vault-center">
                <div>
                  <ShieldCheck size={31} />
                </div>
                <b>My health vault</b>
                <small>My data. My choice.</small>
                <span className="pill">SYNTHETIC DEMO</span>
              </div>
              <div className="orbit-card card-doctor">
                <Stethoscope size={20} />
                <span>
                  Doctor<small>Prescribe & coordinate</small>
                </span>
                <span className="orbit-check">✓</span>
              </div>
              <div className="orbit-card card-pharmacy">
                <Pill size={20} />
                <span>
                  Pharmacy<small>Support & follow up</small>
                </span>
                <span className="orbit-check">✓</span>
              </div>
              <div className="orbit-card card-patient">
                <HeartPulse size={20} />
                <span>
                  Patient<small>Report & stay involved</small>
                </span>
              </div>
            </div>
          </section>
          <section className="network-stats">
            {user.role === "admin" ? (
              <>
                <Metric
                  label="Registered pharmacies"
                  value={state.pharmacies.length}
                  detail="Includes pending and rejected"
                  icon={<Building2 size={18} />}
                />
                <Metric
                  label="Active pharmacies"
                  value={active}
                  detail="Approved in this browser demo"
                  icon={<CheckCircle2 size={18} />}
                />
                <Metric
                  label="Awaiting review"
                  value={pending}
                  detail="Ready for an admin decision"
                  icon={<Clock3 size={18} />}
                />
              </>
            ) : (
              <>
                <Metric
                  label="Accessible patient vaults"
                  value={accessible.length}
                  detail="Based on current demo consent"
                  icon={<Users size={18} />}
                />
                <Metric
                  label="Reports available"
                  value={
                    state.reports.filter((r) =>
                      accessible.some((p) => p.id === r.patientId),
                    ).length
                  }
                  detail="Patient-reported, not verified"
                  icon={<HeartPulse size={18} />}
                />
                <Metric
                  label="Open interventions"
                  value={
                    state.interventions.filter(
                      (r) =>
                        r.status === "open" &&
                        accessible.some((p) => p.id === r.patientId),
                    ).length
                  }
                  detail="Follow-ups for the care team"
                  icon={<ClipboardList size={18} />}
                />
              </>
            )}
          </section>
          <div className="network-section-heading">
            <div>
              <span className="eyebrow">A CONTINUOUS CIRCLE OF CARE</span>
              <h2>From a health update to a helpful next step.</h2>
            </div>
            <span className="pill">CareDesk network</span>
          </div>
          <section className="journey-cards">
            {[
              {
                title: "Patients stay involved",
                icon: HeartPulse,
                number: "01",
                text: "Record wellbeing and home measurements. Choose who can see your information.",
                page: "Care coordination",
              },
              {
                title: "Doctors guide treatment",
                icon: Stethoscope,
                number: "02",
                text: "Review shared updates and record prescriptions. Clinical decisions stay with the prescriber.",
                page: "Care coordination",
              },
              {
                title: "Pharmacists close the loop",
                icon: Pill,
                number: "03",
                text: "Reconcile records, discuss adherence barriers, and document follow-up interventions.",
                page: "Care coordination",
              },
            ].map((item) => (
              <button
                key={item.number}
                className="journey-card"
                onClick={() => navigate(item.page)}
              >
                <div>
                  <item.icon size={24} />
                  <span>{item.number}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="journey-link">
                  Explore workflow <ArrowUpRight size={15} />
                </span>
              </button>
            ))}
          </section>
          <section className="network-callout">
            <div>
              <ShieldCheck size={25} />
              <div>
                <h3>Consent comes before connection.</h3>
                <p>
                  Sharing can be revoked. Missing refill or laboratory data is
                  shown as unavailable.
                </p>
              </div>
            </div>
            <button
              className="secondary"
              onClick={() => navigate("Consent & privacy")}
            >
              Privacy controls <ChevronRight size={14} />
            </button>
          </section>
        </>
      )}
      {page === "Pharmacy registration" && (
        <>
          <section className="network-stats">
            <Metric
              label="Total registered"
              value={state.pharmacies.length}
              detail="Updates immediately after submission"
              icon={<Building2 size={18} />}
            />
            <Metric
              label="Active pharmacies"
              value={active}
              detail="Approved registrations"
              icon={<CheckCircle2 size={18} />}
            />
            <Metric
              label="Pending review"
              value={pending}
              detail="Not yet activated"
              icon={<Clock3 size={18} />}
            />
          </section>
          <div className="registration-layout">
            <section className="network-panel">
              <div className="network-panel-heading">
                <div className="network-icon">
                  <Building2 size={21} />
                </div>
                <div>
                  <h2>Join the care network</h2>
                  <p>
                    {user.role === "admin"
                      ? "Super admin / Add pharmacy"
                      : "Pharmacy portal / Registration"}
                  </p>
                </div>
              </div>
              {!canRegister ? (
                <div className="network-empty">
                  <LockKeyhole />
                  <h3>Pharmacy registration is role restricted.</h3>
                  <p>
                    Switch the demo role to pharmacist or admin to explore
                    registration.
                  </p>
                </div>
              ) : (
                <>
                  <p className="network-subtle">
                    Your draft saves as you type and stays here when you switch
                    browser tabs or reload.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      challenge ? register() : sendCode();
                    }}
                  >
                    <div className="network-form-grid">
                      {(
                        [
                          [
                            "name",
                            "Pharmacy name",
                            "text",
                            "e.g. Maple Community Pharmacy",
                          ],
                          [
                            "contact",
                            "Primary contact",
                            "text",
                            "e.g. Robin Hayes",
                          ],
                          [
                            "email",
                            "Business email",
                            "email",
                            "team@pharmacy.example",
                          ],
                          [
                            "phone",
                            "Phone with country code",
                            "tel",
                            "+1 202-555-0155",
                          ],
                          [
                            "license",
                            "License / registration ID",
                            "text",
                            "DEMO-PH-1004",
                          ],
                          [
                            "address",
                            "Business address",
                            "text",
                            "Fictional address only",
                          ],
                        ] as const
                      ).map(([field, label, type, placeholder]) => (
                        <label key={field}>
                          {label}
                          <input
                            name={field}
                            type={type}
                            autoComplete="off"
                            required
                            value={draft[field]}
                            maxLength={field === "address" ? 200 : 160}
                            placeholder={placeholder}
                            onChange={(e) =>
                              editRegistration(field, e.target.value)
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <div className="draft-saved">
                      <CheckCircle2 size={13} /> Draft saved in this browser ·
                      fictional business details only
                    </div>
                    {challenge && (
                      <div className="verification-box">
                        <h3>
                          <ShieldCheck size={16} /> Verify the contact number
                        </h3>
                        <p>
                          Code generated for <b>{challenge.phone}</b>. This
                          prototype does not send text messages.
                        </p>
                        <div className="demo-code">
                          DEMO CODE <strong>{challenge.code}</strong>
                          <span>
                            Expires{" "}
                            {new Date(challenge.expiresAt).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        </div>
                        <label>
                          Verification code
                          <input
                            aria-label="Verification code"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            required
                            value={code}
                            onChange={(e) =>
                              setCode(e.target.value.replace(/\D/g, ""))
                            }
                            placeholder="6-digit demo code"
                          />
                        </label>
                        <button
                          className="text-button"
                          type="button"
                          disabled={cooldown > 0}
                          onClick={sendCode}
                        >
                          {cooldown > 0
                            ? `Resend available in ${cooldown}s`
                            : "Generate a new demo code"}
                        </button>
                        <p className="network-subtle">
                          No code received? No SMS is sent in demo mode. Use the
                          visible demo code. Editing the phone invalidates the
                          old code.
                        </p>
                      </div>
                    )}
                    <button className="network-wide" type="submit">
                      {challenge
                        ? "Verify & submit registration"
                        : "Generate demo verification code"}
                      <ArrowUpRight size={16} />
                    </button>
                  </form>
                  {receipt && (
                    <div className="receipt">
                      <CheckCircle2 />
                      <h3>Registration received</h3>
                      <strong>{receipt}</strong>
                      <p>
                        Pending super admin review. Your registration is saved
                        in the directory. Confirmation is shown here; email/SMS
                        delivery is not configured.
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>
            <aside className="registration-guide">
              <span className="eyebrow">A CLEAR PATH TO GETTING STARTED</span>
              <h2>
                A connected pharmacy.
                <br />A supported patient.
              </h2>
              {[
                [
                  "01",
                  "Register your organization",
                  "Save a draft and verify the contact in this local demo.",
                ],
                [
                  "02",
                  "Super admin review",
                  "A clear pending state, decision and confirmation reference.",
                ],
                [
                  "03",
                  "Patient approves sharing",
                  "Clinical access depends on the patient’s consent.",
                ],
                [
                  "04",
                  "Coordinate ongoing care",
                  "Review records and document interventions without changing prescriptions.",
                ],
              ].map(([n, title, text]) => (
                <div className="registration-step" key={n}>
                  <span>{n}</span>
                  <div>
                    <b>{title}</b>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
              <div className="integration-status">
                <LockKeyhole size={18} />
                <b>Integration status</b>
                <p>
                  SMS, email, BestRx, legal agreements and external record sync
                  are not connected. No live BAA is signed here.
                </p>
              </div>
            </aside>
          </div>
          {user.role === "admin" && (
            <section className="network-panel network-directory">
              <div className="network-section-heading">
                <div>
                  <h2>Pharmacy directory</h2>
                  <p>Review submissions and see confirmation references.</p>
                </div>
                <span className="pill">
                  {state.pharmacies.length} registered
                </span>
              </div>
              <div className="journey-toolbar">
                <label className="search">
                  <SearchIcon size={16} />
                  <input
                    aria-label="Search pharmacy directory"
                    value={pharmacyQuery}
                    onChange={(e) => setPharmacyQuery(e.target.value)}
                    placeholder="Search pharmacy, contact or reference"
                  />
                </label>
                <select
                  aria-label="Filter pharmacy status"
                  value={pharmacyStatus}
                  onChange={(e) => setPharmacyStatus(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  {["active", "pending", "rejected"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <span className="pill">
                  {visiblePharmacies.length} matching
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pharmacy</th>
                      <th>Contact</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePharmacies.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <b>{p.name}</b>
                          <small>{p.license}</small>
                        </td>
                        <td>
                          {p.contact}
                          <small>
                            {p.email}
                            <br />
                            {p.phone}
                          </small>
                        </td>
                        <td>{p.reference}</td>
                        <td>
                          <span className={`network-badge ${p.status}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          {p.status === "pending" ? (
                            <div className="actions">
                              <button
                                className="secondary"
                                onClick={() =>
                                  mutate(
                                    { type: "approve", pharmacyId: p.id },
                                    `${p.name} approved. Active pharmacy count updated; no external notification was sent.`,
                                  )
                                }
                              >
                                Approve
                              </button>
                              <button
                                className="network-reject"
                                onClick={() =>
                                  mutate(
                                    { type: "reject", pharmacyId: p.id },
                                    `${p.name} rejected. Registration history retained.`,
                                  )
                                }
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
      {page === "Care coordination" && (
        <>
          {user.role === "admin" || user.role === "frontdesk" ? (
            <section className="network-panel network-empty">
              <LockKeyhole size={28} />
              <h2>Clinical care stays with the care team.</h2>
              <p>
                Explore patient reports as the patient, prescriptions as the
                clinician, and interventions as the pharmacist. Super admin
                manages the pharmacy network.
              </p>
              <button onClick={() => navigate("Pharmacy registration")}>
                Open pharmacy directory <ArrowUpRight size={15} />
              </button>
            </section>
          ) : (
            <>
              <div className="coordination-toolbar">
                <div>
                  <h2>One patient. One connected care journey.</h2>
                  <p>
                    Only patient-approved records appear in this simulated
                    portal.
                  </p>
                </div>
                <label>
                  Patient vault
                  <select
                    aria-label="Patient vault"
                    value={selected?.id || ""}
                    onChange={(e) => {
                      setPatientId(e.target.value);
                      setClinicalDraft({
                        ...clinicalDraft,
                        value: "",
                        note: "",
                        medication: "",
                        instructions: "",
                      });
                    }}
                  >
                    {accessible.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {!selected ? (
                <section className="network-panel network-empty">
                  <LockKeyhole />
                  <h3>No patient-approved records available.</h3>
                  <p>
                    Switch to the patient portal to manage sharing. Revoked data
                    is hidden from future views.
                  </p>
                </section>
              ) : (
                <>
                  <section className="vault-summary">
                    <div>
                      <div className="avatar color-0">
                        {selected.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <h2>{selected.name}</h2>
                        <p>{selected.id} · Synthetic patient vault</p>
                      </div>
                    </div>
                    <span>
                      <ShieldCheck size={15} />{" "}
                      {user.role === "patient"
                        ? "Your information, your control"
                        : "Patient consent active"}
                    </span>
                  </section>
                  <div className="care-indicators">
                    <div>
                      <small>HEALTH SCORE</small>
                      <b>Not calculated</b>
                      <span>
                        Validated inputs and scoring model unavailable
                      </span>
                    </div>
                    <div>
                      <small>MEDICATION ADHERENCE</small>
                      <b>Unknown</b>
                      <span>No connected dispensing or refill history</span>
                    </div>
                    <div>
                      <small>EXTERNAL CONNECTIONS</small>
                      <b>Not connected</b>
                      <span>BestRx / FHIR / remote monitoring</span>
                    </div>
                  </div>
                  <div
                    className="care-tabs"
                    role="tablist"
                    aria-label="Care record sections"
                  >
                    {[
                      ...journeyTabs,
                      "Patient reports",
                      "Prescriptions",
                      "Interventions",
                    ].map((name) => (
                      <button
                        role="tab"
                        aria-selected={tab === name}
                        key={name}
                        className={tab === name ? "active" : ""}
                        onClick={() => setTab(name)}
                      >
                        {name}
                        {tabCounts[name] !== undefined && (
                          <span>{tabCounts[name]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {journeyTabs.includes(tab) ? (
                    <CareJourney
                      key={`${selected.id}-${tab}`}
                      state={state}
                      user={user}
                      patientId={selected.id}
                      tab={tab}
                      onAction={mutate}
                    />
                  ) : (
                    <>
                      <label className="search record-search">
                        <SearchIcon />
                        <input
                          aria-label="Search patient reports, prescriptions or interventions"
                          value={recordQuery}
                          onChange={(e) => setRecordQuery(e.target.value)}
                          placeholder="Search this patient's records"
                        />
                      </label>
                      <div className="care-record-layout">
                        <section className="network-panel">
                          <div className="network-section-heading">
                            <h2>{tab}</h2>
                            <span className="pill">Fictional records</span>
                          </div>
                          {tab === "Patient reports" ? (
                            <>
                              {reports.length === 0 && (
                                <Empty text="No patient-reported updates yet." />
                              )}
                              {reports.map((r) => (
                                <article className="care-record" key={r.id}>
                                  <div>
                                    <span className="network-record-icon">
                                      <HeartPulse size={18} />
                                    </span>
                                    <div>
                                      <h3>{r.kind}</h3>
                                      <small>
                                        Patient reported ·{" "}
                                        {formatDate(r.createdAt)}
                                      </small>
                                    </div>
                                  </div>
                                  <strong>{r.value}</strong>
                                  <p>{r.note}</p>
                                  <span className="network-badge pending">
                                    Unverified self-report
                                  </span>
                                </article>
                              ))}
                            </>
                          ) : tab === "Prescriptions" ? (
                            <>
                              {prescriptions.length === 0 && (
                                <Empty text="No prescriptions recorded." />
                              )}
                              {prescriptions.map((r) => (
                                <article className="care-record" key={r.id}>
                                  <div>
                                    <span className="network-record-icon">
                                      <Pill size={18} />
                                    </span>
                                    <div>
                                      <h3>{r.medication}</h3>
                                      <small>
                                        Prescriber: {r.prescriber} ·{" "}
                                        {formatDate(r.createdAt)}
                                      </small>
                                    </div>
                                  </div>
                                  <p>{r.instructions}</p>
                                  <span className="network-badge active">
                                    Prescriber record · read-only to pharmacy
                                  </span>
                                </article>
                              ))}
                            </>
                          ) : (
                            <>
                              {interventions.length === 0 && (
                                <Empty text="No interventions documented." />
                              )}
                              {interventions.map((r) => (
                                <article className="care-record" key={r.id}>
                                  <div>
                                    <span className="network-record-icon">
                                      <ClipboardList size={18} />
                                    </span>
                                    <div>
                                      <h3>{r.category}</h3>
                                      <small>
                                        {r.author} · {formatDate(r.createdAt)}
                                      </small>
                                    </div>
                                    <span
                                      className={`network-badge ${r.status === "resolved" ? "active" : "pending"}`}
                                    >
                                      {r.status}
                                    </span>
                                  </div>
                                  <p>{r.note}</p>
                                  {user.role === "pharmacist" &&
                                    r.status === "open" && (
                                      <button
                                        className="secondary"
                                        onClick={() =>
                                          mutate(
                                            {
                                              type: "resolve",
                                              patientId: selected.id,
                                              interventionId: r.id,
                                            },
                                            "Intervention marked resolved. The prescription was not changed.",
                                          )
                                        }
                                      >
                                        <Check size={13} /> Mark resolved
                                      </button>
                                    )}
                                </article>
                              ))}
                            </>
                          )}
                        </section>
                        <section className="network-panel network-entry">
                          <div className="network-panel-heading">
                            <div className="network-icon">
                              {user.role === "patient" ? (
                                <HeartPulse />
                              ) : user.role === "clinician" ? (
                                <Stethoscope />
                              ) : (
                                <Pill />
                              )}
                            </div>
                            <div>
                              <h2>
                                {user.role === "patient"
                                  ? "Share a health update"
                                  : user.role === "clinician"
                                    ? "Record a prescription"
                                    : "Document an intervention"}
                              </h2>
                              <p>{portalNames[user.role]} workspace</p>
                            </div>
                          </div>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const common = { patientId: selected.id };
                              if (user.role === "patient")
                                mutate(
                                  {
                                    type: "report",
                                    ...common,
                                    kind: clinicalDraft.kind,
                                    value: clinicalDraft.value,
                                    note: clinicalDraft.note,
                                  },
                                  "Patient update saved. Shared only with the care portals you approved.",
                                );
                              else if (user.role === "clinician")
                                mutate(
                                  {
                                    type: "prescribe",
                                    ...common,
                                    medication: clinicalDraft.medication,
                                    instructions: clinicalDraft.instructions,
                                  },
                                  "Fictional prescription recorded. This is not an electronic prescription or dispensing order.",
                                );
                              else
                                mutate(
                                  {
                                    type: "intervene",
                                    ...common,
                                    category: clinicalDraft.category,
                                    note: clinicalDraft.note,
                                  },
                                  "Intervention documented. The doctor’s prescription remains unchanged.",
                                );
                            }}
                          >
                            {user.role === "patient" ? (
                              <>
                                <label>
                                  Update type
                                  <select
                                    value={clinicalDraft.kind}
                                    onChange={(e) =>
                                      setClinicalDraft({
                                        ...clinicalDraft,
                                        kind: e.target.value,
                                      })
                                    }
                                  >
                                    {[
                                      "Wellbeing",
                                      "Blood pressure",
                                      "Blood glucose",
                                      "Adherence concern",
                                      "Care goal",
                                    ].map((k) => (
                                      <option key={k}>{k}</option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Value / update
                                  <input
                                    required
                                    maxLength={100}
                                    value={clinicalDraft.value}
                                    onChange={(e) =>
                                      setClinicalDraft({
                                        ...clinicalDraft,
                                        value: e.target.value,
                                      })
                                    }
                                    placeholder="e.g. Walked for 20 minutes"
                                  />
                                </label>
                              </>
                            ) : user.role === "clinician" ? (
                              <>
                                <label>
                                  Medication / prescription label
                                  <input
                                    required
                                    maxLength={120}
                                    value={clinicalDraft.medication}
                                    onChange={(e) =>
                                      setClinicalDraft({
                                        ...clinicalDraft,
                                        medication: e.target.value,
                                      })
                                    }
                                    placeholder="e.g. Demo medication C"
                                  />
                                </label>
                                <label>
                                  Prescriber instructions
                                  <textarea
                                    required
                                    maxLength={2000}
                                    rows={4}
                                    value={clinicalDraft.instructions}
                                    onChange={(e) =>
                                      setClinicalDraft({
                                        ...clinicalDraft,
                                        instructions: e.target.value,
                                      })
                                    }
                                    placeholder="Fictional instructions only; no real prescription is sent"
                                  />
                                </label>
                              </>
                            ) : (
                              <label>
                                Intervention category
                                <select
                                  value={clinicalDraft.category}
                                  onChange={(e) =>
                                    setClinicalDraft({
                                      ...clinicalDraft,
                                      category: e.target.value,
                                    })
                                  }
                                >
                                  {[
                                    "Adherence check-in",
                                    "Record reconciliation",
                                    "Patient education",
                                    "Prescriber clarification",
                                    "Follow-up planning",
                                  ].map((k) => (
                                    <option key={k}>{k}</option>
                                  ))}
                                </select>
                              </label>
                            )}
                            {user.role !== "clinician" && (
                              <label>
                                {user.role === "patient"
                                  ? "Additional context (optional)"
                                  : "Intervention / follow-up note"}
                                <textarea
                                  required={user.role === "pharmacist"}
                                  maxLength={1000}
                                  rows={4}
                                  value={clinicalDraft.note}
                                  onChange={(e) =>
                                    setClinicalDraft({
                                      ...clinicalDraft,
                                      note: e.target.value,
                                    })
                                  }
                                  placeholder="Fictional details only"
                                />
                              </label>
                            )}
                            <p className="network-subtle">
                              {user.role === "pharmacist"
                                ? "Pharmacists can document care and follow-up, but cannot edit a doctor’s prescription."
                                : "This demo does not diagnose, recommend treatment, or send orders to a pharmacy."}
                            </p>
                            <button className="network-wide" type="submit">
                              <Plus size={15} />
                              {user.role === "patient"
                                ? "Save update"
                                : user.role === "clinician"
                                  ? "Save fictional prescription"
                                  : "Save intervention"}
                            </button>
                          </form>
                        </section>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {page === "Consent & privacy" && (
        <>
          <section className="privacy-hero">
            <div className="network-icon">
              <LockKeyhole size={26} />
            </div>
            <span className="eyebrow">
              YOUR HEALTH. YOUR DATA. YOUR CHOICE.
            </span>
            <h2>Connection starts with permission.</h2>
            <p>
              Decide which care portals can access the fictional vault. Revoking
              permission immediately removes future access in this prototype.
            </p>
          </section>
          <div className="privacy-layout">
            <section className="network-panel">
              <h2>Alex Morgan’s sharing preferences</h2>
              <p className="network-subtle">
                {user.role === "patient"
                  ? "Changes apply immediately to the doctor and Northstar pharmacy portals."
                  : "Only the patient portal can change consent. Switch View as to patient to try it."}
              </p>
              {[
                [
                  "provider",
                  "Doctor / provider",
                  "Review patient-reported information and record prescriptions.",
                  Stethoscope,
                ],
                [
                  "pharmacy",
                  "Northstar Community Pharmacy",
                  "Review shared records and document pharmacist interventions.",
                  Pill,
                ],
              ].map(([key, title, description, Icon]) => (
                <div className="consent-row" key={String(key)}>
                  <div className="network-icon">
                    <Icon size={20} />
                  </div>
                  <div>
                    <b>{String(title)}</b>
                    <p>{String(description)}</p>
                  </div>
                  <label className="consent-toggle">
                    <input
                      type="checkbox"
                      aria-label={`Allow ${title} access`}
                      disabled={user.role !== "patient"}
                      checked={!!myConsent?.[key as "provider" | "pharmacy"]}
                      onChange={(e) =>
                        mutate(
                          {
                            type: "consent",
                            patientId: "p-1001",
                            provider: myConsent?.provider || false,
                            pharmacy: myConsent?.pharmacy || false,
                            [String(key)]: e.target.checked,
                          },
                          `Sharing preference updated. ${title} access ${e.target.checked ? "allowed" : "revoked"}.`,
                        )
                      }
                    />
                    <span>
                      {myConsent?.[key as "provider" | "pharmacy"]
                        ? "Allowed"
                        : "Revoked"}
                    </span>
                  </label>
                </div>
              ))}
              <p className="network-subtle">
                Consent scope in this version: one example pharmacy and provider
                portal. It does not authorize an external API, share real data,
                or create a legal consent document.
              </p>
            </section>
            <section className="network-panel">
              <h2>Clear boundaries. Honest status.</h2>
              <ul className="privacy-list">
                <li>
                  <ShieldCheck size={18} />
                  <span>
                    <b>Patient-controlled access</b>
                    <small>
                      Denied or revoked consent hides records from the
                      applicable demo portal.
                    </small>
                  </span>
                </li>
                <li>
                  <Pill size={18} />
                  <span>
                    <b>No silent prescription changes</b>
                    <small>
                      Pharmacy interventions are separate from doctor-authored
                      prescription records.
                    </small>
                  </span>
                </li>
                <li>
                  <HeartPulse size={18} />
                  <span>
                    <b>No invented health score</b>
                    <small>
                      Missing laboratory or refill inputs remain unavailable.
                    </small>
                  </span>
                </li>
                <li>
                  <LockKeyhole size={18} />
                  <span>
                    <b>Synthetic browser prototype</b>
                    <small>
                      Network data lives in localStorage and is not encrypted.
                      Never enter real personal or health information. The
                      original Firebase clinic mode remains separate.
                    </small>
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </>
      )}
      {user.role === "admin" && page === "Care network" && (
        <section className="network-panel network-directory">
          <div className="network-section-heading">
            <h2>Recent network activity</h2>
            <span className="pill">This browser session history</span>
          </div>
          {state.events.length === 0 ? (
            <Empty text="No actions recorded yet. Register or approve a pharmacy to start the activity history." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Reference</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {state.events.slice(0, 20).map((e) => (
                    <tr key={e.id}>
                      <td>{e.action}</td>
                      <td>{e.actor}</td>
                      <td>{e.target}</td>
                      <td>{formatDate(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{String(value).padStart(2, "0")}</strong>
      <small>{detail}</small>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="network-empty">
      <ClipboardList size={24} />
      <p>{text}</p>
    </div>
  );
}
