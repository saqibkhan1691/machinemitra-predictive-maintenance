export type Risk = "Low" | "Medium" | "High";
export type Health = "Healthy" | "Attention" | "Critical" | "Offline";
export type WorkStatus = "Pending" | "Assigned" | "In Progress" | "Completed" | "Cancelled";

export interface Sensors {
  airTemperature: number;
  processTemperature: number;
  rotationalSpeed: number;
  torque: number;
  toolWear: number;
}

export interface Machine {
  id: string;
  name: string;
  type: "L" | "M" | "H";
  category: string;
  plant: string;
  location: string;
  status: Health;
  health: number;
  sensors: Sensors;
  installed: string;
  lastService: string;
}

export interface Prediction {
  id: string;
  machineId: string;
  timestamp: string;
  probability: number;
  failure: boolean;
  risk: Risk;
  action: string;
  sensors: Sensors;
  model: string;
  version: string;
  saved: boolean;
}

export interface WorkOrder {
  id: string;
  title: string;
  machineId: string;
  technician: string;
  priority: Risk;
  status: WorkStatus;
  dueDate: string;
  description: string;
  createdAt: string;
}

export interface Maintenance {
  id: string;
  machineId: string;
  title: string;
  priority: Risk;
  status: WorkStatus;
  assignee: string;
  dueDate: string;
  source: string;
}

export interface Alert {
  id: string;
  machineId: string;
  title: string;
  severity: Risk;
  createdAt: string;
  read: boolean;
  acknowledged: boolean;
  detail: string;
}

export interface AppSettings {
  name: string;
  email: string;
  role: string;
  plantName: string;
  plantLocation: string;
  emailAlerts: boolean;
  criticalAlerts: boolean;
  weeklyDigest: boolean;
  compactMode: boolean;
}

export interface AppState {
  machines: Machine[];
  predictions: Prediction[];
  workOrders: WorkOrder[];
  maintenance: Maintenance[];
  alerts: Alert[];
  settings: AppSettings;
}

export interface PredictionRequest extends Sensors {
  machineId: string;
  productType: "L" | "M" | "H";
}
