/* ============================================================
   STAYMATE AI - Email OTP Authentication
   ============================================================ */

(function () {
    "use strict";

    let verifiedEmail = "";


    /* ========================================================
       SEND OTP
       ======================================================== */

    async function sendEmailOTP(email) {
        email = String(email || "").trim().toLowerCase();

        if (!email) {
            throw new Error("Please enter your email address.");
        }

        const response = await fetch("/api/auth/send-otp", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email
            })
        });

        const result =
            await response.json().catch(
                () => ({})
            );

        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.message ||
                "Failed to send OTP."
            );
        }

        return result;
    }


    /* ========================================================
       VERIFY OTP
       ======================================================== */

    async function verifyEmailOTP(
        email,
        otp
    ) {
        email =
            String(
                email || ""
            )
                .trim()
                .toLowerCase();

        otp =
            String(
                otp || ""
            ).trim();

        if (!email) {
            throw new Error(
                "Please enter your email address."
            );
        }

        if (!otp) {
            throw new Error(
                "Please enter the OTP."
            );
        }

        const response =
            await fetch(
                "/api/auth/verify-otp",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        otp: otp
                    })
                }
            );

        const result =
            await response.json().catch(
                () => ({})
            );

        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.message ||
                "OTP verification failed."
            );
        }

        verifiedEmail =
            email;

        return result;
    }


    /* ========================================================
       VERIFICATION STATE
       ======================================================== */

    function isEmailVerified(
        email
    ) {
        email =
            String(
                email || ""
            )
                .trim()
                .toLowerCase();

        return (
            email !== "" &&
            verifiedEmail !== "" &&
            email === verifiedEmail
        );
    }


    function getVerifiedEmail() {
        return verifiedEmail;
    }


    function clearEmailVerification() {
        verifiedEmail = "";
    }


    /* ========================================================
       EXPOSE PUBLIC API
       ======================================================== */

    window.STAYMATEAuth = {

        sendEmailOTP,

        verifyEmailOTP,

        isEmailVerified,

        getVerifiedEmail,

        clearEmailVerification

    };

})();