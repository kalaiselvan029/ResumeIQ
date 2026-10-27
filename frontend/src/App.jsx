
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ResumeUpload from "./pages/ResumeUpload";
import ResumeMatch from "./pages/ResumeMatch";
import MatchHistory from "./pages/MatchHistory";
import MatchDetails from "./pages/MatchDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload-resume" element={<ResumeUpload />} />
        <Route path="/resume-match" element={<ResumeMatch />} />
        <Route path="/match-history" element={<MatchHistory />} />
        <Route
  path="/match-details/:matchId"
  element={<MatchDetails />}
/>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
