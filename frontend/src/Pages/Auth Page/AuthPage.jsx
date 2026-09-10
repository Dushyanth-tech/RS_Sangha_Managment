import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AuthPage.css";
import decorImage from "../../assets/buddha-sunset.png";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/* ---------- tiny inline icons (no external icon lib needed) ---------- */
const EyeIcon = ({ open }) =>
  open ? (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.4 21.4 0 0 1 5.06-5.94M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 7 11 7a21.4 21.4 0 0 1-3.22 4.42M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="18" height="18">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5Z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7Z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.6C29.6 35.2 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 39.6 16.2 44 24 44Z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.6C41.4 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5Z"
    />
  </svg>
);

/* ---------- reusable field — label above input ---------- */
function Field({
  label,
  type = "text",
  value,
  onChange,
  name,
  required = true,
  withToggle = false,
}) {
  const [show, setShow] = useState(false);
  const inputType = withToggle ? (show ? "text" : "password") : type;

  return (
    <div className="field">
      <label htmlFor={name} className="field__label">
        {label}
      </label>
      <div className="field__wrap">
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          required={required}
          className={`field__input ${withToggle ? "field__input--has-toggle" : ""}`}
          autoComplete="off"
        />
        {withToggle && (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            <EyeIcon open={show} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- main component ---------- */
export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "signup"

  const [login, setLogin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const handleLoginChange = (e) =>
    setLogin((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSignupChange = (e) =>
    setSignup((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: login.email,
        password: login.password,
      });
      console.log("login success", res.data);
      const { access_token, user } = res.data;

      console.log("User type:", typeof user);
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
  
      if (user.role === "superadmin") {
        navigate("/superadmin/dashboard");
      } else if (user.role === "admin") {
        navigate("/admin/dashboard");
      }else if (user.role === "member") {
        navigate("/member/dashboard");
      }
    } catch (err) {
      setLoginError(
        err.response?.data?.detail || "Login failed. Please try again.",
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    if (signup.password !== signup.confirmPassword) {
      setSignupError("Passwords do not match");
      return;
    }
    if (!/^\d{10}$/.test(signup.phone)) {
      setSignupError("Please enter a valid 10-digit phone number");
      return;
    }

    setSignupError("");
    setSignupLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/register`, {
        username: signup.username,
        fullname: signup.fullName,
        email: signup.email,
        phone: signup.phone,
        password: signup.password,
        confirm_password: signup.confirmPassword,
      });
      console.log("signup success", res.data);
      setMode("login");
    } catch (err) {
      setSignupError(
        err.response?.data?.detail || "Registration failed. Please try again.",
      );
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="auth">
      {/* ---------------- left — welcome slogan + form card ---------------- */}
      <div className="auth__left">
        <div className="auth__header">
          <div className="auth__mark" aria-hidden="true">
            {/* replace with your logo */}R
          </div>
        </div>

        <h1 className="auth__slogan">
          {mode === "login"
            ? "Welcome back"
            : "Hello user, welcome to R S Sangha Management"}
        </h1>
        <p className="auth__subtext">
          {mode === "login"
            ? "Sign in to pick up right where you left off."
            : "Create your account to get started with us."}
        </p>

        <div className="auth__card">
          <div
            className="auth__tabs"
            role="tablist"
            aria-label="Choose login or signup"
          >
            <button
              role="tab"
              aria-selected={mode === "login"}
              className={`auth__tab ${mode === "login" ? "is-active" : ""}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Log In
            </button>
            <button
              role="tab"
              aria-selected={mode === "signup"}
              className={`auth__tab ${mode === "signup" ? "is-active" : ""}`}
              onClick={() => setMode("signup")}
              type="button"
            >
              Sign Up
            </button>
          </div>

          {mode === "login" ? (
            <form className="auth__form" onSubmit={handleLoginSubmit}>
              <Field
                label="Email"
                name="email"
                value={login.email}
                onChange={handleLoginChange}
              />
              <Field
                label="Password"
                name="password"
                value={login.password}
                onChange={handleLoginChange}
                withToggle
              />

              <div className="auth__row">
                <label className="auth__checkbox">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <a href="#forgot" className="auth__link">
                  Forgot password?
                </a>
              </div>

              {loginError && <p className="auth__error">{loginError}</p>}

              <button
                type="submit"
                className="auth__submit"
                disabled={loginLoading}
              >
                {loginLoading ? "Logging in..." : "Log In"}
              </button>

              <div className="auth__divider">
                <span>or</span>
              </div>

              <button type="button" className="auth__google">
                <GoogleIcon />
                Continue with Google
              </button>

              <p className="auth__foot">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="auth__link auth__link--strong"
                  onClick={() => setMode("signup")}
                >
                  Sign up
                </button>
              </p>
            </form>
          ) : (
            <form className="auth__form" onSubmit={handleSignupSubmit}>
              <div className="auth__grid">
                <Field
                  label="Username"
                  name="username"
                  value={signup.username}
                  onChange={handleSignupChange}
                />
                <Field
                  label="Full Name"
                  name="fullName"
                  value={signup.fullName}
                  onChange={handleSignupChange}
                />
              </div>

              <div className="auth__grid">
                <Field
                  label="Email"
                  type="email"
                  name="email"
                  value={signup.email}
                  onChange={handleSignupChange}
                />
                <Field
                  label="Phone Number"
                  type="tel"
                  name="phone"
                  value={signup.phone}
                  onChange={handleSignupChange}
                />
              </div>

              <div className="auth__grid">
                <Field
                  label="Password"
                  name="password"
                  value={signup.password}
                  onChange={handleSignupChange}
                  withToggle
                />
                <Field
                  label="Confirm Password"
                  name="confirmPassword"
                  value={signup.confirmPassword}
                  onChange={handleSignupChange}
                  withToggle
                />
              </div>

              {signupError && <p className="auth__error">{signupError}</p>}

              <button
                type="submit"
                className="auth__submit"
                disabled={signupLoading}
              >
                {signupLoading ? "Creating account..." : "Create Account"}
              </button>

              <p className="auth__foot">
                Already have an account?{" "}
                <button
                  type="button"
                  className="auth__link auth__link--strong"
                  onClick={() => setMode("login")}
                >
                  Log in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* ---------------- right — decorative panel with slogans ---------------- */}
      <div className="auth__decor">
        <img
          src={decorImage}
          className="auth__decor-bg"
          alt=""
          aria-hidden="true"
        />
        <div className="auth__decor-overlay" aria-hidden="true" />

        <div className="auth__decor-content">
          <p className="auth__decor-eyebrow">R S Sangha Management</p>
          <p className="auth__decor-quote">
            "Simplicity is the ultimate sophistication."
          </p>
          <ul className="auth__decor-list">
            <li>Organised, always in one place.</li>
            <li>Built for how you actually work.</li>
            <li>Trusted by people who value their time.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
