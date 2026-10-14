"use strict";

const resetPasswordForm = document.getElementById("resetPasswordForm");

const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const togglePasswordButton = document.getElementById("togglePassword");
const toggleConfirmPasswordButton =
    document.getElementById("toggleConfirmPassword");

const resetPasswordButton =
    document.getElementById("resetPasswordButton");

const resetPasswordMessage =
    document.getElementById("resetPasswordMessage");

const resetToken = window.RESET_TOKEN || "";

if (!resetToken) {
    showMessage("This password reset link is invalid or has expired.");
    resetPasswordButton.disabled = true;
}

function showMessage(message, type = "error") {
    resetPasswordMessage.textContent = message;
    resetPasswordMessage.className = `auth-message ${type}`;
}

function clearMessage() {
    resetPasswordMessage.textContent = "";
    resetPasswordMessage.className = "auth-message";
}

function setLoading(isLoading) {
    resetPasswordButton.disabled = isLoading;
    resetPasswordButton.textContent = isLoading
        ? "Resetting..."
        : "Reset Password";
}

function togglePasswordVisibility(input, button) {
    const isVisible = input.type === "text";

    input.type = isVisible ? "password" : "text";
    button.textContent = isVisible ? "Show" : "Hide";

    button.setAttribute(
        "aria-label",
        isVisible ? "Show password" : "Hide password"
    );

    button.setAttribute(
        "aria-pressed",
        String(!isVisible)
    );
}

function isStrongPassword(password) {
    return (
        password.length >= 8 &&
        /[A-Za-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

togglePasswordButton.addEventListener("click", function () {
    togglePasswordVisibility(passwordInput, togglePasswordButton);
});

toggleConfirmPasswordButton.addEventListener("click", function () {
    togglePasswordVisibility(
        confirmPasswordInput,
        toggleConfirmPasswordButton
    );
});

resetPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    clearMessage();

    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (!resetToken) {
        showMessage("This password reset link is invalid or has expired.");
        return;
    }

    if (!isStrongPassword(password)) {
        showMessage(
            "Password must contain at least 8 characters, including letters, numbers, and symbols."
        );
        passwordInput.focus();
        return;
    }

    console.log("Password:", JSON.stringify(password));
    console.log("Confirm password:", JSON.stringify(confirmPassword));

    if (password !== confirmPassword) {
        showMessage("Passwords do not match.");
        confirmPasswordInput.focus();
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                token: resetToken,
                password: password,
                confirm_password: confirmPassword
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
                "Unable to reset your password. Please try again."
            );
            return;
        }

        showMessage(
            data.message || "Your password has been reset successfully.",
            "success"
        );

        passwordInput.value = "";
        confirmPasswordInput.value = "";

        window.setTimeout(function () {
            window.location.href = data.redirect || "/signin";
        }, 900);

    } catch (error) {
        console.error("Reset password error:", error);

        showMessage(
            "Unable to connect to the server. Please try again."
        );
    } finally {
        setLoading(false);
    }
});