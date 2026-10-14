"use strict";

const createPasswordForm =
    document.getElementById("createPasswordForm");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirmPassword") ||
    document.getElementById("confirm-password");

const togglePasswordButton =
    document.getElementById("togglePassword");

const toggleConfirmPasswordButton =
    document.getElementById("toggleConfirmPassword") ||
    document.getElementById("toggle-confirm-password");

const createPasswordButton =
    document.getElementById("createPasswordButton");

const createPasswordMessage =
    document.getElementById("createPasswordMessage");

const signupName =
    sessionStorage.getItem("signupName") || "";

const signupEmail =
    sessionStorage.getItem("signupEmail") || "";

const otpVerified =
    sessionStorage.getItem("otpVerified");

if (!signupEmail || otpVerified !== "true") {
    window.location.href = "/signup";
} else if (
    !createPasswordForm ||
    !passwordInput ||
    !confirmPasswordInput ||
    !createPasswordButton ||
    !createPasswordMessage
) {
    console.error(
        "Create password page is missing one or more required elements."
    );
} else {
    function showMessage(message, type = "error") {
        createPasswordMessage.textContent = message;
        createPasswordMessage.className = `auth-message ${type}`;
    }

    function clearMessage() {
        createPasswordMessage.textContent = "";
        createPasswordMessage.className = "auth-message";
    }

    function setLoading(isLoading) {
        createPasswordButton.disabled = isLoading;
        createPasswordButton.textContent = isLoading
            ? "Creating Account..."
            : "Create Account";
    }

    function togglePasswordVisibility(input, button) {
        if (!input || !button) {
            return;
        }

        const isPasswordVisible = input.type === "text";

        input.type = isPasswordVisible
            ? "password"
            : "text";

        button.textContent = isPasswordVisible
            ? "Show"
            : "Hide";

        button.setAttribute(
            "aria-label",
            isPasswordVisible
                ? "Show password"
                : "Hide password"
        );

        button.setAttribute(
            "aria-pressed",
            String(!isPasswordVisible)
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

    function passwordsMatch() {
        return (
            passwordInput.value ===
            confirmPasswordInput.value
        );
    }

    function validatePasswordMatch(showError = false) {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!confirmPassword) {
            return false;
        }

        if (password !== confirmPassword) {
            if (showError) {
                showMessage("Passwords do not match.");
            }

            return false;
        }

        return true;
    }

    if (togglePasswordButton) {
        togglePasswordButton.addEventListener(
            "click",
            function () {
                togglePasswordVisibility(
                    passwordInput,
                    togglePasswordButton
                );
            }
        );
    }

    if (toggleConfirmPasswordButton) {
        toggleConfirmPasswordButton.addEventListener(
            "click",
            function () {
                togglePasswordVisibility(
                    confirmPasswordInput,
                    toggleConfirmPasswordButton
                );
            }
        );
    }

    passwordInput.addEventListener("input", function () {
        if (
            confirmPasswordInput.value &&
            passwordsMatch()
        ) {
            clearMessage();
        }
    });

    confirmPasswordInput.addEventListener(
        "input",
        function () {
            if (
                confirmPasswordInput.value &&
                !passwordsMatch()
            ) {
                showMessage("Passwords do not match.");
            } else {
                clearMessage();
            }
        }
    );

    createPasswordForm.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            clearMessage();

            const password = passwordInput.value;
            const confirmPassword =
                confirmPasswordInput.value;
            console.log("Password length:", password.length);
console.log("Confirm password length:", confirmPassword.length);
console.log(
    "Passwords equal:",
    password === confirmPassword
);
console.log(
    "Password characters:",
    [...password].map(char => char.charCodeAt(0))
);
console.log(
    "Confirm password characters:",
    [...confirmPassword].map(char => char.charCodeAt(0))
);

            if (!isStrongPassword(password)) {
                showMessage(
                    "Password must contain at least 8 characters, including letters, numbers, and symbols."
                );

                passwordInput.focus();
                return;
            }

            if (!validatePasswordMatch(true)) {
                confirmPasswordInput.focus();
                return;
            }

            setLoading(true);

            try {
                const response = await fetch(
                    "/api/auth/create-account",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        credentials: "same-origin",
                        body: JSON.stringify({
                            name: signupName,
                            email: signupEmail,
                            password: password,
                            confirm_password: confirmPassword
                        })
                    }
                );

                let data = {};

                try {
                    data = await response.json();
                } catch {
                    data = {};
                }

                if (!response.ok || data.success === false) {
                    showMessage(
                        data.message ||
                        data.error ||
                        "Unable to create your account. Please try again."
                    );

                    return;
                }

                sessionStorage.removeItem("signupName");
                sessionStorage.removeItem("signupEmail");
                sessionStorage.removeItem("otpVerified");

                showMessage(
                    data.message ||
                    "Account created successfully.",
                    "success"
                );

                window.setTimeout(function () {
                    window.location.href =
                        data.redirect || "/signin";
                }, 900);
            } catch (error) {
                console.error(
                    "Create account error:",
                    error
                );

                showMessage(
                    "Unable to connect to the server. Please try again."
                );
            } finally {
                setLoading(false);
            }
        }
    );
}