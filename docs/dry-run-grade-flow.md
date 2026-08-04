# DRY RUN — GRADE FLOW END TO END
### Script na susundan bukas (Registrar + mga teacher). Sunod-sunod, huwag laktawan.

---

## A. BAGO MAGSIMULA — mga account na kailangan

| Tawag natin | Role sa system | Para saan |
|---|---|---|
| **REG** | `registrar` (+ access sa Supabase ▸ SQL Editor) | Step 0, setup, huling check |
| **COORD-GS** | `acad_gs` lang | mag-assign ng load, approval worklist |
| **COORD-JHS** | `acad_jhs` lang | MAPEH pair + rotating branch |
| **COORD-PRE** | `acad_pre` lang | cross-department branch |
| **SAS-MATH** | `sas_math` lang | siya ang tunay na approver ng MATH |
| **PRIN** | `principal` lang | escalation + huling queue check |
| **T1** | `teacher` lang — MATH sa **3 sections** ng GS | pangunahing daloy |
| **T2** | `teacher` lang — kapareha ni T1 sa MAPEH (JHS) | MAPEH pair branch |
| **T3** | `teacher` lang — co-teacher sa rotating subject | rotating branch |
| **T4** | `teacher` lang — **walang** MATH load | substitute branch (tama) |
| **T5** | `teacher` lang — **may** MATH load sa ibang section | substitute branch (may bug) |

> ### ⚠ BABALA 1 — BAWAL ANG MULTI-ROLE TEST ACCOUNT
> Kung ang isang account ay may hawak na `teacher` + `acad_gs` + `sas_math` nang sabay-sabay, **wala nang saysay ang routing test.** Ang system ay pumipili ng **PINAKAMATAAS na role** ng account (`principal` → `acad_*` → `sas` → `teacher`), kaya hindi na `teacher` ang tratong ibibigay sa kanya at iba na ang mapupuntahan ng sheet niya. Bukod pa: kung ang lumabas na approver ay siya rin mismo, i-e-escalate ito sa Principal (o ma-flag na "held"). **Isang role kada test account. Kung may multi-role account, alisin ang extra roles muna sa Registrar ▸ Setup ▸ Accounts & Roles bago mag-snapshot.**

> ### ⚠ BABALA 2 — PRE-FLIGHT CHECK NG APPROVER (2 minuto, huwag laktawan)
> REG, sa **Registrar ▸ Setup ▸ Accounts & Roles**: tiyakin na **may kahit isang account** sa bawat `sas_*` area na gagamitin (lalo na `sas_math`). Kung ang isang subject ay naka-route sa isang `sas_*` role na **walang may hawak**, ang sheet ay **hindi lalabas sa kahit kaninong queue** — wala sa coordinator, wala sa Principal, at hindi rin mabibilang sa "Held · no approver". Mukhang tahimik lang pero patay na ang term. (Tingnan ang row **F** sa bug table.)

---

## STEP 0 — SNAPSHOT (REG lang, sa Supabase SQL Editor)

Ang buong dry run ay ibabalik pagkatapos, kaya **hindi kailangang mag-ingat** sa test data.

1. Buksan ang **Supabase ▸ SQL Editor**. I-paste at patakbuhin ang buong file:
   `d:/My Project(Websites)/AVA/NPS system/Registrar2/dryrun-snapshot-and-restore.sql`
   (Isang beses lang ito; safe i-re-run.)
2. Sa dulo, patakbuhin:
   ```sql
   select * from dryrun.take('bago-dryrun', 'Dry run ng grades flow 2026-07-30');
   ```
3. **Dapat makita:** isang listahan ng mga table na may bilang ng rows (`reg_students_data`, `sas_grade_reviews`, `reg_class_subjects`, `reg_substitutes`, `acad_level_teachers`, `reg_pair_switch`, `reg_term_status`).
4. **Kung walang lumabas o may error:** HUWAG ituloy ang dry run. Walang snapshot = walang balikan.

> ⚠ Ang restore ay nagbabalik sa oras ng snapshot. **Kung may TOTOONG data na maipapasok pagkatapos ng snapshot, mabubura rin iyon.** Kaya: snapshot ngayon, dry run agad, restore agad — bago pa gamitin ng iba ang system.

