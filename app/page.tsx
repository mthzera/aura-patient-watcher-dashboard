import { auth } from "@/auth";
import { LoginScreen } from "@/components/LoginScreen";
import { DashboardClient } from "@/components/DashboardClient";

/**
 * Root page — server component.
 * Checks session and renders either the login screen or the dashboard.
 */
export default async function Page() {
  const session = await auth();

  if (!session) {
    return <LoginScreen />;
  }

  return <DashboardClient user={session.user ?? {}} />;
}
