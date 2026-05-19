import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { UIShell } from "../components/UIShell/UIShell";
import { NotFoundPage } from "../components/NotFoundPage";
import { PublicLayout } from "../features/public/PublicLayout";
import { EventGallery } from "../features/public/EventGallery";
import { AboutPage } from "../features/public/AboutPage";
import { PhotoGallery } from "../features/public/PhotoGallery";
import { PortalLanding } from "../pages/PortalLanding";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoadingState } from "../components/StateViews";

const ActivityPage = lazy(() =>
  import("../features/activity/ActivityPage").then((m) => ({ default: m.ActivityPage })),
);
const DashboardPage = lazy(() =>
  import("../features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const EventsPage = lazy(() =>
  import("../features/events/EventsPage").then((m) => ({ default: m.EventsPage })),
);
const FilesPage = lazy(() =>
  import("../features/files/FilesPage").then((m) => ({ default: m.FilesPage })),
);
const FinancePage = lazy(() =>
  import("../features/finance/FinancePage").then((m) => ({ default: m.FinancePage })),
);
const MembersPage = lazy(() =>
  import("../features/members/MembersPage").then((m) => ({ default: m.MembersPage })),
);
const MessagesPage = lazy(() =>
  import("../features/messages/MessagesPage").then((m) => ({ default: m.MessagesPage })),
);
const ProposalsPage = lazy(() =>
  import("../features/proposals/ProposalsPage").then((m) => ({ default: m.ProposalsPage })),
);
const SearchPage = lazy(() =>
  import("../features/search/SearchPage").then((m) => ({ default: m.SearchPage })),
);
const SettingsPage = lazy(() =>
  import("../features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const TasksPage = lazy(() =>
  import("../features/tasks/TasksPage").then((m) => ({ default: m.TasksPage })),
);
const MeetingsPage = lazy(() =>
  import("../features/meetings/MeetingsPage").then((m) => ({ default: m.MeetingsPage })),
);
const VolunteersPage = lazy(() =>
  import("../features/volunteers/VolunteersPage").then((m) => ({ default: m.VolunteersPage })),
);
const AccountsPage = lazy(() =>
  import("../features/accounts/AccountsPage").then((m) => ({ default: m.AccountsPage })),
);
const LoginPage = lazy(() => import("./LoginPage").then((m) => ({ default: m.LoginPage })));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PortalLanding />} />
      <Route
        path="/login"
        element={
          <Lazy>
            <LoginPage />
          </Lazy>
        }
      />

      <Route element={<PublicLayout />}>
        <Route path="events" element={<EventGallery />} />
        <Route path="photos" element={<PhotoGallery />} />
        <Route path="about" element={<AboutPage />} />
      </Route>

      {/* Portal-aware routes */}
      <Route path="/:portal">
        <Route
          element={
            <ProtectedRoute>
              <UIShell />
            </ProtectedRoute>
          }
        >
          <Route
            path="dashboard"
            element={
              <Lazy>
                <DashboardPage />
              </Lazy>
            }
          />
          <Route
            path="proposals"
            element={
              <Lazy>
                <ProposalsPage />
              </Lazy>
            }
          />
          <Route
            path="tasks"
            element={
              <Lazy>
                <TasksPage />
              </Lazy>
            }
          />
          <Route
            path="events"
            element={
              <Lazy>
                <EventsPage />
              </Lazy>
            }
          />
          <Route
            path="volunteers"
            element={
              <Lazy>
                <VolunteersPage />
              </Lazy>
            }
          />
          <Route
            path="meetings"
            element={
              <Lazy>
                <MeetingsPage />
              </Lazy>
            }
          />
          <Route
            path="finance"
            element={
              <Lazy>
                <FinancePage />
              </Lazy>
            }
          />
          <Route
            path="messages"
            element={
              <Lazy>
                <MessagesPage />
              </Lazy>
            }
          />
          <Route
            path="files"
            element={
              <Lazy>
                <FilesPage />
              </Lazy>
            }
          />
          <Route
            path="members"
            element={
              <Lazy>
                <MembersPage />
              </Lazy>
            }
          />
          <Route
            path="accounts"
            element={
              <Lazy>
                <AccountsPage />
              </Lazy>
            }
          />
          <Route
            path="search"
            element={
              <Lazy>
                <SearchPage />
              </Lazy>
            }
          />
          <Route
            path="activity"
            element={
              <Lazy>
                <ActivityPage />
              </Lazy>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute requiredRole="officer">
                <Lazy>
                  <SettingsPage />
                </Lazy>
              </ProtectedRoute>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
