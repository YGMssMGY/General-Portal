import { Route, Routes } from "react-router-dom";
import { UIShell } from "../components/UIShell/UIShell";
import { NotFoundPage } from "../components/NotFoundPage";
import { PublicLayout } from "../features/public/PublicLayout";
import { PublicHome } from "../features/public/PublicHome";
import { EventGallery } from "../features/public/EventGallery";
import { AboutPage } from "../features/public/AboutPage";
import { PhotoGallery } from "../features/public/PhotoGallery";
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

      <Route element={<PublicLayout />}>
        <Route index element={<PublicHome />} />
        <Route path="events" element={<EventGallery />} />
        <Route path="photos" element={<PhotoGallery />} />
        <Route path="about" element={<AboutPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <UIShell />
          </ProtectedRoute>
        }
      >
        <Route path="admin" element={<DashboardPage />} />
        <Route path="admin/proposals" element={<ProposalsPage />} />
        <Route path="admin/tasks" element={<TasksPage />} />
        <Route path="admin/events" element={<EventsPage />} />
        <Route path="admin/volunteers" element={<VolunteersPage />} />
        <Route path="admin/finance" element={<FinancePage />} />
        <Route path="admin/messages" element={<MessagesPage />} />
        <Route path="admin/files" element={<FilesPage />} />
        <Route path="admin/members" element={<MembersPage />} />
        <Route path="admin/search" element={<SearchPage />} />
        <Route path="admin/activity" element={<ActivityPage />} />
        <Route
          path="admin/settings"
          element={
            <ProtectedRoute requiredRole="officer">
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
