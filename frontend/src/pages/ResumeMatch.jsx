
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function ResumeMatch() {
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [result, setResult] = useState(null);

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
        if (active) {
          setFetching(false);
        }
      }
    };

    fetchResumes();

    return () => {
      active = false;
    };
  }, []);

  const handleMatch = async (event) => {
    event.preventDefault();

    if (loading) return;

    setMessage("");
    setMessageType("");
    setResult(null);

    if (!resumeId) {
      setMessage("Please select a resume.");
      setMessageType("error");
      return;
    }

    const trimmedDescription = jobDescription.trim();

    if (trimmedDescription.length < 30) {
      setMessage(
        "Please enter a more complete job description (at least 30 characters)."
      );
      setMessageType("error");
      return;
    }

    if (trimmedDescription.length > 10000) {
      setMessage(
        "Job description must not exceed 10,000 characters."
      );
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        `/api/resumes/${resumeId}/match`,
        { jobDescription: trimmedDescription }
      );

      setResult(response.data);
      setMessage("Resume matching completed successfully!");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to match resume. Please try again."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const matchPercentage = Number(result?.matchPercentage);
  const hasValidPercentage =
    Number.isFinite(matchPercentage) &&
    matchPercentage >= 0 &&
    matchPercentage <= 100;

  return (
    <div className="auth-page">
      <main className="auth-main">
        <div className="auth-card">
          <h2>Resume Job Matching</h2>

          <p className="auth-description">
            Compare your resume with a job description to identify
            matching skills and areas for improvement.
          </p>

          <form onSubmit={handleMatch}>
            <div className="form-field">
              <label htmlFor="resume">Select Resume</label>

              <select
                id="resume"
                name="resume"
                value={resumeId}
                onChange={(event) => {
                  setResumeId(event.target.value);
                  setResult(null);
                  setMessage("");
                  setMessageType("");
                }}
                required
                disabled={
                  fetching || loading || resumes.length === 0
                }
              >
                <option value="">
                  {fetching
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

              {!fetching && resumes.length === 0 && (
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  Upload a resume before starting your analysis.
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="jobDescription">
                Job Description
              </label>

              <textarea
                id="jobDescription"
                name="jobDescription"
                value={jobDescription}
                onChange={(event) => {
                  setJobDescription(event.target.value);
                  setResult(null);
                }}
                placeholder="Paste the job title, responsibilities, required skills, and qualifications..."
                rows={8}
                maxLength={10000}
                required
                disabled={loading}
                aria-describedby="job-description-help"
                style={{
                  resize: "vertical",
                  minHeight: "150px",
                  lineHeight: 1.6,
                }}
              />

              <small
                id="job-description-help"
                style={{
                  display: "block",
                  marginTop: "7px",
                  color:
                    jobDescription.length > 9500
                      ? "#b91c1c"
                      : "#64748b",
                  fontSize: "12px",
                }}
              >
                Minimum 30 characters. Maximum 10,000.
                {" "}
                {jobDescription.length}/10000
              </small>
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={
                loading ||
                fetching ||
                resumes.length === 0 ||
                !resumeId ||
                jobDescription.trim().length < 30
              }
            >
              {loading ? "Analyzing resume..." : "Match Resume"}
            </button>
          </form>

          {message && (
            <p
              role={messageType === "error" ? "alert" : "status"}
              aria-live="polite"
              style={{
                marginTop: "16px",
                color:
                  messageType === "success"
                    ? "#15803d"
                    : "#b91c1c",
                fontSize: "14px",
                lineHeight: 1.6,
                overflowWrap: "anywhere",
              }}
            >
              {message}
            </p>
          )}

          {result && (
            <section
              aria-live="polite"
              style={{
                marginTop: "24px",
                padding: "20px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                background: "#f8fafc",
              }}
            >
              <h3
                style={{
                  margin: "0 0 18px",
                  fontSize: "19px",
                  color: "#172033",
                }}
              >
                Matching Results
              </h3>

              <div
                style={{
                  marginBottom: "20px",
                  padding: "18px",
                  borderRadius: "10px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Resume match percentage
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: 700,
                    color: "#4f46e5",
                  }}
                >
                  {hasValidPercentage
                    ? `${matchPercentage}%`
                    : "Not available"}
                </p>

                {hasValidPercentage && (
                  <div
                    role="progressbar"
                    aria-label="Resume match percentage"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={matchPercentage}
                    style={{
                      height: "8px",
                      marginTop: "12px",
                      overflow: "hidden",
                      borderRadius: "10px",
                      background: "#e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        width: `${matchPercentage}%`,
                        height: "100%",
                        background: "#4f46e5",
                        borderRadius: "10px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4
                  style={{
                    margin: "0 0 10px",
                    fontSize: "14px",
                    color: "#166534",
                  }}
                >
                  Matched Skills
                </h4>

                {result.matchedSkills?.length ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {result.matchedSkills.map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          background: "#dcfce7",
                          color: "#166534",
                          fontSize: "13px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: "#64748b",
                      fontSize: "14px",
                    }}
                  >
                    No matching skills found.
                  </p>
                )}
              </div>

              <div>
                <h4
                  style={{
                    margin: "0 0 10px",
                    fontSize: "14px",
                    color: "#b91c1c",
                  }}
                >
                  Missing Skills
                </h4>

                {result.missingSkills?.length ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {result.missingSkills.map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          background: "#fee2e2",
                          color: "#991b1b",
                          fontSize: "13px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: "#64748b",
                      fontSize: "14px",
                    }}
                  >
                    No missing skills identified.
                  </p>
                )}
              </div>
            </section>
          )}

          <button
            className="primary-button"
            type="button"
            onClick={() => navigate("/dashboard")}
            style={{ marginTop: "14px" }}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}

export default ResumeMatch;