---

# PARTE 1 — ANG PANGUNAHING DALOY (T1, MATH, GS)

## 1. COORD-GS: mag-assign ng load
- **Sino:** COORD-GS
- **Saan:** `/academic-gs/loads` → i-click si **T1** → panel na **Teaching Assignments**
- **Gawin:** piliin ang section **Grade 5 · Rizal** → subject **MATH** → **Assign**. Gawin din ito para sa **Grade 5 · Bonifacio** at **Grade 5 · Mabini** (3 sections, kailangan ito sa Step 6).
- **Dapat makita:** lumalabas agad ang chip na "MATH" sa ilalim ng bawat section. Toast: "Subject assigned".
- **Kung iba:** kung may error na tungkol sa curriculum, hindi kasama ang MATH sa subject list ng level na iyon — kailangan munang idagdag ni REG sa **Classes ▸ Subjects & Teachers**.

## 2. T1: mag-encode ng Term 1, may SADYANG blangkong learner
- **Sino:** T1
- **Saan:** `/teacher/gradebook` → **Grade 5 · Rizal** → **MATH** → tab **Term 1**
- **Gawin:**
  a. I-set ang **HPS** (highest possible score) sa bawat activity/column.
  b. I-encode ang scores ng **lahat maliban sa huling learner** — iwanang **blangko** siya nang sadya (ito ang "dropped/transferee" case).
  c. I-encode ang **Attitude** column.
  d. Pindutin ang **Save Term 1**.
- **Dapat makita:** may nag-compute na **Initial Grade** at final grade per learner; ang blangkong learner ay "—"; nawawala ang "unsaved" warning.
- **Kung iba:** kung ayaw mag-compute, walang HPS o walang weights na naka-set para sa level (REG: **Setup ▸ Weight Components**).

## 3. ⚠ TEST NG PINAKAMALAKING BUG — Term 2 sa parehong session
- **Sino:** T1, **huwag i-reload ang page**
- **Gawin:**
  a. Mula sa naka-save na Term 1, **i-click ang tab na Term 2** (hindi reload, hindi bago ang page).
  b. I-encode ang HPS + scores + attitude ng Term 2.
  c. Pindutin ang **Save Term 2**.
  d. **Ngayon i-reload ang page (F5).** Balik sa tab na **Term 1**.
- **Dapat makita kung TAMA ang system:** kumpleto pa ang Term 1 — may laman ang lahat ng score cells, may Attitude, at may Initial Grade.
- **Kung ito ang nakita: BUG ito (row A sa table).** Blangko ang lahat ng score cells ng Term 1, blangko ang Attitude, at "—" ang Initial Grade — **pero may nakalagay pa ring Term 1 grade** sa dulo. Ibig sabihin: nawala ang encoding ng Term 1 nang **hindi ipinaalam**. Huwag isipin na kayo ang nagkamali. **I-report agad at huwag ituloy ang pag-encode ng dalawang term sa isang session** — mag-**reload muna** ng page pagkatapos ng bawat Save bago lumipat ng term.
- **Pagkatapos i-note:** i-encode muli ang Term 1 (reload → Term 1 → encode → Save → reload) para matuloy ang script.

## 4. ⚠ TEST: Submit habang may hindi pa naka-save
- **Sino:** T1
- **Saan:** gumamit ng **ibang subject na hindi mahalaga** (hal. isang test subject sa Grade 5 · Mabini) — hindi ang MATH sa Rizal.
- **Gawin:** i-type ang scores ng **buong Term 1**, **HUWAG pindutin ang Save**, pindutin agad ang **Submit for checking** → **Submit — final**.
- **Dapat makita kung TAMA:** may babala na "Save Term 1 first" o awtomatikong nase-save bago mag-submit.
- **Kung ito ang nakita: BUG ito (row B).** Tumuloy ang submit, **naging read-only ang sheet, nawala ang Save button**, at pagka-reload — **blangko ang lahat ng na-type**. Wala ring babala sa confirm dialog. Recovery: pag-reload, kung may tanong na "**Ibalik sa sheet**" (draft), pindutin iyon — pero **hindi ito mase-save** hangga't hindi ibinabalik ng checker ang term (Step 8). **Turo sa lahat ng teacher: Save muna, tapos Submit. Palagi.**

