import "./index.css";

import { Routes, Route } from "react-router-dom";
import AuthPage from "./pages/auth/page";
import RootPage from "./pages/root/page";
import { RootLayout } from "./components/layout/root";

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<RootPage />} />
        </Route>

        <Route path="/auth/:pathname" element={<AuthPage />} />
      </Routes>
    </>
  );
}

export default App;
