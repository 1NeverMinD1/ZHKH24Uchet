import { lazy, Suspense } from "react";
import BindexApp from "./App.jsx";

const RegistryApp = lazy(() => import("./registry/RegistryApp.jsx"));

export default function Root() {
  if (import.meta.env.MODE === "registry") {
    return (
      <Suspense fallback={null}>
        <RegistryApp />
      </Suspense>
    );
  }
  return <BindexApp />;
}