## 5. T1: Submit for checking (ang tamang paraan)
- **Sino:** T1
- **Saan:** Grade 5 · Rizal → MATH → tab **Term 1** → pindutin ang **Save Term 1** (kahit wala nang binago), tapos **Submit for checking**
- **Dapat makita sa confirm dialog:**
  - "This notifies your checker that **Term 1** is complete **for all 3 sections** of MATH"
  - "⚠ **This cannot be undone.** … Only your checker can reopen it"
  - at isang kahon: "**1 of 40 learners** has no grade for Term 1 … This does not block submission" ← ito ang sadyang blangkong learner. **Kung hindi lumitaw ang linyang ito, ang blangkong learner ay hindi na-detect** — i-note.
- **Gawin:** pindutin ang **Submit — final**.
- **Dapat makita pagkatapos:** ang badge ay naging **"For Checking"**, may amber banner na naka-lock na, at **wala nang Save button**. Wala ring **Undo** — normal ito, ang checker lang ang makakabukas.

## 6. ⚠ TEST: ano ang nangyari sa 2 pang sections
- **Sino:** T1
- **Saan:** `/teacher/gradebook` → **Grade 5 · Bonifacio** → MATH → Term 1
- **Dapat makita kung TAMA:** dapat may senyas sa Gradebook list pa lang kung alin ang naka-lock.
- **Kung ito ang nakita: BUG ito (row C).** Ang Bonifacio at Mabini ay **"For Checking" at naka-lock din** kahit **wala pa ni isang score** na na-encode doon — at walang badge sa Gradebook home na nagbabala. Ang "1 of 40 learners has no grade" sa Step 5 ay **para lang sa Rizal**, hindi sa tatlong sections. **Tandaan: isang Submit = lahat ng section ng subject na iyon.** I-note, huwag panic — mababawi sa Return (Step 8).

## 7. Approver: dapat lumabas sa worklist
- **Sino:** **SAS-MATH** (siya ang naka-route sa GS teacher + MATH)
- **Saan:** `/teacher/supervisor` → hanapin si **T1** → i-click → buksan ang **Grade 5 · Rizal · MATH**
- **Dapat makita:** view-only na sheet (walang mababago), at sa taas ang **Review — Term 1** bar: badge **"For Checking"**, may **Return for Revision** at may **Approve & Submit to Registrar** (naka-enable).
- **Kung ang Approve ay naka-gray at may nakasulat na "Hindi pa ipinapasa ng guro…":** hindi umabot ang submit — tingnan kung tama ang teacher account na na-submit (tingnan ang row G/H).
- **Kung may "Another role approves this sheet":** mali ang account na naka-login o mali ang routing (REG: **Setup ▸ Grade Approval Routing**).
- **Sabay na check (COORD-GS):** buksan ang `/academic-gs/grades`. **Dapat:** ang card ni T1 · MATH ay **HINDI** lalabas sa coordinator (kay SAS-MATH ito naka-route). Tingnan ang 4 na counter sa taas: "For your approval", "Returned to teacher", "Fully submitted", "**Held · no approver**". Kung ang "Held · no approver" ay may bilang, i-click ang card na iyon at pindutin ang section link — **kung lumabas ang buong-page error na "This sheet is not in your approval queue.", kilalang isyu ito (row E)** — pindutin lang ang "← Back to grade approval".

## 8. Approver: RETURN with a note
- **Sino:** SAS-MATH, sa parehong sheet
- **Gawin:** pindutin ang **Return for Revision** → i-type ang note: `Mali ang HPS sa Quiz 2 — 20 dapat, hindi 25.` → **Confirm**
- **Dapat makita:** badge → **"Returned"**. Sa `/academic-gs/grades` ni COORD-GS, tumaas ang counter na "Returned to teacher".
- **Kung may error:** i-note ang eksaktong mensahe.

