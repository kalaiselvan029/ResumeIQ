
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/api/auth/login", {
        email: email.trim(),
        password,
      });

      const token = response.data.token;

      if (!token) {
        setMessage(
          "Login succeeded, but authentication token was not received."
        );
        return;
      }

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("userId", response.data.userId);
      sessionStorage.setItem("name", response.data.name);
      sessionStorage.setItem("email", response.data.email);

      navigate("/dashboard");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Login failed. Please check your email and password."
      );
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
          <h1>
            Make your next career move with confidence.
          </h1>

          <p>
            Understand your resume, discover skill gaps, and
            prepare for the opportunities you want.
          </p>
        </div>

        <div className="visual-note">
          Your career journey starts with clarity.
        </div>
      </section>

      <main className="auth-main">
        <div className="auth-card">
          <h2>Welcome back</h2>

          <p className="auth-description">
            Sign in to continue to your resume dashboard.
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-field">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
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
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {message && (
            <p
              role="status"
              aria-live="polite"
              style={{
                marginTop: "16px",
                color: "#b91c1c",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {message}
            </p>
          )}

          <p className="auth-footer">
            Don't have an account?{" "}
            <Link to="/register">Create account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
