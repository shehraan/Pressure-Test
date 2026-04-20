import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Play from "./pages/Play";
import Results from "./pages/Results";
import Share from "./pages/Share";
import TraitLab from "./pages/TraitLab";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/play" element={<Play />} />
      <Route path="/results/:id" element={<Results />} />
      <Route path="/share/:id" element={<Share />} />
      <Route path="/admin/trait-lab" element={<TraitLab />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
