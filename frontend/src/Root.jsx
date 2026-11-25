import BindexApp from "./App.jsx";
import RegistryApp from "./registry/RegistryApp.jsx";

export default function Root() {
  return import.meta.env.MODE === "registry" ? <RegistryApp /> : <BindexApp />;
}
