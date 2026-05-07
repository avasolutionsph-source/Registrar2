export function PdsHeader({ photoUrl }: { photoUrl: string | null }) {
  return (
    <div className="pds-header">
      <div className="pds-header-left">
        <img src="/nps-logo.png" alt="NPS" className="pds-logo" />
        <div className="pds-school">
          <div className="pds-school-name">NAGA PAROCHIAL SCHOOL</div>
          <div className="pds-school-sub">Guidance, Testing, and Research Services</div>
        </div>
      </div>
      <div className="pds-header-mid">
        <div>Corner Ateneo Avenue, Bagumbayan Sur</div>
        <div>4400 Naga City Philippines</div>
        <div>Phone: 473-56-04</div>
        <div>Email: guidance@nps.edu.ph</div>
        <div>www.nps.edu.ph</div>
      </div>
      <div className="pds-photo-box">
        {photoUrl ? (
          <img src={photoUrl} alt="Student" />
        ) : (
          <span>2x2 / 1.5x1.5 picture</span>
        )}
      </div>
    </div>
  );
}

export function PdsTitle() {
  return <h1 className="pds-title">STUDENTS' PERSONAL DATA SHEET</h1>;
}

const PRIVACY_NOTE_OLD = `The Naga Parochial School recognizes its responsibilities under the Republic Act No. 10173 (Data Privacy Act of 2012), to data collection, recording, organizing, updating, use, and consolidation from its students. Data gathered in this form will be processed and accessible only to the Guidance Counselors. The information collected shall be used to provide possible assistance, appropriate interventions, and reference for future referrals. Consolidated reports are shared with administrators and other school personnel.

NPS shall not disclose the respondent's personal information without their consent and shall retain this information for a period of two (2) years after graduation.

I authorize the Guidance Office to use my responses exclusively for purposes deemed necessary by the office.

I hereby declare that the details furnished above are true and correct to the best of my knowledge and I undertake to inform you of any changes therein immediately.`;

export function PdsFooter({
  signatureName,
  signedAt,
}: {
  signatureName: string;
  signedAt: string;
}) {
  const date = new Date(signedAt);
  const dateStr = date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <section className="pds-section">
      <div className="pds-section-bar pds-section-bar--center">DATA PRIVACY NOTICE</div>
      <div className="pds-privacy-body">
        <p className="pds-privacy-intro">
          By answering this form, I hereby agree to the following:
        </p>
        {PRIVACY_NOTE_OLD.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <table className="pds-table pds-signature-table">
        <tbody>
          <tr>
            <td className="pds-signature-cell">
              <div className="pds-signature-name">{signatureName}</div>
              <div className="pds-signature-label">
                SIGNATURE OVER PRINTED NAME OF THE STUDENT
              </div>
            </td>
            <td className="pds-signature-cell">
              <div className="pds-signature-name">{dateStr}</div>
              <div className="pds-signature-label">DATE ACCOMPLISHED</div>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="pds-privacy-confidential">
        ***Note: Please be assured that all information revealed here will be kept confidential.
      </p>
    </section>
  );
}
