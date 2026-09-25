import AdminDashboard from "../pages/admin/AdminDashboard";
import ContentReports from "../pages/admin/ContentReports";
import SystemControls from "../pages/admin/SystemControls";
import Translations from "../pages/admin/Translations";
import UserManagement from "../pages/admin/UserManagement";

export default { title: "Pages/Admin" };

export const AdminDashboardPage = () => <AdminDashboard />;
export const ContentReportsPage = () => <ContentReports />;
export const SystemControlsPage = () => <SystemControls />;
export const TranslationsPage = () => <Translations />;
export const UserManagementPage = () => <UserManagement />;
