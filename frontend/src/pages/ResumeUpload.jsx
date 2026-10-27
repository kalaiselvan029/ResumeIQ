
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;

    setFile(null);
    setMessage("");
    setMessageType("");

    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();

    const isAllowed = ALLOWED_EXTENSIONS.some((extension) =>
      fileName.endsWith(extension)
    );

    if (!isAllowed) {
      setMessage("Only PDF and DOCX files are allowed.");
      setMessageType("error");
      event.target.value = "";
      return;
    }

    if (selectedFile.size === 0) {
      setMessage(
        "The selected file is empty. Please choose another file."
      );
      setMessageType("error");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setMessage("File size must not exceed 5 MB.");
      setMessageType("error");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (loading) return;

    setMessage("");
    setMessageType("");

    if (!file) {
      setMessage("Please select a valid PDF or DOCX resume.");
      setMessageType("error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const response = await api.post(
        "/api/resumes/upload",
        formData
      );

      setMessage(
        `${response.data.message || "Resume uploaded successfully."} Resume ID: ${response.data.resumeId}`
      );
      setMessageType("success");

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Resume upload failed. Please try again."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <div className="brand">
          <span className="brand-mark">R</span>
          ResumeIQ
        </div>

        <div className="visual-content">
          <h1>Understand your resume. Unlock your potential.</h1>

          <p>
            Upload your resume to explore your skills and match
            your profile with relevant job opportunities.
          </p>
        </div>

        <div className="visual-note">
          Your next career opportunity starts here.
        </div>
      </section>

      <main className="auth-main">
        <div className="auth-card">
          <h2>Upload your resume</h2>

          <p className="auth-description">
            Select your resume in PDF or DOCX format.
            Maximum file size: 5 MB.
          </p>

          <form onSubmit={handleUpload}>
            <div className="form-field">
              <label htmlFor="resume">Resume file</label>

              <input
                ref={fileInputRef}
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                disabled={loading}
                required
              />
            </div>

            {file && (
              <div
                style={{
                  padding: "14px",
                  marginBottom: "18px",
                  border: "1px solid #d1fae5",
                  borderRadius: "10px",
                  background: "#f0fdf4",
                  overflowWrap: "anywhere",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    color: "#166534",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Selected file
                </p>

                <p
                  style={{
                    margin: 0,
                    color: "#374151",
                    fontSize: "14px",
                  }}
                >
                  {file.name}
                </p>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#64748b",
                    fontSize: "12px",
                  }}
                >
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={!file || loading}
            >
              {loading ? "Uploading..." : "Upload Resume"}
            </button>
          </form>

          {message && (
            <p
              role={messageType === "error" ? "alert" : "status"}
              aria-live="polite"
              style={{
                marginTop: "16px",
                color:
                  messageType === "success" ? "#15803d" : "#b91c1c",
                fontSize: "14px",
                lineHeight: 1.6,
                overflowWrap: "anywhere",
              }}
            >
              {message}
            </p>
          )}

          <p className="auth-footer">
            <Link to="/dashboard">Back to dashboard</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default ResumeUpload;
