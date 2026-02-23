import "./index.css";

import { Routes, Route } from "react-router-dom";
import AuthPage from "./pages/auth/page";
import RootPage from "./pages/root/page";

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/auth/:pathname" element={<AuthPage />} />
      </Routes>
    </>
  );
}

export default App;
