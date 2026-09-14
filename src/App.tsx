/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Onboarding } from './pages/Onboarding';
import { OwnerLayout } from './layouts/OwnerLayout';
import { Dashboard } from './pages/owner/Dashboard';
import { Clients } from './pages/owner/Clients';
import { ClientProfile } from './pages/owner/ClientProfile';
import { EditClient } from './pages/owner/EditClient';
import { Trainers } from './pages/owner/Trainers';
import { TrainerProfile } from './pages/owner/TrainerProfile';
import { EditTrainer } from './pages/owner/EditTrainer';
import { Settings } from './pages/owner/Settings';
import { Branding } from './pages/owner/Branding';
import { Exercises } from './pages/owner/Exercises';
import { Programs } from './pages/owner/Programs';
import { NewProgram } from './pages/owner/NewProgram';
import { ProgramDetail } from './pages/owner/ProgramDetail';
import { WorkoutBuilder } from './pages/owner/WorkoutBuilder';
import { AssignProgramPage } from './pages/owner/AssignProgramPage';
import { ClientLayout } from './layouts/ClientLayout';
import { ClientDashboard } from './pages/client/ClientDashboard';
import { ClientWorkouts } from './pages/client/ClientWorkouts';
import { ClientWorkoutPlayer } from './pages/client/ClientWorkoutPlayer';
import { ClientWorkoutHistory } from './pages/client/ClientWorkoutHistory';
import { ClientProgress } from './pages/client/ClientProgress';
import { NutritionPage } from './pages/NutritionPage';
import { ClientNutritionPage } from './pages/ClientNutritionPage';
import CheckInsPage from './pages/owner/CheckInsPage';
import CheckInReviewDetail from './pages/owner/CheckInReviewDetail';
import ClientAccountability from './pages/client/ClientAccountability';
import ClientCheckInForm from './pages/client/ClientCheckInForm';
import ClientAICoach from './pages/client/ClientAICoach';
import { TenantThemeProvider } from './components/TenantThemeProvider';
import { BillingPage } from './pages/owner/Billing';

export default function App() {
  return (
    <AuthProvider>
      <TenantThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          <Route path="/client" element={<ClientLayout />}>
            <Route index element={<Navigate to="/client/dashboard" replace />} />
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="workouts" element={<ClientWorkouts />} />
            <Route path="workouts/:workoutId" element={<ClientWorkoutPlayer />} />
            <Route path="workouts/history" element={<ClientWorkoutHistory />} />
            <Route path="nutrition" element={<ClientNutritionPage />} />
            <Route path="accountability" element={<ClientAccountability />} />
            <Route path="check-in/:checkInId" element={<ClientCheckInForm />} />
            <Route path="progress" element={<ClientProgress />} />
            <Route path="ai-coach" element={<ClientAICoach />} />
            <Route path="profile" element={<ClientDashboard />} />
          </Route>

          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:clientId" element={<ClientProfile />} />
            <Route path="clients/:clientId/edit" element={<EditClient />} />
            <Route path="trainers" element={<Trainers />} />
            <Route path="trainers/:trainerId" element={<TrainerProfile />} />
            <Route path="trainers/:trainerId/edit" element={<EditTrainer />} />
            <Route path="programs" element={<Programs />} />
            <Route path="programs/new" element={<NewProgram />} />
            <Route path="programs/:programId" element={<ProgramDetail />} />
            <Route path="programs/:programId/assign" element={<AssignProgramPage />} />
            <Route path="programs/:programId/builder" element={<WorkoutBuilder />} />
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="check-ins" element={<CheckInsPage />} />
            <Route path="check-ins/:checkInId" element={<CheckInReviewDetail />} />
            <Route path="exercises" element={<Exercises />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/billing" element={<BillingPage />} />
            <Route path="branding" element={<Branding />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </TenantThemeProvider>
    </AuthProvider>
  );
}
