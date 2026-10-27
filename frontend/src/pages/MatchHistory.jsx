
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function MatchHistory() {
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState("");
  const [matches, setMatches] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [fetchingResumes, setFetchingResumes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchResumes = async () => {
      try {
        const response = await api.get("/api/resumes");

        if (active) {
          setResumes(
            Array.isArray(response.data) ? response.data : []
          );
        }
      } catch (error) {
        if (active) {
          setMessage(
            error.response?.data?.message ||
              "Unable to load resumes. Please try again."
          );
          setMessageType("error");
        }
      } finally {
        if (active) setFetchingResumes(false);
      }
    };

    fetchResumes();

    return () => {
      active = false;
    };
  }, []);

  const fetchHistory = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!resumeId) {
      setMessage("Please select a resume.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");
    setMatches([]);
    setHasSearched(false);

    try {
      const response = await api.get(
        `/api/resumes/${resumeId}/matches`
      );

      const history = Array.isArray(response.data)
        ? response.data
        : [];

      setMatches(history);
      setHasSearched(true);

      if (history.length === 0) {
        setMessage("No matching history found for this resume.");
        setMessageType("info");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to load matching history. Please try again."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const renderSkills = (skills) => {
    if (Array.isArray(skills)) {
      return skills.length ? skills.join(", ") : "None";
    }

    return skills || "None";
  };

  return (
    <div className="auth-page">
      <main className="auth-main">
        <div
          className="auth-card"
          style={{ maxWidth: "760px", width: "100%" }}
        >
          <h2>Match History</h2>

          <p className="auth-description">
            Review your previous resume analyses and revisit
            your matching results.
          </p>

          <form onSubmit={fetchHistory}>
            <div className="form-field">
              <label htmlFor="resume">Select Resume</label>

              <select
                id="resume"
                name="resume"
                value={resumeId}
                onChange={(event) => {
                  setResumeId(event.target.value);
                  setMatches([]);
                  setMessage("");
                  setMessageType("");
                  setHasSearched(false);
                }}
                disabled={fetchingResumes || loading}
                required
              >
                <option value="">
                  {fetchingResumes
                    ? "Loading resumes..."
                    : resumes.length === 0
                      ? "No resumes available"
                      : "Choose a resume"}
                </option>

                {resumes.map((resume) => (
                  <option
                    key={resume.resumeId}
                    value={resume.resumeId}
                  >
                    {resume.fileName} (ID: {resume.resumeId})
                  </option>
                ))}
              </select>

              {!fetchingResumes && resumes.length === 0 && (
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  Upload a resume before viewing matching history.
                </p>
              )}
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={
                loading ||
                fetchingResumes ||
                resumes.length === 0 ||
                !resumeId
              }
            >
              {loading ? "Loading history..." : "View History"}
            </button>
          </form>

          {message && (
            <p
              role={messageType === "error" ? "alert" : "status"}
              aria-live="polite"
              style={{
                marginTop: "16px",
                color:
                  messageType === "error"
                    ? "#b91c1c"
                    : messageType === "success"
                      ? "#15803d"
                      : "#64748b",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {message}
            </p>
          )}

          {hasSearched && matches.length > 0 && (
            <div style={{ marginTop: "26px" }}>
              <h3
                style={{
                  marginBottom: "16px",
                  fontSize: "18px",
                  color: "#172033",
                }}
              >
                Previous Analyses ({matches.length})
              </h3>

              <div
                style={{
                  display: "grid",
                  gap: "16px",
                }}
              >
                {matches.map((match) => (
                  <section
                    key={match.matchId}
                    style={{
                      padding: "20px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      background: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: "0 0 5px",
                            color: "#64748b",
                            fontSize: "12px",
                          }}
                        >
                          ANALYSIS ID
                        </p>

                        <h3
                          style={{
                            margin: 0,
                            fontSize: "17px",
                            color: "#172033",
                          }}
                        >
                          #{match.matchId}
                        </h3>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <p
                          style={{
                            margin: "0 0 5px",
                            color: "#64748b",
                            fontSize: "12px",
                          }}
                        >
                          MATCH SCORE
                        </p>

                        <p
                          style={{
                            margin: 0,
                            fontSize: "24px",
                            fontWeight: 700,
                            color: "#4f46e5",
                          }}
                        >
                          {match.matchPercentage ?? "N/A"}
                          {match.matchPercentage != null ? "%" : ""}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "16px",
                        marginBottom: "18px",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin: "0 0 7px",
                            color: "#166534",
                            fontSize: "13px",
                          }}
                        >
                          Matched Skills
                        </h4>

                        <p
                          style={{
                            margin: 0,
                            color: "#475569",
                            fontSize: "13px",
                            lineHeight: 1.7,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {renderSkills(match.matchedSkills)}
                        </p>
                      </div>

                      <div>
                        <h4
                          style={{
                            margin: "0 0 7px",
                            color: "#b91c1c",
                            fontSize: "13px",
                          }}
                        >
                          Missing Skills
                        </h4>

                        <p
                          style={{
                            margin: 0,
                            color: "#475569",
                            fontSize: "13px",
                            lineHeight: 1.7,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {renderSkills(match.missingSkills)}
                        </p>
                      </div>
                    </div>

                    <button
                      className="primary-button"
                      type="button"
                      onClick={() =>
                        navigate(`/match-details/${match.matchId}`)
                      }
                      style={{ width: "auto", padding: "0 20px" }}
                    >
                      View Details
                    </button>
                  </section>
                ))}
              </div>
            </div>
          )}

          <button
            className="primary-button"
            type="button"
            onClick={() => navigate("/dashboard")}
            style={{ marginTop: "20px" }}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}

export default MatchHistory;
