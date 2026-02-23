import { Navbar } from "../navigation/navbar";
import { Outlet } from "react-router-dom";

export function RootLayout() {
  return (
    <>
      <div className="mb-3">
        <Navbar />
      </div>
      <Outlet />
    </>
  );
}
