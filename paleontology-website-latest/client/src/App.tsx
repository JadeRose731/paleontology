import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Router, Route, Switch, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

const USE_HASH = import.meta.env.VITE_HASH_ROUTING === "true";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MembershipProvider } from "./contexts/MembershipContext";
import CmsDynamicPage from "./components/cms/CmsDynamicPage";

/** 混合 / 定制页 — 保留独立 React 实现，不走通用版式渲染 */
import Home from "./pages/Home";
import Reporting from "./pages/Reporting";
import Branches from "./pages/Branches";
import SocietyHome from "./pages/SocietyHome";
import Intro from "./pages/Intro";
import SocietyAnnouncements from "./pages/SocietyAnnouncements";
import PersonalCenter from "./pages/PersonalCenter";

function CmsCatchAll() {
  const [location] = useLocation();
  return <CmsDynamicPage routePath={location} />;
}

function AppRouter() {
  const routes = (
    <Switch>
      <Route path="/" component={SocietyHome} />
      <Route path="/intro" component={Intro} />
      <Route path="/branches" component={Branches} />
      <Route path="/personal-center" component={PersonalCenter} />
      <Route path="/party" component={Home} />
      <Route path="/reporting" component={Reporting} />
      <Route path="/society-announcements" component={SocietyAnnouncements} />

      <Route path="/404" component={NotFound} />

      {/* CMS catch-all：任意频道 route_path 均可访问，无需改代码 */}
      <Route component={CmsCatchAll} />
    </Switch>
  );

  if (USE_HASH) {
    return <Router hook={useHashLocation}>{routes}</Router>;
  }

  return routes;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <MembershipProvider>
          <TooltipProvider>
            <Toaster />
            <AppRouter />
          </TooltipProvider>
        </MembershipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
