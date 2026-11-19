import { Navigate, createBrowserRouter } from "react-router";
import { AppLayout } from "../layouts/AppLayout";
import { useAppData } from "../context/AppData";
import { Login } from "../pages/Login";
import { Overview } from "../pages/Overview";
import { Machines } from "../pages/Machines";
import { MachineDetail } from "../pages/MachineDetail";
import { PredictionForm } from "../pages/Prediction";
import { PredictionResult } from "../pages/PredictionResult";
import { PredictionHistory } from "../pages/PredictionHistory";
import { MaintenancePage } from "../pages/Maintenance";
import { WorkOrders } from "../pages/WorkOrders";
import { ModelPerformance } from "../pages/ModelPerformance";
import { Monitoring } from "../pages/Monitoring";
import { Reports } from "../pages/Reports";
import { SettingsPage } from "../pages/Settings";
import { NotFound } from "../pages/NotFound";

function ProtectedLayout() {
  const { authenticated } = useAppData();
  return authenticated ? <AppLayout /> : <Navigate to="/login" replace />;
}
export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", Component: Overview },
      { path: "machines", Component: Machines },
      { path: "machines/:id", Component: MachineDetail },
      { path: "prediction", Component: PredictionForm },
      { path: "predictions", Component: PredictionHistory },
      { path: "predictions/:id", Component: PredictionResult },
      { path: "maintenance", Component: MaintenancePage },
      { path: "work-orders", Component: WorkOrders },
      { path: "model-performance", Component: ModelPerformance },
      { path: "monitoring", Component: Monitoring },
      { path: "reports", Component: Reports },
      { path: "settings", Component: SettingsPage },
      { path: "*", Component: NotFound },
    ],
  },
]);
