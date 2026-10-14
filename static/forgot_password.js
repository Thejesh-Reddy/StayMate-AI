"use strict";

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const emailInput = document.getElementById("email");
const forgotPasswordButton = document.getElementById(
    "forgotPasswordButton"
);
const forgotPasswordMessage = document.getElementById(
    "forgotPasswordMessage"
);

function showMessage(message, type = "error") {
    forgotPasswordMessage.textContent = message;
    forgotPasswordMessage.className = `auth-message ${type}`;
}

function clearMessage() {
    forgotPasswordMessage.textContent = "";
    forgotPasswordMessage.className = "auth-message";
}

function setLoading(isLoading) {
    forgotPasswordButton.disabled = isLoading;
    forgotPasswordButton.textContent = isLoading
        ? "Sending..."
        : "Send Reset Link";
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

forgotPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    clearMessage();

    const email = emailInput.value.trim().toLowerCase();

    if (!isValidEmail(email)) {
        showMessage("Please enter a valid email address.");
        emailInput.focus();
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                email: email
            })
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            showMessage(
                data.message ||
                data.error ||
                "Unable to process your request. Please try again."
            );
            return;
        }

        showMessage(
            data.message ||
            "If an account exists with this email, a reset link has been sent.",
            "success"
        );

        emailInput.value = "";

    } catch (error) {
        console.error("Forgot password error:", error);

        showMessage(
            "Unable to connect to the server. Please try again."
        );
    } finally {
        setLoading(false);
    }
});