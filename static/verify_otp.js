"use strict";

const verifyOtpForm = document.getElementById("verifyOtpForm");
const otpInput = document.getElementById("otp");
const otpEmail = document.getElementById("otpEmail");
const verifyOtpButton = document.getElementById("verifyOtpButton");
const resendOtpButton = document.getElementById("resendOtpButton");
const verifyOtpMessage = document.getElementById("verifyOtpMessage");

const signupName = sessionStorage.getItem("signupName") || "";
const signupEmail = sessionStorage.getItem("signupEmail") || "";

if (!signupEmail) {
    window.location.href = "/signup";
}

if (otpEmail && signupEmail) {
    otpEmail.textContent = `OTP sent to ${signupEmail}`;
}

function showMessage(message, type = "error") {
    verifyOtpMessage.textContent = message;
    verifyOtpMessage.className = `auth-message ${type}`;
}

function clearMessage() {
    verifyOtpMessage.textContent = "";
    verifyOtpMessage.className = "auth-message";
}

function setVerifyLoading(isLoading) {
    verifyOtpButton.disabled = isLoading;
    verifyOtpButton.textContent = isLoading ? "Verifying..." : "Verify OTP";
}

function setResendLoading(isLoading) {
    resendOtpButton.disabled = isLoading;
    resendOtpButton.textContent = isLoading ? "Sending..." : "Resend OTP";
}

function isValidOtp(otp) {
    return /^\d{6}$/.test(otp);
}

otpInput.addEventListener("input", function () {
    otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
});

verifyOtpForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    clearMessage();

    const otp = otpInput.value.trim();

    if (!isValidOtp(otp)) {
        showMessage("Please enter a valid six-digit OTP.");
        otpInput.focus();
        return;
    }

    setVerifyLoading(true);

    try {
        const response = await fetch("/api/auth/verify-otp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                email: signupEmail,
                otp: otp
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
                "Invalid or expired OTP. Please try again."
            );
            return;
        }

        sessionStorage.setItem("otpVerified", "true");

        showMessage(
            data.message || "Email verified successfully.",
            "success"
        );

        window.setTimeout(function () {
            window.location.href = data.redirect || "/create-password";
        }, 700);

    } catch (error) {
        console.error("OTP verification error:", error);

        showMessage(
            "Unable to connect to the server. Please try again."
        );
    } finally {
        setVerifyLoading(false);
    }
});

resendOtpButton.addEventListener("click", async function () {
    clearMessage();
    setResendLoading(true);

    try {
        const response = await fetch("/api/auth/resend-otp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                email: signupEmail
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
                "Unable to resend OTP. Please try again."
            );
            return;
        }

        showMessage(
            data.message || "A new OTP has been sent to your email.",
            "success"
        );

        otpInput.value = "";
        otpInput.focus();

    } catch (error) {
        console.error("Resend OTP error:", error);

        showMessage(
            "Unable to connect to the server. Please try again."
        );
    } finally {
        setResendLoading(false);
    }
});