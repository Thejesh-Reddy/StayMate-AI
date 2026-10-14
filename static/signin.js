"use strict";

const signinForm = document.getElementById("signinForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePasswordButton = document.getElementById("togglePassword");
const signinButton = document.getElementById("signinButton");
const signinMessage = document.getElementById("signinMessage");

function showMessage(message, type = "error") {
  if (!signinMessage) {
    return;
  }

  signinMessage.textContent = message;
  signinMessage.className = `auth-message ${type}`;
}

function clearMessage() {
  if (!signinMessage) {
    return;
  }

  signinMessage.textContent = "";
  signinMessage.className = "auth-message";
}

function setLoading(isLoading) {
  if (!signinButton) {
    return;
  }

  signinButton.disabled = isLoading;
  signinButton.textContent = isLoading
    ? "Signing in..."
    : "Sign In";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

if (togglePasswordButton && passwordInput) {
  togglePasswordButton.addEventListener("click", () => {
    const isPasswordVisible =
      passwordInput.type === "text";

    passwordInput.type = isPasswordVisible
      ? "password"
      : "text";

    togglePasswordButton.textContent =
      isPasswordVisible ? "Show" : "Hide";

    togglePasswordButton.setAttribute(
      "aria-label",
      isPasswordVisible
        ? "Show password"
        : "Hide password"
    );
  });
}

if (signinForm) {
  signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email) {
      showMessage("Please enter your email address.");
      emailInput.focus();
      return;
    }

    if (!isValidEmail(email)) {
      showMessage("Please enter a valid email address.");
      emailInput.focus();
      return;
    }

    if (!password) {
      showMessage("Please enter your password.");
      passwordInput.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          password
        })
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "Unable to sign in. Please check your credentials."
        );
      }

      showMessage(
        data.message || "Login successful. Redirecting...",
        "success"
      );

      window.setTimeout(() => {
        window.location.href = data.redirect || "/";
      }, 500);
    } catch (error) {
      showMessage(
        error.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  });
}