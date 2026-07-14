import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const HeroPage = React.lazy(() => import("./pages/HeroPage").then(m => ({ default: m.HeroPage })));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const HistoricalPage = React.lazy(() => import("./pages/HistoricalPage").then(m => ({ default: m.HistoricalPage })));
const UploadPage = React.lazy(() => import("./pages/UploadPage").then(m => ({ default: m.UploadPage })));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-[var(--color-text-secondary)]">Loading...</div>}>
        <Routes>
          <Route path="/" element={<HeroPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/historical" element={<HistoricalPage />} />
          <Route path="/dashboard/upload" element={<UploadPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
