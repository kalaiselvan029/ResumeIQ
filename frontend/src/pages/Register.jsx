
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setMessage("Please fill in all fields.");
      setMessageType("error");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/auth/register", {
        name: trimmedName,
        email: trimmedEmail,
        password,
      });

      setMessage(
        response.data.message || "Registration successful. You can now sign in."
      );
      setMessageType("success");

      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Registration failed. Please try again."
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
          <h1>Build your next career opportunity.</h1>

          <p>
            Create your account to compare your resume with job
            descriptions and discover the skills you need.
          </p>
        </div>

        <div className="visual-note">
          Take the next step in your career.
        </div>
      </section>

      <main className="auth-main">
        <div className="auth-card">
          <h2>Create your account</h2>

          <p className="auth-description">
            Sign up to start reviewing your resume.
          </p>

          <form onSubmit={handleRegister}>
            <div className="form-field">
              <label htmlFor="name">Full name</label>

              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                maxLength={100}
                required
                disabled={loading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={254}
                required
                disabled={loading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={loading}
              />
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {message && (
            <p
              role="status"
              aria-live="polite"
              style={{
                marginTop: "16px",
                color: messageType === "success" ? "#15803d" : "#b91c1c",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {message}
            </p>
          )}

          <p className="auth-footer">
            Already have an account? <Link to="/">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Register;
