import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// In-app legal pages: Privacy Policy (aligned to RA 10173, the PH Data Privacy
// Act of 2012) and Terms of Use for the CCA Portal.
//
// IMPORTANT: These are TEMPLATES. Before publishing, the Community College of
// Alangalang's Data Protection Officer (DPO) / legal counsel must review them and
// fill in the bracketed [ ... ] placeholders (official contact details, retention
// periods, etc.). They are not legal advice.
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = "#3d6e01";
const DARK_GREEN = "#2c4a1e";
const INK = "#1f2937";
const MUTED = "#4B5563";
const BORDER = "#E5E7EB";

const EFFECTIVE_DATE = "September 10, 2026"; // update when published

function Shell({ title, subtitle, onClose, children }) {
  // Lock body scroll while the overlay is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "24px 16px", overflowY: "auto", fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 760, boxShadow: "0 24px 70px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: "#FFFFFF", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{subtitle}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ padding: "22px 26px", maxHeight: "72vh", overflowY: "auto", color: INK, fontSize: 13.5, lineHeight: 1.7 }}>
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, marginBottom: 18 }}>
            Template for institutional review — the College's Data Protection Officer / legal counsel should verify this text and complete any bracketed placeholders before it is treated as final.
          </div>
          {children}
          <div style={{ marginTop: 22, paddingTop: 14, borderTop: `1px solid ${BORDER}`, fontSize: 11.5, color: MUTED, textAlign: "center" }}>
            Effective date: {EFFECTIVE_DATE} · Community College of Alangalang
          </div>
        </div>
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${BORDER}`, textAlign: "right" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`, color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

const h = { fontSize: 14.5, fontWeight: 800, color: DARK_GREEN, margin: "18px 0 6px" };
const p = { margin: "0 0 10px" };
const li = { margin: "0 0 6px" };

export function PrivacyPolicy({ onClose }) {
  return (
    <Shell title="Privacy Policy" subtitle="Data Privacy Act of 2012 (Republic Act No. 10173)" onClose={onClose}>
      <p style={p}>
        The Community College of Alangalang (“the College”, “we”, “us”) is committed to protecting the personal
        information it collects through the CCA Portal. This Policy explains what we collect, why, how we use and
        protect it, and the rights you have under Republic Act No. 10173, otherwise known as the Data Privacy Act of
        2012, and its Implementing Rules and Regulations.
      </p>

      <div style={h}>1. Information we collect</div>
      <p style={p}>Depending on your role, the Portal may process:</p>
      <ul style={{ margin: "0 0 10px", paddingLeft: 20 }}>
        <li style={li}><b>Identity &amp; contact data</b> — name, student/employee number, sex, birthdate, address, contact number, email.</li>
        <li style={li}><b>Academic records</b> — enrollment, subjects, grades, class schedules, faculty evaluations.</li>
        <li style={li}><b>Family/guardian and educational background</b> — as required on the enrollment form.</li>
        <li style={li}><b>Financial records</b> — official collections/receipts and payment status handled by the Cashier.</li>
        <li style={li}><b>Account &amp; usage data</b> — login credentials (stored securely) and records needed to operate the system.</li>
      </ul>

      <div style={h}>2. Why we process it (lawful basis)</div>
      <p style={p}>
        We process personal data to perform the College's functions as an educational institution — admissions and
        enrollment, delivery of instruction, recording of grades, assessment and collection of fees, library and clinic
        services, and compliance with the requirements of the Commission on Higher Education (CHED) and other lawful
        authorities. Processing is based on the performance of these functions, on legal obligations, and, where
        required, on your consent.
      </p>

      <div style={h}>3. How we protect it</div>
      <p style={p}>
        Access to the Portal is restricted by role and protected by individual accounts and passwords. Sessions
        automatically end after a period of inactivity. We apply organizational and technical measures appropriate to
        the sensitivity of the data. No system can be guaranteed perfectly secure, so we also rely on users to keep
        their credentials confidential.
      </p>

      <div style={h}>4. Sharing and disclosure</div>
      <p style={p}>
        We do not sell personal data. Information is shared only with authorized College personnel who need it for their
        duties, and with government agencies or third parties where disclosure is required or permitted by law. We do not
        use third-party advertising or analytics trackers in this Portal.
      </p>

      <div style={h}>5. Retention</div>
      <p style={p}>
        Records are retained for as long as necessary to fulfill the purposes above and to meet legal, academic, and
        auditing requirements [insert the College's records-retention schedule], after which they are securely disposed
        of or anonymized.
      </p>

      <div style={h}>6. Your rights</div>
      <p style={p}>
        Under the Data Privacy Act you have the right to be informed, to access, to object, to rectify inaccurate data,
        to erasure or blocking under lawful conditions, to data portability, to lodge a complaint, and to be indemnified
        for damages. To exercise these rights, contact the Data Protection Officer below.
      </p>

      <div style={h}>7. Contact — Data Protection Officer</div>
      <p style={p}>
        Data Protection Officer, Community College of Alangalang<br />
        [Office address] · [Email address] · [Contact number]<br />
        You may also complain to the National Privacy Commission (privacy.gov.ph).
      </p>
    </Shell>
  );
}

export function TermsOfUse({ onClose }) {
  return (
    <Shell title="Terms of Use" subtitle="CCA Portal — conditions of access and use" onClose={onClose}>
      <div style={h}>1. Authorized users</div>
      <p style={p}>
        The CCA Portal is a private system provided by the Community College of Alangalang for the use of its enrolled
        students, faculty, and authorized staff. Access is granted through individual accounts issued by the College.
        Using the Portal without authorization is prohibited.
      </p>

      <div style={h}>2. Your account</div>
      <p style={p}>
        You are responsible for all activity under your account. Keep your password confidential, do not share your
        login, and notify the IT Support Office immediately if you suspect unauthorized use. The College may suspend or
        revoke access for misuse.
      </p>

      <div style={h}>3. Acceptable use</div>
      <p style={p}>
        Use the Portal only for legitimate academic and administrative purposes. You must not attempt to gain
        unauthorized access, disrupt the system, upload malicious code, or copy, alter, or disclose data you are not
        authorized to handle. Records entered (grades, payments, enrollment, evaluations) must be accurate and made in
        good faith.
      </p>

      <div style={h}>4. Data privacy</div>
      <p style={p}>
        Personal data in the Portal is handled in accordance with our Privacy Policy and the Data Privacy Act of 2012.
        By using the Portal you acknowledge that Policy.
      </p>

      <div style={h}>5. Availability</div>
      <p style={p}>
        The College aims to keep the Portal available but does not guarantee uninterrupted service. Features may change,
        and the system may be taken offline for maintenance.
      </p>

      <div style={h}>6. Intellectual property</div>
      <p style={p}>
        The Portal, its content, and College and government seals and logos are the property of their respective owners
        and may not be reused without permission.
      </p>

      <div style={h}>7. Changes</div>
      <p style={p}>
        These Terms may be updated from time to time. Continued use after changes take effect constitutes acceptance of
        the revised Terms.
      </p>

      <div style={h}>8. Contact</div>
      <p style={p}>
        Questions about these Terms may be directed to the IT Support Office / Registrar, Community College of
        Alangalang [insert contact details].
      </p>
    </Shell>
  );
}
