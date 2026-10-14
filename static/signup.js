"use strict";

const signupForm = document.getElementById("signupForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const signupButton = document.getElementById("signupButton");
const signupMessage = document.getElementById("signupMessage");

function showMessage(message, type = "error") {
    signupMessage.textContent = message;
    signupMessage.className = `auth-message ${type}`;
}

function clearMessage() {
    signupMessage.textContent = "";
    signupMessage.className = "auth-message";
}

function setLoading(isLoading) {
    signupButton.disabled = isLoading;
    signupButton.textContent = isLoading ? "Sending OTP..." : "Continue";
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    clearMessage();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();

    if (!name) {
        showMessage("Please enter your full name.");
        nameInput.focus();
        return;
    }

    if (name.length < 2) {
        showMessage("Please enter a valid full name.");
        nameInput.focus();
        return;
    }

    if (!isValidEmail(email)) {
        showMessage("Please enter a valid email address.");
        emailInput.focus();
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/auth/send-otp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                name: name,
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
                "Unable to send OTP. Please try again."
            );
            return;
        }

        sessionStorage.setItem("signupName", name);
        sessionStorage.setItem("signupEmail", email);

        showMessage(
            data.message || "OTP sent successfully to your email.",
            "success"
        );

        window.setTimeout(function () {
            window.location.href = data.redirect || "/verify-otp";
        }, 700);

    } catch (error) {
        console.error("Signup error:", error);
        showMessage(
            "Unable to connect to the server. Please try again."
        );
    } finally {
        setLoading(false);
    }
});