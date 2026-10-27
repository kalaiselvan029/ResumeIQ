
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import api from "../services/api";
import "../App.css";

function MatchDetails() {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [message, setMessage] = useState("");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchMatchDetails = async () => {
      setLoading(true);
      setSuggestionsLoading(true);
      setMessage("");
      setSuggestionMessage("");
      setMatch(null);
      setSuggestions(null);

      try {
        const response = await api.get(
          `/api/resumes/matches/${matchId}`
        );

        if (active) {
          setMatch(response.data);
        }
      } catch (error) {
        if (active) {
          setMessage(
            error.response?.data?.message ||
              "Unable to load match details. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }

      try {
        const response = await api.get(
          `/api/resumes/matches/${matchId}/suggestions`
        );

        if (active) {
          setSuggestions(response.data);
        }
      } catch (error) {
        if (active) {
          setSuggestionMessage(
            error.response?.data?.message ||
              "Improvement suggestions are currently unavailable."
          );
        }
      } finally {
        if (active) setSuggestionsLoading(false);
      }
    };

    fetchMatchDetails();

    return () => {
      active = false;
    };
  }, [matchId]);

  const displaySkills = (skills) => {
    if (Array.isArray(skills)) {
      return skills.length > 0 ? skills.join(", ") : "None";
    }

    return typeof skills === "string" && skills.trim()
      ? skills
      : "None";
  };

  const normalizeList = (items) => {
    if (Array.isArray(items)) return items;
    if (typeof items === "string" && items.trim()) return [items];
    return [];
  };

  const downloadPDF = () => {
    if (!match || downloading) return;

    setDownloading(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      let y = 20;

      const addPageIfNeeded = (requiredHeight = 10) => {
        if (y + requiredHeight > pageHeight - margin) {
          doc.addPage();
          y = 20;
        }
      };

      const addTitle = (title) => {
        addPageIfNeeded(14);
        y += 3;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(title, margin, y);
        y += 8;
      };

      const addText = (label, value) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const lines = doc.splitTextToSize(
          `${label}: ${value ?? "None"}`,
          maxWidth
        );

        addPageIfNeeded(lines.length * 5 + 5);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 4;
      };

      const addList = (items) => {
        const list = normalizeList(items);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        if (list.length === 0) {
          addText("Items", "None");
          return;
        }

        list.forEach((item, index) => {
          const lines = doc.splitTextToSize(
            `${index + 1}. ${String(item)}`,
            maxWidth
          );

          addPageIfNeeded(lines.length * 5 + 4);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 3;
        });

        y += 2;
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text("ResumeIQ - Match Report", margin, y);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        margin,
        y
      );
      y += 8;

      addTitle("Match Details");
      addText("Match ID", match.matchId ?? matchId);
      addText("Resume ID", match.resumeId ?? "Not available");
      addText(
        "Match Percentage",
        match.matchPercentage != null
          ? `${match.matchPercentage}%`
          : "Not available"
      );

      addTitle("Matched Skills");
      addText("Skills", displaySkills(match.matchedSkills));

      addTitle("Missing Skills");
      addText("Skills", displaySkills(match.missingSkills));

      addTitle("Resume Skills");
      addText("Skills", displaySkills(match.resumeSkills));

      addTitle("Job Skills");
      addText("Skills", displaySkills(match.jobSkills));

      addTitle("Resume Improvement Report");

      if (suggestions) {
        addTitle("Strengths");
        addList(suggestions.strengths);

        addTitle("Missing Skills to Review");
        addList(suggestions.missingSkills);

        addTitle("Improvement Suggestions");
        addList(suggestions.suggestions);
      } else {
        addText(
          "Improvement Report",
          "Suggestions were unavailable when this report was generated."
        );
      }

      addPageIfNeeded(12);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text(
        "Suggestions use rule-based logic, not an AI model.",
        margin,
        y
      );

      doc.save(`ResumeIQ-Match-Report-${matchId}.pdf`);
    } catch {
      setSuggestionMessage(
        "Unable to generate the PDF report. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="auth-page">
      <main className="auth-main">
        <div
          className="auth-card"
          style={{ maxWidth: "800px", width: "100%" }}
        >
          <h2>Match Details</h2>

          <p className="auth-description">
            Review your resume match score, skill gaps, and
            suggested improvements.
          </p>

          {loading && (
            <p role="status" aria-live="polite">
              Loading match details...
            </p>
          )}

          {message && (
            <p
              role="alert"
              aria-live="polite"
              style={{
                color: "#b91c1c",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {message}
            </p>
          )}

          {match && !loading && (
            <>
              <section
                style={{
                  padding: "20px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "14px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#64748b",
                        fontSize: "12px",
                      }}
                    >
                      MATCH ID
                    </p>
                    <h3 style={{ margin: 0 }}>#{match.matchId}</h3>
                  </div>

                  <div>
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#64748b",
                        fontSize: "12px",
                      }}
                    >
                      RESUME ID
                    </p>
                    <h3 style={{ margin: 0 }}>
                      {match.resumeId ?? "N/A"}
                    </h3>
                  </div>

                  <div>
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#64748b",
                        fontSize: "12px",
                      }}
                    >
                      MATCH SCORE
                    </p>
                    <h3
                      style={{
                        margin: 0,
                        color: "#4f46e5",
                        fontSize: "25px",
                      }}
                    >
                      {match.matchPercentage ?? "N/A"}
                      {match.matchPercentage != null ? "%" : ""}
                    </h3>
                  </div>
                </div>
              </section>

              {[
                {
                  title: "Matched Skills",
                  value: match.matchedSkills,
                  color: "#166534",
                  background: "#f0fdf4",
                  border: "#bbf7d0",
                },
                {
                  title: "Missing Skills",
                  value: match.missingSkills,
                  color: "#991b1b",
                  background: "#fef2f2",
                  border: "#fecaca",
                },
                {
                  title: "Resume Skills",
                  value: match.resumeSkills,
                  color: "#334155",
                  background: "#f8fafc",
                  border: "#e2e8f0",
                },
                {
                  title: "Job Skills",
                  value: match.jobSkills,
                  color: "#334155",
                  background: "#f8fafc",
                  border: "#e2e8f0",
                },
              ].map((section) => (
                <section
                  key={section.title}
                  style={{
                    marginTop: "16px",
                    padding: "16px",
                    border: `1px solid ${section.border}`,
                    borderRadius: "10px",
                    background: section.background,
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 9px",
                      color: section.color,
                      fontSize: "15px",
                    }}
                  >
                    {section.title}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: "#475569",
                      fontSize: "14px",
                      lineHeight: 1.8,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {displaySkills(section.value)}
                  </p>
                </section>
              ))}

              <section style={{ marginTop: "28px" }}>
                <h2 style={{ fontSize: "20px" }}>
                  Resume Improvement Report
                </h2>

                {suggestionsLoading && (
                  <p role="status">
                    Loading improvement suggestions...
                  </p>
                )}

                {suggestionMessage && (
                  <p
                    role="status"
                    style={{
                      color: "#64748b",
                      fontSize: "14px",
                      lineHeight: 1.6,
                    }}
                  >
                    {suggestionMessage}
                  </p>
                )}

                {suggestions && !suggestionsLoading && (
                  <>
                    {[
                      {
                        title: "Strengths",
                        items: suggestions.strengths,
                      },
                      {
                        title: "Missing Skills to Review",
                        items: suggestions.missingSkills,
                      },
                      {
                        title: "Improvement Suggestions",
                        items: suggestions.suggestions,
                      },
                    ].map((section) => {
                      const items = normalizeList(section.items);

                      return (
                        <section
                          key={section.title}
                          style={{
                            marginTop: "16px",
                            padding: "16px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                          }}
                        >
                          <h3
                            style={{
                              margin: "0 0 12px",
                              fontSize: "15px",
                              color: "#172033",
                            }}
                          >
                            {section.title}
                          </h3>

                          {items.length > 0 ? (
                            section.title === "Improvement Suggestions" ? (
                              <ol
                                style={{
                                  paddingLeft: "22px",
                                  margin: 0,
                                  lineHeight: 1.8,
                                  color: "#475569",
                                }}
                              >
                                {items.map((item, index) => (
                                  <li
                                    key={`${section.title}-${index}`}
                                    style={{ marginBottom: "8px" }}
                                  >
                                    {item}
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <ul
                                style={{
                                  paddingLeft: "22px",
                                  margin: 0,
                                  lineHeight: 1.8,
                                  color: "#475569",
                                }}
                              >
                                {items.map((item, index) => (
                                  <li
                                    key={`${section.title}-${index}`}
                                    style={{ marginBottom: "8px" }}
                                  >
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            )
                          ) : (
                            <p
                              style={{
                                margin: 0,
                                color: "#64748b",
                                fontSize: "14px",
                              }}
                            >
                              No items available.
                            </p>
                          )}
                        </section>
                      );
                    })}

                    <p
                      style={{
                        marginTop: "14px",
                        color: "#64748b",
                        fontSize: "12px",
                        lineHeight: 1.6,
                      }}
                    >
                      Suggestions are generated using rule-based
                      logic, not an AI model.
                    </p>
                  </>
                )}
              </section>

              <button
                className="primary-button"
                type="button"
                onClick={downloadPDF}
                disabled={downloading}
                style={{ marginTop: "20px" }}
              >
                {downloading
                  ? "Generating PDF..."
                  : "Download PDF Report"}
              </button>
            </>
          )}

          <button
            className="primary-button"
            type="button"
            onClick={() => navigate("/match-history")}
            style={{ marginTop: "12px" }}
          >
            Back to Match History
          </button>
        </div>
      </main>
    </div>
  );
}

export default MatchDetails;
