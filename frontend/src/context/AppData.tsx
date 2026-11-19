import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { seedState } from "../data/seed";
import type {
  Alert,
  AppSettings,
  AppState,
  Machine,
  Maintenance,
  Prediction,
  WorkOrder,
} from "../types";

type Entity = Machine | Prediction | WorkOrder | Maintenance;
interface DataContext extends AppState {
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  resetDemo: () => void;
  addMachine: (item: Machine) => void;
  updateMachine: (item: Machine) => void;
  deleteMachine: (id: string) => void;
  addPrediction: (item: Prediction) => void;
  updatePrediction: (item: Prediction) => void;
  saveWorkOrder: (item: WorkOrder) => void;
  deleteWorkOrder: (id: string) => void;
  saveMaintenance: (item: Maintenance) => void;
  updateAlert: (item: Alert) => void;
  markAllRead: () => void;
  saveSettings: (item: AppSettings) => void;
}

const KEY = "machinemitra-demo-v2";
const Context = createContext<DataContext | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppState>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "") as AppState;
    } catch {
      return seedState;
    }
  });
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("mm-auth") !== "false",
  );
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data));
  }, [data]);
  const upsert = <T extends Entity>(list: T[], item: T) =>
    list.some((x) => x.id === item.id)
      ? list.map((x) => (x.id === item.id ? item : x))
      : [item, ...list];
  const value = useMemo<DataContext>(
    () => ({
      ...data,
      authenticated,
      login: () => {
        setAuthenticated(true);
        sessionStorage.setItem("mm-auth", "true");
      },
      logout: () => {
        setAuthenticated(false);
        sessionStorage.setItem("mm-auth", "false");
      },
      resetDemo: () => setData(seedState),
      addMachine: (item) => setData((d) => ({ ...d, machines: [item, ...d.machines] })),
      updateMachine: (item) => setData((d) => ({ ...d, machines: upsert(d.machines, item) })),
      deleteMachine: (id) =>
        setData((d) => ({
          ...d,
          machines: d.machines.filter((x) => x.id !== id),
          workOrders: d.workOrders.filter((x) => x.machineId !== id),
          maintenance: d.maintenance.filter((x) => x.machineId !== id),
        })),
      addPrediction: (item) => setData((d) => ({ ...d, predictions: [item, ...d.predictions] })),
      updatePrediction: (item) =>
        setData((d) => ({ ...d, predictions: upsert(d.predictions, item) })),
      saveWorkOrder: (item) => setData((d) => ({ ...d, workOrders: upsert(d.workOrders, item) })),
      deleteWorkOrder: (id) =>
        setData((d) => ({ ...d, workOrders: d.workOrders.filter((x) => x.id !== id) })),
      saveMaintenance: (item) =>
        setData((d) => ({ ...d, maintenance: upsert(d.maintenance, item) })),
      updateAlert: (item) =>
        setData((d) => ({ ...d, alerts: d.alerts.map((x) => (x.id === item.id ? item : x)) })),
      markAllRead: () =>
        setData((d) => ({ ...d, alerts: d.alerts.map((x) => ({ ...x, read: true })) })),
      saveSettings: (settings) => setData((d) => ({ ...d, settings })),
    }),
    [data, authenticated],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppData() {
  const value = useContext(Context);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
