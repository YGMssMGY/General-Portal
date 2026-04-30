import { Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { NotFoundPage } from "../components/NotFoundPage";
import { ActivityPage } from "../features/activity/ActivityPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EventsPage } from "../features/events/EventsPage";
import { FilesPage } from "../features/files/FilesPage";
import { FinancePage } from "../features/finance/FinancePage";
import { MembersPage } from "../features/members/MembersPage";
import { MessagesPage } from "../features/messages/MessagesPage";
import { ProposalsPage } from "../features/proposals/ProposalsPage";
import { SearchPage } from "../features/search/SearchPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { TasksPage } from "../features/tasks/TasksPage";
import { VolunteersPage } from "../features/volunteers/VolunteersPage";
import { LoginPage } from "./LoginPage";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="proposals" element={<ProposalsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="volunteers" element={<VolunteersPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