## 9. T1: pop-up, ayusin, Mark as resolved
- **Sino:** T1
- **Saan:** `/teacher` (home) — **hindi** ang gradebook
- **Dapat makita:** pop-up / kahon: **"Grade sheets returned for revision"** na may nakasulat na note ("Mali ang HPS sa Quiz 2…"), at button na **Mark as resolved**. Nananatili ito sa portal hangga't hindi na-resolve.
- **Gawin:**
  a. Isara ang pop-up, buksan ang sheet: Grade 5 · Rizal → MATH → Term 1. **Dapat may Save button na muli** (bumukas na).
  b. Ayusin ang HPS ng Quiz 2 → **Save Term 1** → **reload**.
  c. Balik sa `/teacher` → **Mark as resolved**.
- **Dapat makita:** nawawala ang notice; ang badge sa sheet ay bumalik sa **"For Checking"**.
- **Kung wala ang pop-up:** i-note — hindi umabot ang note sa teacher, at hindi malalaman niya na may ibinalik.

## 10. Approver: APPROVE
- **Sino:** SAS-MATH → Grade 5 · Rizal · MATH → Term 1
- **Gawin:** **Approve & Submit to Registrar** → Confirm
- **Dapat makita:** badge → **"Submitted to Registrar"**; ang button ay naging "Submitted" (naka-gray). Sa tabi: "Acting here covers all **N** sections of MATH for this term" — **i-tsek kung tama ang N (dapat 3).** Kung "1 section" lang ang nakasulat, i-note (row D).

## 11. T1: kumpirmahin ang lock
- **Sino:** T1 → Grade 5 · Rizal → MATH → Term 1
- **Dapat makita:** **"Submitted to Registrar"**, lahat ng input naka-disable, walang Save, walang Submit.
- **Subukan pa:** i-click ang cell at i-type — **dapat walang mangyari**. Kung nakapasok at nakapa-Save, malaking bug — i-note agad.

## 12. Ang natitirang terms
- Ulitin ang **Step 2 (encode) → Step 5 (Save then Submit) → Step 7 → Step 10** para sa **Term 2**, tapos **Term 3**, tapos **Term 4** (kung 4 ang terms ng level).
- **⚠ Bawat term: RELOAD ang page bago lumipat ng tab.** Ito ang panlaban sa row A.
- **Dapat makita:** kapag lahat ng term ay "Submitted to Registrar", tapos na ang sheet.

## 13. Ano ang nakikita ng Registrar sa dulo
- **Sino:** REG, sa **Registrar app**
- **Saan:** **Reports ▸ Class Grades** (piliin ang Grade 5 · Rizal, MATH) at **Reports ▸ Class Gradesheets (Full)**
- **Dapat makita:** ang eksaktong grades na inapprove — kada learner, kada term, at ang blangkong learner ay talagang blangko (hindi 0, hindi 60).
- **Kung magkaiba ang numero sa nakita ng approver:** i-note ang learner + term. Ito ang pinaka-seryosong uri ng finding.
- **Tingnan din:** **Classes ▸ Grade 5 · Rizal**, at ang **Students ▸ (isang learner) ▸ Grades** — dapat pare-pareho.

---

# PARTE 2 — BRANCHES (mga special case)

## BRANCH M — MAPEH PAIR

### M-1. GS case: isang teacher ang may hawak ng dalawang bahagi
- **COORD-GS** → `/academic-gs/loads` → si T1 → piliin ang GS section at ang **MAPEH pair** → **isang teacher** para sa dalawa → **Assign**.
- **T1** → buksan ang isa sa dalawang MAPEH subject. **Dapat makita:** bar na **"MAPEH pair"** na may link papunta sa kapareha, at ang term na **HINDI** sakop ng subject na ito ay **view-only** (ayon sa rotation ng Registrar).
- **Kung nakaka-encode sa term na hindi niya sakop:** bug, i-note.
- Mag-encode sa sakop na term ng **pareho** → Submit for checking ang **bawat subject** (hiwalay ang review row kada subject code).

