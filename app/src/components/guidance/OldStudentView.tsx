function v(data: Record<string, unknown>, key: string): string {
  const x = data[key];
  if (x === null || x === undefined || x === "") return "—";
  return String(x);
}

function calcAge(birthdate: string | undefined): string {
  if (!birthdate) return "—";
  const d = new Date(birthdate);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return age > 0 ? String(age) : "—";
}

export function OldStudentView({ data }: { data: Record<string, unknown> }) {
  const birthdate = data.birthdate as string | undefined;
  const age = calcAge(birthdate);

  return (
    <>
      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--red">PERSONAL DETAILS</div>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label">Full Name:</td>
              <td colSpan={5}>{v(data, "full_name")}</td>
            </tr>
            <tr>
              <td className="pds-label">Nickname:</td>
              <td colSpan={2}>{v(data, "nickname")}</td>
              <td className="pds-label">Grade Level:</td>
              <td colSpan={2}>{v(data, "grade_level")}</td>
            </tr>
            <tr>
              <td className="pds-label">Section:</td>
              <td colSpan={5}>{v(data, "section")}</td>
            </tr>
            <tr>
              <td className="pds-label">Mobile Number:</td>
              <td colSpan={2}>{v(data, "mobile_number")}</td>
              <td className="pds-label">Email Address:</td>
              <td colSpan={2}>{v(data, "email")}</td>
            </tr>
            <tr>
              <td className="pds-label">Gender:</td>
              <td>{v(data, "gender")}</td>
              <td className="pds-label">Birthdate:</td>
              <td>{v(data, "birthdate")}</td>
              <td className="pds-label">Age:</td>
              <td>{age}</td>
            </tr>
            <tr>
              <td className="pds-label">Home Address:</td>
              <td colSpan={5}>{v(data, "home_address")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--yellow">FAMILY BACKGROUND</div>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label">Living With:</td>
              <td colSpan={3}>{v(data, "living_with")}</td>
            </tr>
            <tr>
              <td className="pds-label">Father's Full Name:</td>
              <td>{v(data, "father_full_name")}</td>
              <td className="pds-label">Mother's Full Name:</td>
              <td>{v(data, "mother_full_name")}</td>
            </tr>
            <tr>
              <td className="pds-label">Father's Occupation:</td>
              <td>{v(data, "father_occupation")}</td>
              <td className="pds-label">Mother's Occupation:</td>
              <td>{v(data, "mother_occupation")}</td>
            </tr>
            <tr>
              <td className="pds-label">Name of Parent/Guardian:</td>
              <td colSpan={3}>{v(data, "parent_guardian_name")}</td>
            </tr>
            <tr>
              <td className="pds-label">Contact Number of Parent/Guardian:</td>
              <td>{v(data, "parent_guardian_contact")}</td>
              <td className="pds-label">Email Address of Parent/Guardian:</td>
              <td>{v(data, "parent_guardian_email")}</td>
            </tr>
            <tr>
              <td className="pds-label">No. of Siblings Enrolled in NPS:</td>
              <td>{v(data, "siblings_in_nps_count")}</td>
              <td className="pds-label">Grade Level/s:</td>
              <td>{v(data, "siblings_in_nps_grade_levels")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--red">
          MEDICAL/ EMERGENCY INFORMATION
        </div>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label">Medical Conditions/ Allergies if any:</td>
              <td colSpan={3}>{v(data, "medical_conditions")}</td>
            </tr>
            <tr>
              <td className="pds-label">Emergency Contact Person:</td>
              <td>{v(data, "emergency_contact_name")}</td>
              <td className="pds-label">Contact Number:</td>
              <td>{v(data, "emergency_contact_number")}</td>
            </tr>
            <tr>
              <td className="pds-label">Relationship with the Student:</td>
              <td colSpan={3}>{v(data, "emergency_contact_relationship")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--yellow">
          STUDENT SUPPORT NEEDS
        </div>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label">
                Would you like to speak with the Guidance Counselor this year?
              </td>
              <td>{v(data, "wants_counselor")}</td>
            </tr>
            <tr>
              <td className="pds-label">Concerns you'd like to share (optional)</td>
              <td>{v(data, "concerns_to_share")}</td>
            </tr>
            <tr>
              <td className="pds-label">
                What are you looking forward to this School Year?
              </td>
              <td>{v(data, "looking_forward_to")}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
