import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from '@/lib/auth';
import { AppShell } from '@/components/shell/AppShell';
import StudentDetail from '@/routes/students/StudentDetail';
import StudentsList from '@/routes/students/StudentsList';
import AddStudent from '@/routes/students/AddStudent';
import EditStudent from '@/routes/students/EditStudent';
import ClassDetail from '@/routes/classes/ClassDetail';
import ClassesList from '@/routes/classes/ClassesList';
import AddClass from '@/routes/classes/AddClass';
import EditClass from '@/routes/classes/EditClass';
import TeachersList from '@/routes/teachers/TeachersList';
import TeacherDetail from '@/routes/teachers/TeacherDetail';
import AddTeacher from '@/routes/teachers/AddTeacher';
import EditTeacher from '@/routes/teachers/EditTeacher';
import SetupHub from '@/routes/setup/SetupHub';
import SetupSchoolYear from '@/routes/setup/SetupSchoolYear';
import SetupSections from '@/routes/setup/SetupSections';
import SetupSubjects from '@/routes/setup/SetupSubjects';
import SetupSchools from '@/routes/setup/SetupSchools';
import SetupAdmin from '@/routes/setup/SetupAdmin';
import SetupGradeLevels from '@/routes/setup/SetupGradeLevels';
import ReportsHub from '@/routes/reports/ReportsHub';
import Statistics from '@/routes/reports/Statistics';
import Alumni from '@/routes/reports/Alumni';
import Loyalty from '@/routes/reports/Loyalty';
import StudentNo from '@/routes/reports/StudentNo';
import NewEnrollees from '@/routes/reports/NewEnrollees';
import NotEnrolled from '@/routes/reports/NotEnrolled';
import ComingSoon from '@/routes/ComingSoon';
import Login from '@/routes/Login';
import PdsOld from '@/routes/PdsOld';
import PdsNew from '@/routes/PdsNew';
import PdsDone from '@/routes/PdsDone';
import GuidanceDashboard from '@/routes/guidance/Dashboard';
import GuidanceSubmissionDetail from '@/routes/guidance/SubmissionDetail';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public — no auth, no shell (students filling out PDS) */}
          <Route path="/pds/old" element={<PdsOld />} />
          <Route path="/pds/new" element={<PdsNew />} />
          <Route path="/pds/:type/done" element={<PdsDone />} />

          <Route path="/login" element={<Login />} />

          {/* Auth-gated guidance routes — own layout, no AppShell */}
          <Route element={<ProtectedRoute />}>
            <Route path="/guidance" element={<GuidanceDashboard />} />
            <Route path="/guidance/:id" element={<GuidanceSubmissionDetail />} />
          </Route>

          {/* Auth-gated registrar routes — inside AppShell */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppShell />}>
              <Route index element={<Navigate to="/students" replace />} />
              <Route path="students" element={<StudentsList />} />
              <Route path="students/new" element={<AddStudent />} />
              <Route path="students/:lrn" element={<StudentDetail />} />
              <Route path="students/:lrn/edit" element={<EditStudent />} />
              <Route path="classes" element={<ClassesList />} />
              <Route path="classes/new" element={<AddClass />} />
              <Route path="classes/:id" element={<ClassDetail />} />
              <Route path="classes/:id/edit" element={<EditClass />} />
              <Route path="teachers" element={<TeachersList />} />
              <Route path="teachers/new" element={<AddTeacher />} />
              <Route path="teachers/:id" element={<TeacherDetail />} />
              <Route path="teachers/:id/edit" element={<EditTeacher />} />
              <Route path="setup" element={<SetupHub />} />
              <Route path="setup/school-year" element={<SetupSchoolYear />} />
              <Route path="setup/sections" element={<SetupSections />} />
              <Route path="setup/subjects" element={<SetupSubjects />} />
              <Route path="setup/schools" element={<SetupSchools />} />
              <Route path="setup/admin" element={<SetupAdmin />} />
              <Route path="setup/grade-levels" element={<SetupGradeLevels />} />
              <Route path="setup/teachers" element={<Navigate to="/teachers" replace />} />
              <Route path="setup/*" element={<ComingSoon />} />
              <Route path="reports" element={<ReportsHub />} />
              <Route path="reports/statistics" element={<Statistics />} />
              <Route path="reports/alumni" element={<Alumni />} />
              <Route path="reports/loyalty" element={<Loyalty />} />
              <Route path="reports/student-no" element={<StudentNo />} />
              <Route path="reports/new-enrollees" element={<NewEnrollees />} />
              <Route path="reports/not-enrolled" element={<NotEnrolled />} />
              <Route path="reports/*" element={<ComingSoon />} />
              <Route path="*" element={<ComingSoon />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