### M-2. JHS case: MAGKAIBANG teacher + "Ilipat na" switch
- **COORD-JHS** → `/academic-jhs/loads` → piliin ang JHS section at ang MAPEH pair → **magkaibang teacher**: si **T1** sa Music & Arts, si **T2** sa PE & Health → Assign.
- **T2 (ang PANGALAWA sa rotation)** → buksan ang sheet, tab ng **shared term (Term 2)**. **Dapat makita:** **view-only** ang Term 2 niya — hinihintay pa ang unang teacher.
- **T1 (ang UNA)** → sa kanyang sheet, shared term → pindutin ang **"Ilipat na"** → Confirm.
- **T2** → i-reload. **Dapat makita:** bukas na ngayon ang Term 2 niya, may Save.
- **Kung hindi bumukas:** i-note — dito na-stuck ang buong MAPEH ng section na iyon.
- Tapusin: pareho mag-Submit for checking; ang approver ang mag-approve ng **dalawang** subject. **Check kay REG:** ang MAPEH ng learner ay **average** ng dalawang Term 2 grade.

## BRANCH R — ROTATING SUBJECT (hal. EPP-ICT)
- **REG** → **Classes ▸ Subjects & Teachers** → tiyakin na ang section ay may **kumpletong term breakdown** (hal. `Term 1: EPP, Term 2: EPP, Term 3: ICT`). Kung kulang, **hindi maka-assign** — normal ito.
- **COORD-JHS** → `/academic-jhs/loads` → i-assign per term: **Term 1 → T1**, **Term 3 → T3**.
- **T1** → buksan ang sheet: **dapat** editable ang Term 1, at ang Term 3 ay may nakasulat na "handled by another teacher" (view-only). **T3** → kabaligtaran.
- Mag-encode, Save, Submit for checking ang **bawat** teacher **para sa sariling term lang**.
- **⚠ R-BUG TEST (gawin ito, sadyang inaasahan ang pagpalya):** **COORD-JHS** → si **T1** → panel **Substitute access (while on leave)** → i-share ang **parehong** rotating row (EPP-ICT ng section na iyon), **terms: q1**, kay **T3** — si T3 ang co-teacher ng row na iyon.
  - **T3** → buksan ang EPP-ICT ng section → tab **Term 3** (ang sariling term niya) → i-encode → **Save**.
  - **Kung ito ang nakita: BUG ito (row I).** Error: *"Term q3 ng EPP-ICT ay wala sa ibinahaging access sa iyo."* → **hindi na masave ni T3 ang SARILING term niya**, at hindi rin niya masave ang q1 ni T1. **Nakakandado ang buong row.**
  - Recovery: **COORD-JHS** → parehong panel → **End access** → tapos T3 → reload → Save. Dapat gumana na. **Aral: huwag na huwag ibibigay ang substitute access ng rotating row sa co-teacher ng parehong row.**

## BRANCH S — SUBSTITUTE TEACHER

### S-1. Tamang kaso (substitute na WALANG sariling MATH load)
- **COORD-GS** → si **T1** → panel **Substitute access (while on leave)** → i-share ang **Grade 5 · Bonifacio · MATH** (isang section lang), terms: **q4** (o kung anong term na bukas pa) kay **T4** → **Share the sheet**.
- **T4** → `/teacher/gradebook` → **Grade 5 · Bonifacio** → MATH. **Dapat makita:** badge **"Substitute"** at malinaw kung kanino ang sheet; editable lang ang **q4**, view-only ang iba.
- **Gawin:** i-encode ang q4 → **Save**. **Dapat gumana.**
- **⚠ Ngayon pindutin ang Submit for checking.** Tingnan ang confirm dialog: sasabihin nitong **"for all 1 sections"**.
  - **Kung ito ang nakita: BUG ito (row D).** Pagkatapos, **si T1 (ang may-ari)** → buksan ang **Grade 5 · Rizal · MATH** → **q4**: naging **"For Checking" at naka-lock** ang term niya sa **lahat ng 3 sections**, kahit **isang section** lang ang ibinahagi at kahit **hindi pa** niya na-encode ang Rizal at Mabini. Hindi na siya makakapag-encode — **ang checker lang** ang makakabukas (Return for Revision).
