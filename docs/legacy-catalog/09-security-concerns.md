# 09 — Security Concerns

Cumulative list of **security flaws observed in the legacy NPS Computerized System v2.4.2** that **must be fixed in the rebuild**. These are not feature requests — they are baseline requirements.

---

## 🚨 CRITICAL — Plaintext password storage

**Source:** Batch 8, `Teachers > List of Teachers (All)` page.

**What was observed:**
- The "List of Teachers (All)" view shows a `Password` column.
- Passwords are displayed **as plaintext** (e.g., `nagaparochial`, `france`, `201110264`, `moeweb`, `tanavenido12`, `phb200410135`, `one piece`, `GORGEOUS`, `LOVE20050811`, `lasthope24`, `flipkel`, `020286`, `saroduwatolo`, `5dmnc13`).
- Anyone with access to the Teachers list can read every teacher's password.

**Why this is critical:**
- **Industry-standard practice:** passwords must be **hashed** with a slow, salted algorithm (bcrypt, argon2, scrypt). Plaintext storage means any DB leak / screen-share / over-the-shoulder view exposes credentials.
- **Password reuse risk:** users commonly reuse passwords; an exposed password here may unlock the user's email, social accounts, banking, etc.
- **Insider threat:** any registrar/admin viewing the Teachers list can take note of passwords.
- **DepEd / school compliance:** mishandling staff credentials is likely a breach of any data-protection policy NPS has under Philippine Data Privacy Act (RA 10173).

**Mitigation in rebuild:**
- Hash all passwords with **bcrypt** (cost factor ≥ 12) or **argon2id**. Never store plaintext.
- Never expose password fields in any UI — even masked. The only password ops should be: set/reset (write-only) and verify (server-side only).
- Add password reset flow via email or admin-issued temporary token.
- Force a one-time password change on first login after migration.
- Consider rate-limiting + lockout for repeated failed logins.

---

## ⚠️ HIGH — Weak passwords observed

**Source:** Same view, Batch 8.

**What was observed:**
Examples of plaintext passwords visible:
- `nagaparochial` (institution name — guessable)
- `france`, `moeweb`, `flipkel` (short, low entropy)
- `one piece` (common reference)
- `020286` (likely a birthday — easily harvestable from social media or LRN)
- `LOVE20050811`, `5dmnc13` (mostly low-complexity)
- `GORGEOUS` (single-word, dictionary-attackable)

**Mitigation in rebuild:**
- Enforce password complexity policy: minimum 12 characters, mix of upper/lower/digit/special, ban common-password list, ban birthday-pattern passwords.
- Encourage password manager usage by allowing long passphrases.
- Optionally support **2FA** (TOTP) for registrar/admin accounts.

---

## ⚠️ MEDIUM — Plaintext student/parent contact data

**Source:** Multiple views (Class Directory, Class Form 1, Class ID Info, Edit Profile, etc.)

**What was observed:**
- Full home addresses, mobile numbers, parent names, parent contacts, parent occupations, and parent employer addresses are all plaintext in the DB and displayed openly to any user.

**Why this matters:**
- **Philippine Data Privacy Act (RA 10173)** requires schools to apply reasonable security measures over personal data of minors (most students) and their families.
- Exposure of parent occupation + employer address + contacts to any system user creates an unnecessary insider risk surface.

**Mitigation in rebuild:**
- **Role-based access control** (RBAC): not every teacher needs access to all students' parent contacts. Class advisers see their class. Subject teachers see only the students they teach. Registrar / admin / principal see broader views.
- **Audit logging**: record who viewed/exported student records, with timestamp.
- **Encryption at rest** for PII columns (especially mobile numbers, addresses, parent info).
- **Export controls**: restrict who can export PDFs of class directories.

---

## ⚠️ MEDIUM — No visible authentication on the legacy app

**Source:** Inferred from screenshots — the desktop app appears to launch directly into the main interface without a login screen captured yet.

**What is known:**
- Help menu has `Change Password`, suggesting per-user authentication exists.
- Each teacher record has Email + Password fields, suggesting accounts.
- But no login screen has been captured in the screenshots so far.

**Mitigation in rebuild:**
- **Mandatory login** before any data view.
- **Session timeout** after period of inactivity.
- **Audit log** of login events.

---

## ⚠️ MEDIUM — Encoding bug suggests DB-layer mishandling

**Source:** Multiple views — names with `ñ` characters render garbled (`AÃfÂ±onuevo` for `Añonuevo`, `CaÃfÆ'Â¢ÃfÂ±as` for `Cañas`, `BAñARIA` rendered weirdly).

**What this implies:**
- Mismatched Latin-1 / UTF-8 / Windows-1252 encoding somewhere in the storage or display chain.
- Suggests possible double-encoding bugs or improper SQL escaping → potential **SQL injection** or **XSS-style** vulnerabilities depending on the rendering technology.

**Mitigation in rebuild:**
- Use **UTF-8 end-to-end** (DB charset, app encoding, file I/O, exports).
- Use **parameterized queries** / prepared statements (no string concatenation in SQL).
- Validate and sanitize all inputs at the boundary; use libraries that handle encoding automatically.

---

## ⚠️ LOW — Data quality issues hint at lax validation

**Source:** Add Schools page (Batch 6), Add Sections page (Batch 7).

**What was observed:**
- Duplicate school entries (Bodega Elementary School twice with same SCHOOL ID)
- Duplicate-spelling section names (St. Alphonsus de Ligouri vs. St. Alphonsus Liguori)
- Inconsistent blank fields (some districts/types blank, some populated)
- Mismatched division/address (Buhi Central School with Muntinlupa division)

**Mitigation in rebuild:**
- Add **unique constraints** on natural keys (school by DepEd school code; section name + grade level).
- Add **input validation** / **fuzzy duplicate detection** during entry.
- Add **canonical reference data** loaded from DepEd master lists where possible.

---

## Action items for rebuild planning

When the discovery phase completes and we move to design:

1. ✅ **Authentication system** with bcrypt/argon2 password hashing
2. ✅ **RBAC** with at least the roles: `registrar`, `principal`, `coordinator`, `class_adviser`, `subject_teacher`, `guidance`, `admin`
3. ✅ **Audit logging** for sensitive operations (view PII, export, edit)
4. ✅ **PII encryption at rest** for student/parent contact info
5. ✅ **UTF-8 throughout** — no encoding bugs
6. ✅ **Parameterized queries** — no SQL injection
7. ✅ **Migration plan** that:
   - Forces password reset on every imported account
   - Cleans up data quality issues (dedupe schools, normalize spellings)
   - Preserves audit history where possible
8. ✅ **Compliance checklist** against Philippine Data Privacy Act (RA 10173) before going live
