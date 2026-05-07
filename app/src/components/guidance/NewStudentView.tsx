type Sibling = {
  full_name?: string;
  age?: number | string;
  civil_status?: string;
  school_or_employer?: string;
  year_level_or_occupation?: string;
};

type Parent = {
  name?: string;
  age?: number | string;
  contact?: string;
  email?: string;
  nationality?: string;
  religion?: string;
  occupation?: string;
  employer_name_address?: string;
};

type EducationLevel = {
  name_of_school?: string;
  year_of_completion?: string;
  inclusive_dates?: string;
  recognition_awards?: string;
};

function v(data: Record<string, unknown>, key: string): string {
  const x = data[key];
  if (x === null || x === undefined || x === "") return "—";
  if (Array.isArray(x)) return x.length === 0 ? "—" : x.join(", ");
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

export function NewStudentView({ data }: { data: Record<string, unknown> }) {
  const p1 = (data.parent_1 ?? {}) as Parent;
  const p2 = (data.parent_2 ?? {}) as Parent;
  const siblings = (data.siblings ?? []) as Sibling[];
  const education = (data.education ?? {}) as {
    elementary?: EducationLevel;
    junior_high?: EducationLevel;
  };
  const ec = (data.emergency_contact ?? {}) as {
    name?: string;
    relationship?: string;
    address?: string;
    contact?: string;
  };
  const age = calcAge(data.birthdate as string | undefined);
  const siblingRows = Array.from({ length: 10 }, (_, i) => siblings[i] ?? {});

  return (
    <>
      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--red">PERSONAL DETAILS</div>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label">Full Name</td>
              <td colSpan={5}>{v(data, "full_name")}</td>
            </tr>
            <tr>
              <td className="pds-label">Strand</td>
              <td>{v(data, "strand")}</td>
              <td className="pds-label">Block/Section</td>
              <td>{v(data, "block_section")}</td>
              <td className="pds-label">ID Number</td>
              <td>{v(data, "id_number")}</td>
            </tr>
            <tr>
              <td className="pds-label">Contact Number</td>
              <td colSpan={2}>{v(data, "contact_number")}</td>
              <td className="pds-label">Email</td>
              <td colSpan={2}>{v(data, "email")}</td>
            </tr>
            <tr>
              <td className="pds-label">Permanent Address</td>
              <td colSpan={5}>{v(data, "permanent_address")}</td>
            </tr>
            <tr>
              <td className="pds-label">Present Address</td>
              <td colSpan={5}>{v(data, "present_address")}</td>
            </tr>
            <tr>
              <td className="pds-label">Birthdate</td>
              <td>{v(data, "birthdate")}</td>
              <td className="pds-label">Age</td>
              <td>{age}</td>
              <td className="pds-label">Gender</td>
              <td>{v(data, "gender")}</td>
            </tr>
            <tr>
              <td className="pds-label">Birthplace</td>
              <td>{v(data, "birthplace")}</td>
              <td className="pds-label">Religion</td>
              <td>{v(data, "religion")}</td>
              <td className="pds-label">Nationality</td>
              <td>{v(data, "nationality")}</td>
            </tr>
            <tr>
              <td className="pds-label">Civil Status</td>
              <td colSpan={2}>{v(data, "civil_status")}</td>
              <td className="pds-label">Admission Classification</td>
              <td colSpan={2}>{v(data, "admission_classification")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--yellow">FAMILY BACKGROUND</div>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label"></td>
              <td className="pds-label-center">Parent 1 / Guardian 1</td>
              <td className="pds-label-center">Parent 2 / Guardian 2</td>
            </tr>
            <tr>
              <td className="pds-label">Name</td>
              <td>{p1.name ?? "—"}</td>
              <td>{p2.name ?? "—"}</td>
            </tr>
            <tr>
              <td className="pds-label">Age</td>
              <td>{p1.age ?? "—"}</td>
              <td>{p2.age ?? "—"}</td>
            </tr>
            <tr>
              <td className="pds-label">Contact No.</td>
              <td>{p1.contact ?? "—"}</td>
              <td>{p2.contact ?? "—"}</td>
            </tr>
            <tr>
              <td className="pds-label">Email</td>
              <td>{p1.email || "—"}</td>
              <td>{p2.email || "—"}</td>
            </tr>
            <tr>
              <td className="pds-label">Nationality</td>
              <td>{p1.nationality ?? "—"}</td>
              <td>{p2.nationality ?? "—"}</td>
            </tr>
            <tr>
              <td className="pds-label">Religion</td>
              <td>{p1.religion ?? "—"}</td>
              <td>{p2.religion ?? "—"}</td>
            </tr>
            <tr>
              <td className="pds-label">Occupation</td>
              <td>{p1.occupation ?? "—"}</td>
              <td>{p2.occupation ?? "—"}</td>
            </tr>
            <tr>
              <td className="pds-label">Employer's Name & Address</td>
              <td>{p1.employer_name_address || "—"}</td>
              <td>{p2.employer_name_address || "—"}</td>
            </tr>
          </tbody>
        </table>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label">Parent(s) OFW status:</td>
              <td>{v(data, "parents_ofw_status")}</td>
              <td className="pds-label">Parents' set-up:</td>
              <td>{v(data, "parents_setup")}</td>
            </tr>
            <tr>
              <td className="pds-label">No. of Sibling/s</td>
              <td>{v(data, "siblings_count")}</td>
              <td className="pds-label">Birth Order</td>
              <td>{v(data, "birth_order")}</td>
            </tr>
            <tr>
              <td className="pds-label">With whom do you live (most of your life)?</td>
              <td>{v(data, "lives_with_whom_most_of_life")}</td>
              <td className="pds-label">For how long?</td>
              <td>{v(data, "living_with_duration")}</td>
            </tr>
            <tr>
              <td className="pds-label">Present family set-up</td>
              <td>{v(data, "present_family_setup")}</td>
              <td className="pds-label">Closest family member</td>
              <td>{v(data, "closest_family_member")}</td>
            </tr>
            <tr>
              <td className="pds-label">Dialect/s spoken at home</td>
              <td>{v(data, "dialects_spoken_at_home")}</td>
              <td className="pds-label">Monthly Family Income</td>
              <td>{v(data, "monthly_family_income")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--red">SIBLING INFORMATION</div>
        <table className="pds-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Age</th>
              <th>Civil Status</th>
              <th>School/Employer</th>
              <th>Year Level/Occupation</th>
            </tr>
          </thead>
          <tbody>
            {siblingRows.map((s, i) => (
              <tr key={i}>
                <td>{s.full_name ?? ""}</td>
                <td>{s.age ?? ""}</td>
                <td>{s.civil_status ?? ""}</td>
                <td>{s.school_or_employer ?? ""}</td>
                <td>{s.year_level_or_occupation ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--yellow">EDUCATIONAL BACKGROUND</div>
        <table className="pds-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Name of school</th>
              <th>Year of Completion</th>
              <th>Inclusive Dates</th>
              <th>Recognition/Awards</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pds-label">Elementary/Grade School (Grade 1-6)</td>
              <td>{education.elementary?.name_of_school ?? "—"}</td>
              <td>{education.elementary?.year_of_completion ?? "—"}</td>
              <td>{education.elementary?.inclusive_dates ?? "—"}</td>
              <td>{education.elementary?.recognition_awards ?? "—"}</td>
            </tr>
            <tr>
              <td className="pds-label">Junior High School (Grade 7-10)</td>
              <td>{education.junior_high?.name_of_school ?? "—"}</td>
              <td>{education.junior_high?.year_of_completion ?? "—"}</td>
              <td>{education.junior_high?.inclusive_dates ?? "—"}</td>
              <td>{education.junior_high?.recognition_awards ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--red">SENIOR HIGH SCHOOL EXPERIENCE</div>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label">Who decided that you study here?</td>
              <td>{v(data, "who_decided_to_study_here")}</td>
            </tr>
            <tr>
              <td className="pds-label">What made you choose this school?</td>
              <td>{v(data, "why_chose_this_school")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--yellow">SOCIAL LIFE</div>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label">Do you have a boyfriend/girlfriend?</td>
              <td>{v(data, "has_partner")}</td>
              <td className="pds-label">How many close friends in school?</td>
              <td>{v(data, "close_friends_count")}</td>
            </tr>
            <tr>
              <td className="pds-label">What do you usually do during free time?</td>
              <td colSpan={3}>{v(data, "free_time_activities")}</td>
            </tr>
            <tr>
              <td className="pds-label">Have you experienced peer pressure?</td>
              <td>{v(data, "experienced_peer_pressure")}</td>
              <td className="pds-label">Have you experienced bullying?</td>
              <td>{v(data, "experienced_bullying")}</td>
            </tr>
            <tr>
              <td className="pds-label">In what form/s of bullying (if any)?</td>
              <td colSpan={3}>{v(data, "bullying_forms")}</td>
            </tr>
            <tr>
              <td className="pds-label">
                Have you thought of hurting yourself physically because of problems, issues, and difficulties that you encountered?
              </td>
              <td colSpan={3}>{v(data, "thought_of_self_harm")}</td>
            </tr>
            <tr>
              <td className="pds-label">
                Have you tried committing suicide (harming yourself)?
              </td>
              <td colSpan={3}>{v(data, "attempted_self_harm")}</td>
            </tr>
            <tr>
              <td className="pds-label">During schooldays, where are you staying at?</td>
              <td colSpan={3}>{v(data, "weekday_residence")}</td>
            </tr>
            <tr>
              <td className="pds-label">Special Skills/Talents</td>
              <td>{v(data, "special_skills_talents")}</td>
              <td className="pds-label">Hobbies/Leisure Time Activities</td>
              <td>{v(data, "hobbies")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--red">MEDICAL HISTORY</div>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label">Illness/Medical conditions diagnosed since birth:</td>
              <td>{v(data, "conditions_since_birth")}</td>
            </tr>
            <tr>
              <td className="pds-label">Illness/Medical conditions diagnosed in the last three (3) years:</td>
              <td>{v(data, "conditions_last_3_years")}</td>
            </tr>
            <tr>
              <td className="pds-label">
                Have you visited your Junior High School Guidance Office before to avail of its counseling and consultation services?
              </td>
              <td>{v(data, "prior_jhs_guidance_visit")}</td>
            </tr>
            <tr>
              <td className="pds-label">If Yes — service availed, date, duration & sessions, reason:</td>
              <td>{v(data, "prior_jhs_visit_details")}</td>
            </tr>
            <tr>
              <td className="pds-label">
                Have you received counseling or any form of consultation elsewhere before?
              </td>
              <td>{v(data, "prior_external_counseling")}</td>
            </tr>
            <tr>
              <td className="pds-label">If Yes — service availed, date, duration & sessions, reason:</td>
              <td>{v(data, "prior_external_counseling_details")}</td>
            </tr>
            <tr>
              <td className="pds-label">Have you ever been treated for psychological reasons?</td>
              <td>{v(data, "prior_psychological_treatment")}</td>
            </tr>
            <tr>
              <td className="pds-label">If Yes — start, end, reason, attending professional + contact:</td>
              <td>{v(data, "prior_treatment_details")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="pds-section">
        <div className="pds-section-bar pds-section-bar--yellow">
          PERSON TO CONTACT IN CASE OF EMERGENCY
        </div>
        <table className="pds-table">
          <tbody>
            <tr>
              <td className="pds-label">Name</td>
              <td>{ec.name ?? "—"}</td>
              <td className="pds-label">Relationship</td>
              <td>{ec.relationship ?? "—"}</td>
            </tr>
            <tr>
              <td className="pds-label">Address</td>
              <td colSpan={3}>{ec.address ?? "—"}</td>
            </tr>
            <tr>
              <td className="pds-label">Contact Number(s)</td>
              <td colSpan={3}>{ec.contact ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
