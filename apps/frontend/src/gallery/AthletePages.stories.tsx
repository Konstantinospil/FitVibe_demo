import Dashboard from "../pages/Dashboard";
import Exercises from "../pages/Exercises";
import Feed from "../pages/Feed";
import Insights from "../pages/Insights";
import Logger from "../pages/Logger";
import Planner from "../pages/Planner";
import Profile from "../pages/Profile";
import Progress from "../pages/Progress";
import Sessions from "../pages/Sessions";
import Settings from "../pages/Settings";

export default { title: "Pages/Athlete" };

export const DashboardPage = () => <Dashboard />;
export const PlannerPage = () => <Planner />;
export const LoggerPage = () => <Logger />;
export const SessionsPage = () => <Sessions />;
export const ExercisesPage = () => <Exercises />;
export const FeedPage = () => <Feed />;
export const ProgressPage = () => <Progress />;
export const InsightsPage = () => <Insights />;
export const ProfilePage = () => <Profile />;
export const SettingsPage = () => <Settings />;
