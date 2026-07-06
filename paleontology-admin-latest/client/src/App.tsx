import { Router, Route, Switch, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

// Tree-shaken at build time: when VITE_HASH_ROUTING is not set,
// the entire hash-routing code path is dead-code eliminated.
const USE_HASH = import.meta.env.VITE_HASH_ROUTING === "true";
import AdminLayout from "@/components/AdminLayout";
import LoginPage from "@/pages/admin/LoginPage";
import Dashboard from "@/pages/admin/Dashboard";
import AuditWorkbench from "@/pages/admin/AuditWorkbench";
import MemberManagement from "@/pages/admin/MemberManagement";
import NonMemberManagement from "@/pages/admin/NonMemberManagement";
import ConferenceManagement from "@/pages/admin/ConferenceManagement";
import Statistics from "@/pages/admin/Statistics";
import FinanceRecords from "@/pages/admin/FinanceRecords";
import BranchManagement from "@/pages/admin/BranchManagement";
import AuditTrail from "@/pages/admin/AuditTrail";
import RecognitionManagement from "@/pages/admin/RecognitionManagement";
import ScopeManagement from "@/pages/admin/ScopeManagement";
import ContentManagement from "@/pages/admin/cms/ContentManagement";
import ChannelManagement from "@/pages/admin/cms/ChannelManagement";
import NotFound from "@/pages/admin/NotFound";

function CmsIndexRedirect() {
  const { getDefaultCmsPath } = useAdmin();
  return <Redirect to={getDefaultCmsPath()} />;
}

function WrappedPage({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  const routes = (
    <Switch>
      <Route path="/admin/login" component={LoginPage} />
      <Route path="/admin/dashboard">
        {() => (
          <WrappedPage>
            <Dashboard />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/audit">
        {() => (
          <WrappedPage>
            <AuditWorkbench />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/users/non-members">
        {() => (
          <WrappedPage>
            <NonMemberManagement />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/users/members">
        {() => (
          <WrappedPage>
            <MemberManagement />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/conferences">
        {() => (
          <WrappedPage>
            <ConferenceManagement />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/statistics">
        {() => (
          <WrappedPage>
            <Statistics />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/finance">
        {() => (
          <WrappedPage>
            <FinanceRecords />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/branches">
        {() => (
          <WrappedPage>
            <BranchManagement />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/audit-trail">
        {() => (
          <WrappedPage>
            <AuditTrail />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/recognition">
        {() => (
          <WrappedPage>
            <RecognitionManagement />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/scope">
        {() => (
          <WrappedPage>
            <ScopeManagement />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/cms/channels">
        {() => (
          <WrappedPage>
            <ChannelManagement />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/cms/:section">
        {() => (
          <WrappedPage>
            <ContentManagement />
          </WrappedPage>
        )}
      </Route>
      <Route path="/admin/cms">
        <CmsIndexRedirect />
      </Route>
      <Route path="/">
        {() => <LoginPage />}
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );

  return (
    <AdminProvider>
      <TooltipProvider>
        <Toaster />
        {USE_HASH ? (
          <Router hook={useHashLocation}>{routes}</Router>
        ) : (
          <Router>{routes}</Router>
        )}
      </TooltipProvider>
    </AdminProvider>
  );
}
