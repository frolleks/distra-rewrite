import "./index.css";

import { Routes, Route } from "react-router-dom";

import { RootLayout } from "./components/layout/root";

import AuthPage from "./pages/auth/page";
import RootPage from "./pages/root/page";
import UploadPage from "./pages/upload/page";

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<RootPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Route>

        <Route path="/auth/:pathname" element={<AuthPage />} />
      </Routes>
    </>
  );
}

export default App;
