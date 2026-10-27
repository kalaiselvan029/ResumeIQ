
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function Dashboard() {
  const navigate = useNavigate();

  const name = sessionStorage.getItem("name") || "User";
  const email = sessionStorage.getItem("email") || "";

  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsAvailable, setStatsAvailable] = useState(true);

  const [matchStats, setMatchStats] = useState({
    total: 0,
    average: 0,
    best: 0,
  });

  const [message, setMessage] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchResumes = useCallback(async () => {
    try {
      const response = await api.get("/api/resumes");

      const resumeList = Array.isArray(response.data)
        ? response.data
        : [];

      setResumes(resumeList);

      if (resumeList.length === 0) {
        setMatchStats({
          total: 0,
          average: 0,
          best: 0,
        });
        setStatsAvailable(true);
        return;
      }

      const historyResults = await Promise.all(
        resumeList.map(async (resume) => {
          try {
            const historyResponse = await api.get(
              `/api/resumes/${resume.resumeId}/matches`
            );

            return Array.isArray(historyResponse.data)
              ? historyResponse.data
              : null;
          } catch {
            return null;
          }
        })
      );

      const allHistoriesLoaded = historyResults.every(
        (history) => history !== null
      );

      setStatsAvailable(allHistoriesLoaded);

      const allMatches = historyResults.flatMap(
        (history) => history || []
      );

      const scores = allMatches
        .map((match) => Number(match.matchPercentage))
        .filter(
          (score) =>
            Number.isFinite(score) && score >= 0 && score <= 100
        );

      setMatchStats({
        total: allMatches.length,
        average:
          scores.length > 0
            ? scores.reduce((sum, score) => sum + score, 0) /
              scores.length
            : 0,
        best: scores.length > 0 ? Math.max(...scores) : 0,
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to load resumes. Please try again."
      );
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleDownload = async (resume) => {
    if (downloadingId !== null || deletingId !== null) return;

    setDownloadingId(resume.resumeId);
    setMessage("");

    let blobUrl;

    try {
      const response = await api.get(
        `/api/resumes/${resume.resumeId}/download`,
        { responseType: "blob" }
      );

      blobUrl = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resume.fileName || "resume";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage("Resume download started successfully.");
    } catch {
      setMessage(
        "Unable to download resume. Please try again."
      );
    } finally {
      if (blobUrl) {
        window.setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
      }

      setDownloadingId(null);
    }
  };

  const handleView = async (resume) => {
    if (viewingId !== null || deletingId !== null) return;

    if (!resume.fileName?.toLowerCase().endsWith(".pdf")) {
      setMessage(
        "Preview is available for PDF files only. Please download the DOCX file."
      );
      return;
    }

    // Open synchronously so the browser is less likely to block the popup.
    const previewWindow = window.open("about:blank", "_blank");

    if (!previewWindow) {
      setMessage("Please allow pop-ups to view the resume.");
      return;
    }

    setViewingId(resume.resumeId);
    setMessage("");

    let blobUrl;

    try {
      previewWindow.document.title = "Resume Preview";
      previewWindow.document.body.textContent = "Loading resume preview...";

      const response = await api.get(
        `/api/resumes/${resume.resumeId}/view`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      blobUrl = window.URL.createObjectURL(blob);

      if (previewWindow.closed) {
        window.URL.revokeObjectURL(blobUrl);
        return;
      }

      previewWindow.location.href = blobUrl;

      // Keep the URL available while the browser PDF viewer loads.
      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch {
      if (!previewWindow.closed) {
        previewWindow.close();
      }

      setMessage(
        "Unable to view resume. Please try again."
      );
    } finally {
      setViewingId(null);
    }
  };

  const handleDelete = async (resumeId) => {
    if (deletingId !== null) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this resume?"
    );

    if (!confirmed) return;

    setDeletingId(resumeId);
    setMessage("");

    try {
      await api.delete(`/api/resumes/${resumeId}`);

      setResumes((current) =>
        current.filter(
          (resume) => resume.resumeId !== resumeId
        )
      );

      setMessage("Resume deleted successfully.");

      // Refresh dashboard statistics after deletion.
      setStatsLoading(true);
      await fetchResumes();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to delete resume. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    // Remove this application's authentication/session data.
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("name");
    sessionStorage.removeItem("email");

    navigate("/", { replace: true });
  };

  const cards = [
    {
      title: "Total Resumes",
      value: loading ? "..." : resumes.length,
      icon: "TR",
      color: "#e8f0ff",
    },
    {
      title: "Total Analyses",
      value: statsLoading
        ? "..."
        : statsAvailable
          ? matchStats.total
          : "—",
      icon: "TA",
      color: "#e6f8ef",
    },
    {
      title: "Average Match Score",
      value: statsLoading
        ? "..."
        : statsAvailable && matchStats.total > 0
          ? `${matchStats.average.toFixed(1)}%`
          : "—",
      icon: "AVG",
      color: "#fff1dc",
    },
    {
      title: "Best Match Score",
      value: statsLoading
        ? "..."
        : statsAvailable && matchStats.total > 0
          ? `${matchStats.best.toFixed(1)}%`
          : "—",
      icon: "BEST",
      color: "#f1e8ff",
    },
  ];

  return (
    <div className="auth-page">
      <main className="auth-main">
        <div
          className="auth-card"
          style={{ maxWidth: "1000px", width: "100%" }}
        >
          <h2>Welcome, {name}!</h2>

          <p className="auth-description">
            Welcome to your ResumeIQ dashboard.
          </p>

          {email && (
            <p style={{ overflowWrap: "anywhere" }}>
              Email: {email}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              margin: "24px 0",
            }}
          >
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/upload-resume")}
            >
              Upload Resume
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/resume-match")}
            >
              Match Resume
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/match-history")}
            >
              Match History
            </button>
          </div>

          <h3 style={{ textAlign: "left" }}>
            Dashboard Overview
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "16px",
              margin: "20px 0 30px",
              textAlign: "left",
            }}
          >
            {cards.map((card) => (
              <div
                key={card.title}
                style={{
                  padding: "20px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  background: "#ffffff",
                  boxShadow: "0 3px 12px rgba(0,0,0,0.04)",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    background: card.color,
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                    marginBottom: "14px",
                  }}
                >
                  {card.icon}
                </div>

                <p
                  style={{
                    color: "#64748b",
                    fontSize: "14px",
                    margin: "0 0 8px",
                  }}
                >
                  {card.title}
                </p>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "28px",
                    color: "#172033",
                    overflowWrap: "anywhere",
                  }}
                >
                  {card.value}
                </h2>
              </div>
            ))}
          </div>

          {!statsLoading && !statsAvailable && (
            <p role="status">
              Some match history could not be loaded. Refresh the
              page to try again.
            </p>
          )}

          <h3 style={{ textAlign: "left" }}>My Resumes</h3>

          {loading && <p>Loading resumes...</p>}

          {!loading && resumes.length === 0 && (
            <p>No resumes uploaded yet.</p>
          )}

          {resumes.map((resume) => {
            const isBusy =
              deletingId === resume.resumeId ||
              downloadingId === resume.resumeId ||
              viewingId === resume.resumeId;

            return (
              <div
                key={resume.resumeId}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "14px",
                  textAlign: "left",
                  background: "#ffffff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <p>
                  <strong>Resume ID:</strong> {resume.resumeId}
                </p>

                <p style={{ overflowWrap: "anywhere" }}>
                  <strong>File:</strong>{" "}
                  {resume.fileName || "Unnamed resume"}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginTop: "12px",
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleDownload(resume)}
                    disabled={
                      downloadingId !== null ||
                      viewingId !== null ||
                      deletingId !== null
                    }
                  >
                    {downloadingId === resume.resumeId
                      ? "Downloading..."
                      : "Download Resume"}
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleView(resume)}
                    disabled={
                      downloadingId !== null ||
                      viewingId !== null ||
                      deletingId !== null
                    }
                  >
                    {viewingId === resume.resumeId
                      ? "Opening..."
                      : "View Resume"}
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleDelete(resume.resumeId)}
                    disabled={
                      deletingId !== null ||
                      downloadingId !== null ||
                      viewingId !== null
                    }
                  >
                    {deletingId === resume.resumeId
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}

          {message && (
            <p role="status" aria-live="polite">
              {message}
            </p>
          )}

          <button
            type="button"
            className="primary-button"
            onClick={handleLogout}
            style={{ marginTop: "12px" }}
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
