import { RouterProvider } from "react-router";
import { AppDataProvider } from "../context/AppData";
import { router } from "./routes";
export default function App() {
  return (
    <AppDataProvider>
      <RouterProvider router={router} />
    </AppDataProvider>
  );
}