- Recovery: **SAS-MATH** → Return for Revision sa q4 → bukas na muli para kay T1.
- Pagkatapos, **COORD-GS** → **End access** → **T4** → reload: **dapat wala nang** Bonifacio · MATH sa gradebook niya.

### S-2. Panganib na kaso (substitute na MAY sariling MATH load)
- **COORD-GS** → si **T1** → **Substitute access** → i-share ang **Grade 5 · Rizal · MATH** kay **T5** (si T5 ay may **sariling** MATH load sa ibang section).
- **T5** → buksan ang **Grade 5 · Rizal · MATH** → i-encode → **Save** → **Submit for checking** (sasabihin ng dialog na "all 2 sections").
- **Dapat mangyari kung TAMA:** ang sheet ni **T1** (Rizal) ang mamarkahang **"For Checking"**.
- **Kung ito ang nakita: BUG ito (row G).**
  1. **T1** → buksan ang Rizal · MATH: **"In Progress" pa rin** — walang naipasa.
  2. **T5** → buksan ang **SARILING** section niya (na hindi naman ginalaw ninuman): **"For Checking" na at naka-lock** ito.
  3. **SAS-MATH** → buksan ang Rizal · MATH ni T1: **naka-gray ang Approve** na may "Hindi pa ipinapasa ng guro…" → **hindi ma-approve ang sheet na dapat tapusin ng substitute.**
  - Recovery (i-note na hindi ito nakasulat kahit saan sa app): **SAS-MATH** → **Return for Revision** sa sheet ni T1 (bukas ito kahit "In Progress") → **T5** → `/teacher` → pop-up → **Mark as resolved** → ngayon lang ito magiging "For Checking" at maa-approve.
  - **Aral: huwag piliin bilang substitute ang teacher na may hawak ng PAREHONG subject code sa ibang section.**

## BRANCH X — CROSS-DEPARTMENT (isang teacher, dalawang department)
- **REG / COORD-PRE / COORD-GS** → i-assign kay **T1** ang **parehong subject code** (hal. `MAT` o `GMC`) sa isang **Preschool** section **at** sa isang **Grade School** section.
- **T1** → mag-encode ng Term 1 sa **pareho** → **isang** Submit for checking lang ang kailangan (isang review row lang kasi).
- **SAS-MATH** → buksan ang **GS** section → **Approve & Submit to Registrar**.
- **Ngayon i-check:** **COORD-PRE** → `/academic-pre/grades`, at **T1** → ang **Preschool** sheet.
- **Kung ito ang nakita: BUG ito (row J).** Ang Preschool term ay **"Submitted to Registrar" at naka-lock din** — kahit **hindi kailanman binuksan** ng COORD-PRE (siya ang tunay na approver ng Preschool). Tingnan din ang linyang "covers all N sections" sa bar ni SAS-MATH — **posibleng "1 section" lang ang nakasulat samantalang 2 ang naapektuhan.**
- Recovery: si **COORD-PRE** ay makaka-**Return for Revision** — pero mabubukas din ang GS section na inapprove na.

## BRANCH U — REASSIGN PAGKATAPOS NG APPROVE (gawin ito PANGHULI)
- Simulan sa isang term na **"Submitted to Registrar"** na (Step 10) — sabihin nating Grade 5 · Rizal · MATH · Term 1 ni **T1**.
- **COORD-GS** → `/academic-gs/loads` → si **T1** → pindutin ang **"×"** sa chip na MATH ng Rizal.
- **Dapat makita kung TAMA:** confirmation na nagsasabing "may inapproved na Term 1 dito — mabubuksan ito."
- **Kung ito ang nakita: BUG ito (row K).** **Walang** confirmation, tanggal agad. Tapos i-assign ang **MATH ng Rizal kay T4** → **T4** → buksan ang sheet → **Term 1 ay editable** kahit inapprove na → mag-encode ng **ibang** score → **Save** → tingnan ni **REG** ang **Reports ▸ Class Grades**: **napalitan na ang inapprove na grades**, walang bakas, at sa `/academic-gs/grades` ay **nawala** ang card ni T1 at ang kay T4 ay "In Progress" — isang term na **naibigay na** sa Registrar.
- **Aral hangga't hindi naayos: BAWAL mag-unassign o mag-reassign ng subject na may inapprove nang term.**

---

## HULING STEP — RESTORE (REG lang, sa Supabase SQL Editor)

1. **Bago mag-restore**, tingnan muna kung gaano kalaki ang naisulat ng dry run:
   ```sql
   select * from dryrun.diff('bago-dryrun');
   select * from dryrun.extras('bago-dryrun');
   ```
2. Tapos ibalik ang lahat:
   ```sql
   select * from dryrun.restore('bago-dryrun');
   ```
3. **Dapat makita:** listahan ng table + bilang ng rows na ibinalik.
4. **Kumpirmahin sa app:** REG → **Reports ▸ Class Grades** ng mga na-test na section → **dapat wala nang test grades**. COORD-GS → `/academic-gs/loads` → si T1 → **wala nang test assignments**. `/academic-gs/grades` → mga counter ay **0** (o kung ano ang dati).
5. **⚠ Gawin ito AGAD pagkatapos ng dry run.** Anumang totoong data na maipapasok pagkatapos ng snapshot ay **mabubura** ng restore.
6. Ibalik din ang mga role na inalis sa Babala 1 (kung meron).

---

## KUNG ITO ANG NANGYARI, BUG ITO — hindi kayo ang may kasalanan

| # | Ang nakita ninyo | Ano ang ibig sabihin | Gawin |
|---|---|---|---|
| **A** | Nag-save ng **dalawang term sa isang session** (hindi nag-reload); pag-reload, **blangko** ang score cells at Attitude ng **unang** term at "—" ang Initial Grade, **pero may grade pa rin sa dulo** | **KILALANG BLOCKER.** Ang buong encoding ng unang term ay nawala/nabalik sa dating laman. Hindi ito nakikita sa screen bago mag-reload. | I-report. Panlaban: **RELOAD pagkatapos ng bawat Save, bago lumipat ng term tab.** |
| **A2** | Pagkatapos ng "Submit for checking" sa Term 1, tapos nag-Save sa Term 2 sa parehong page: error na *"Term q1 of X has been submitted and can no longer be edited"* at **lahat** ng susunod na Save ay pumapalya | **KILANG BUG** (lalabas ito kapag na-apply na ang bagong migration). Ang lunas ay **i-reload ang page** — pero walang nagsasabi niyan sa screen. | Reload, tapos Save muli. I-report. |
| **B** | Nag-type, **hindi nag-Save**, pumindot ng Submit for checking → tumuloy ito, naging read-only, **wala nang Save button**, at blangko ang server | **KILANG BLOCKER.** Napunta sa checker ang **lumang/blangkong** data at hindi na masasave ng teacher. Walang babala sa dialog. | Kung may "**Ibalik sa sheet**" (draft) pag-reload, pindutin. Kailangan pa ring **Return for Revision** ng checker bago masave. **Save muna bago Submit, palagi.** |
| **C** | Isang section lang ang tinapos, pero **lahat** ng section ng subject ay naging "For Checking" at naka-lock; walang senyas sa Gradebook home | **KILANG ISYU.** Ang Submit ay **per subject**, hindi per section — pero ang "N of M learners have no grade" sa dialog ay **isang section lang** ang binibilang. | Tapusin **lahat** ng section bago mag-Submit. Kung nagkamali: **Return for Revision** ang lunas. |
| **D** | "for all **1** sections" / "covers all **1** section" sa dialog, pero mas marami pala ang naapektuhan | **KILANG ISYU.** Mali ang bilang ng section sa dialog (lalo sa substitute at cross-department). | Huwag pagkatiwalaan ang bilang na iyon. I-report kung anong tunay na bilang. |
| **E** | Sa `/academic-*/grades`, pinindot ang section link ng isang card at lumabas ang buong-page na **"This sheet is not in your approval queue."** | **KILANG ISYU (maliit).** Iba ang naka-route na approver, o "Held · no approver" ang sheet. **Hindi** ito dead end. | Pindutin ang "← **Back to grade approval**". Para tumingin lang: `/academic-gs/gradesheets` (walang ganito ang `/academic-pre`). |
| **F** | Nag-Submit ang teacher pero **wala** ang sheet sa queue ni SAS, wala rin sa coordinator, wala rin sa Principal, at **0** ang "Held · no approver" | **KILANG BUG.** Ang naka-route na approver role ay **walang account na may hawak** (hal. wala pang `sas_math`). Hindi mabibigyan ng bilang, hindi mababalik, hindi maa-approve ng kahit sino. | **REG → Setup ▸ Accounts & Roles** → ibigay ang nawawalang `sas_*` role sa isang account, **o** palitan ang rule sa **Setup ▸ Grade Approval Routing** (Teacher · Any section → Principal/Coordinator). Bubukas agad. |
| **G** | Ang substitute ay pumindot ng Submit → **hindi** namarkahan ang sheet ng may-ari, at ang **SARILING** sheet ng substitute (sa ibang section) ang naging "For Checking" at naka-lock | **KILANG BUG.** Nangyayari ito kapag ang substitute ay **may hawak ding parehong subject code**. Naka-gray ang Approve ng may-ari ("Hindi pa ipinapasa ng guro…"). | Lunas na hindi nakasulat sa app: checker → **Return for Revision** sa sheet ng may-ari → substitute → `/teacher` → **Mark as resolved**. **Piliin ang substitute na WALANG parehong subject.** |
| **H** | Ang badge/status sa **hiram** na sheet (substitute) ay mukhang galing sa **ibang** sheet, at read-only ang sheet na dapat i-encode ng substitute | Kaugnay ng **G**. Ang badge ng hiram na sheet ay kumukuha ng status ng **substitute mismo**, hindi ng may-ari. | Same recovery as G. I-report. |
| **I** | Rotating subject: error na *"Term qN ng … ay wala sa ibinahaging access sa iyo"* kapag sinave ang **SARILING** term | **KILANG BUG.** Nabigay ang substitute access ng rotating row sa **co-teacher ng parehong row**. **Walang** makakapag-encode ng anumang term ng row na iyon. Delikado pa: **kaya niya pa ring pumindot ng Submit** — makakapasa ng blangkong term. | Coordinator → **End access** → reload → gagana muli. **Huwag ibigay ang access ng rotating row sa co-teacher nito.** |
| **J** | Isang approver ng **isang** department ang nag-Approve, tapos naka-lock din ang section ng teacher sa **ibang** department na hindi naman siya ang approver | **KILANG BUG.** Isang review row lang kada teacher × subject × term — walang section/department na hati. Kasama rito ang Preschool na dapat ay `acad_pre` lang ang may hawak. | Ang tamang approver ay makaka-**Return for Revision** (pero mabubuksan din ang legit na inapprove). I-report kung sinong dalawang office ang nagsalubong. |
| **K** | Tinanggal/pinalitan ang teacher ng isang subject na may **inapprove** nang term → editable na muli ang term ng bagong teacher → **napalitan** ang grades na nasa Registrar na, at nawala ang card ng dating teacher | **KILANG BUG — tahimik na pagkawala ng inapprove na grades.** Walang confirmation, walang audit trail. | **BAWAL mag-unassign/reassign** ng subject na may inapprove nang term hangga't hindi naayos. Kung nagawa na: kunin ang tamang grades sa **printout/report** ng approver at i-encode muli. |
| **L** | Naka-lock daw ang term pero **nakapag-type at nakapag-Save** pa rin | **HINDI** kilalang isyu — **bagong bug**. | I-note ang account, section, subject, term, at eksaktong pinindot. Mataas ang priority nito. |
| **M** | Iba ang grade na nakikita ni REG sa **Reports ▸ Class Grades** kaysa sa inapprove ng checker | Posibleng resulta ng **A**, **B**, o **K** — o bago. | I-note ang learner, subject, term, at ang dalawang numero. |

**Panghuling paalala sa mga tester:** kung ang nakita ninyo ay may katumbas na row sa table, **huwag itong i-ayos** — i-note, ituloy ang script. Ang buong database ay ibabalik sa huling step, kaya walang masisira.