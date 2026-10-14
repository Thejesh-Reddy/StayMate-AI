import re
import secrets
import time

from datetime import datetime, timedelta

from flask import (
    Blueprint,
    jsonify,
    request,
    session,
)

from werkzeug.security import (
    check_password_hash,
    generate_password_hash,
)

from services.email_service import (
    send_otp_email,
)


auth_bp = Blueprint("auth", __name__)


# In-memory OTP storage
# email -> {
#     "otp": "123456",
#     "expires_at": timestamp,
#     "verified": False
# }
otp_store = {}


# In-memory password-reset storage
# token -> {
#     "email": "user@example.com",
#     "expires_at": timestamp
# }
reset_token_store = {}


OTP_EXPIRY_SECONDS = 10 * 60
RESET_TOKEN_EXPIRY_SECONDS = 15 * 60


def get_users_collection():
    """
    Reuse the users collection created in app.py.

    The import is placed inside the function to avoid circular imports
    while app.py imports auth_bp.
    """

    from app import get_users_collection as app_get_users_collection

    return app_get_users_collection()


def generate_otp():
    """Generate a 6-digit OTP."""

    return f"{secrets.randbelow(1000000):06d}"


def is_valid_email(email):
    """Perform basic email validation."""

    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

    return bool(re.match(pattern, email))


def is_strong_password(password):
    """
    Password must contain:

    - At least 8 characters
    - One uppercase letter
    - One lowercase letter
    - One number
    - One special character
    """

    if len(password) < 8:
        return False

    if not re.search(r"[A-Z]", password):
        return False

    if not re.search(r"[a-z]", password):
        return False

    if not re.search(r"\d", password):
        return False

    if not re.search(r"[^A-Za-z0-9]", password):
        return False

    return True


@auth_bp.route("/api/auth/send-otp", methods=["POST"])
def send_otp():
    """Generate and send an OTP to the user's email."""

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()

    if not name:
        return jsonify({
            "success": False,
            "message": "Name is required.",
        }), 400

    if not email:
        return jsonify({
            "success": False,
            "message": "Email address is required.",
        }), 400

    if not is_valid_email(email):
        return jsonify({
            "success": False,
            "message": "Please enter a valid email address.",
        }), 400

    users_collection = get_users_collection()

    existing_user = users_collection.find_one({
        "email": email,
    })

    if existing_user:
        return jsonify({
            "success": False,
            "message": "An account with this email already exists.",
        }), 409

    otp = generate_otp()

    otp_store[email] = {
        "name": name,
        "otp": otp,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
        "verified": False,
    }

    success, error = send_otp_email(
        to_email=email,
        otp=otp,
    )

    if not success:
        otp_store.pop(email, None)

        return jsonify({
            "success": False,
            "message": "Failed to send OTP email.",
            "error": error,
        }), 500

    return jsonify({
        "success": True,
        "message": "OTP sent successfully to your email.",
    }), 200


@auth_bp.route("/api/auth/resend-otp", methods=["POST"])
def resend_otp():
    """Generate and send a fresh OTP."""

    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()

    if not email:
        return jsonify({
            "success": False,
            "message": "Email address is required.",
        }), 400

    if not is_valid_email(email):
        return jsonify({
            "success": False,
            "message": "Please enter a valid email address.",
        }), 400

    existing_otp_data = otp_store.get(email)

    if not existing_otp_data:
        return jsonify({
            "success": False,
            "message": "Please start the signup process again.",
        }), 400

    otp = generate_otp()

    otp_store[email] = {
        "name": existing_otp_data.get("name", ""),
        "otp": otp,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
        "verified": False,
    }

    success, error = send_otp_email(
        to_email=email,
        otp=otp,
    )

    if not success:
        return jsonify({
            "success": False,
            "message": "Failed to resend OTP email.",
            "error": error,
        }), 500

    return jsonify({
        "success": True,
        "message": "A new OTP has been sent.",
    }), 200


@auth_bp.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    """Verify the OTP entered by the user."""

    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    otp = str(data.get("otp", "")).strip()

    if not email:
        return jsonify({
            "success": False,
            "message": "Email address is required.",
        }), 400

    if not otp:
        return jsonify({
            "success": False,
            "message": "OTP is required.",
        }), 400

    stored = otp_store.get(email)

    if not stored:
        return jsonify({
            "success": False,
            "message": "No OTP found. Please request a new OTP.",
        }), 400

    if time.time() > stored["expires_at"]:
        otp_store.pop(email, None)

        return jsonify({
            "success": False,
            "message": "OTP has expired. Please request a new OTP.",
        }), 400

    if otp != stored["otp"]:
        return jsonify({
            "success": False,
            "message": "Invalid OTP. Please try again.",
        }), 400

    stored["verified"] = True

    return jsonify({
        "success": True,
        "message": "Email verified successfully.",
    }), 200


@auth_bp.route("/api/auth/create-account", methods=["POST"])
def create_account():
    """Create a user account after email verification."""

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    confirm_password = str(data.get("confirm_password", ""))

    if not name:
        return jsonify({
            "success": False,
            "message": "Name is required.",
        }), 400

    if not email:
        return jsonify({
            "success": False,
            "message": "Email address is required.",
        }), 400

    if password != confirm_password:
        return jsonify({
            "success": False,
            "message": "Passwords do not match.",
        }), 400

    if not is_strong_password(password):
        return jsonify({
            "success": False,
            "message": (
                "Password must contain at least 8 characters, "
                "one uppercase letter, one lowercase letter, "
                "one number, and one special character."
            ),
        }), 400

    stored_otp_data = otp_store.get(email)

    if not stored_otp_data or not stored_otp_data.get("verified"):
        return jsonify({
            "success": False,
            "message": "Please verify your email before creating an account.",
        }), 400

    users_collection = get_users_collection()

    existing_user = users_collection.find_one({
        "email": email,
    })

    if existing_user:
        return jsonify({
            "success": False,
            "message": "An account with this email already exists.",
        }), 409

    user_document = {
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "role": "user",
        "created_at": datetime.utcnow(),
    }

    try:
        users_collection.insert_one(user_document)

    except Exception:
        return jsonify({
            "success": False,
            "message": "Unable to create the account. Please try again.",
        }), 500

    otp_store.pop(email, None)

    return jsonify({
        "success": True,
        "message": "Account created successfully.",
    }), 201


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    """Sign in using email and password."""

    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required.",
        }), 400

    users_collection = get_users_collection()

    user = users_collection.find_one({
        "email": email,
    })

    if not user:
        return jsonify({
            "success": False,
            "message": "Invalid email or password.",
        }), 401

    password_hash = user.get("password_hash", "")

    if not check_password_hash(password_hash, password):
        return jsonify({
            "success": False,
            "message": "Invalid email or password.",
        }), 401

    session.clear()

    session["authenticated"] = True
    session["user_email"] = user["email"]
    session["user_name"] = user.get("name", "")
    session["user_role"] = user.get("role", "user")

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "redirect": (
            "/admin"
            if session.get("user_role") == "admin"
            else "/"
        ),
    }), 200


@auth_bp.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    """Generate a password-reset token."""

    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()

    if not email:
        return jsonify({
            "success": False,
            "message": "Email address is required.",
        }), 400

    users_collection = get_users_collection()

    user = users_collection.find_one({
        "email": email,
    })

    # Use the same response whether the email exists or not.
    # This prevents account-email enumeration.
    if not user:
        return jsonify({
            "success": True,
            "message": (
                "If an account exists for this email, "
                "a password-reset link has been sent."
            ),
        }), 200

    token = secrets.token_urlsafe(32)

    reset_token_store[token] = {
        "email": email,
        "expires_at": time.time() + RESET_TOKEN_EXPIRY_SECONDS,
    }

    reset_link = (
        request.host_url.rstrip("/")
        + "/reset-password/"
        + token
    )

    # This temporarily uses the existing email service.
    # The email service will be updated next to support reset emails.
    from services.email_service import send_email

    success, error = send_email(
        to_email=email,
        subject="Reset your STAYMATE AI password",
        html_content=f"""
        <h2>STAYMATE AI Password Reset</h2>
        <p>Hello {user.get("name", "there")},</p>
        <p>Click the link below to reset your password:</p>
        <p>
            <a href="{reset_link}">
                Reset Password
            </a>
        </p>
        <p>This link expires in 15 minutes and can be used only once.</p>
        """,
    )

    if not success:
        reset_token_store.pop(token, None)

        return jsonify({
            "success": False,
            "message": "Failed to send password-reset email.",
            "error": error,
        }), 500

    return jsonify({
        "success": True,
        "message": (
            "If an account exists for this email, "
            "a password-reset link has been sent."
        ),
    }), 200


@auth_bp.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    """Reset a user's password using a valid token."""

    data = request.get_json(silent=True) or {}

    token = str(data.get("token", "")).strip()
    password = str(data.get("password", ""))
    confirm_password = str(data.get("confirm_password", ""))

    if not token:
        return jsonify({
            "success": False,
            "message": "Reset token is required.",
        }), 400

    if password != confirm_password:
        return jsonify({
            "success": False,
            "message": "Passwords do not match.",
        }), 400

    if not is_strong_password(password):
        return jsonify({
            "success": False,
            "message": (
                "Password must contain at least 8 characters, "
                "one uppercase letter, one lowercase letter, "
                "one number, and one special character."
            ),
        }), 400

    token_data = reset_token_store.get(token)

    if not token_data:
        return jsonify({
            "success": False,
            "message": "Invalid or expired reset link.",
        }), 400

    if time.time() > token_data["expires_at"]:
        reset_token_store.pop(token, None)

        return jsonify({
            "success": False,
            "message": "Reset link has expired.",
        }), 400

    users_collection = get_users_collection()

    result = users_collection.update_one(
        {
            "email": token_data["email"],
        },
        {
            "$set": {
                "password_hash": generate_password_hash(password),
                "password_updated_at": datetime.utcnow(),
            },
        },
    )

    if result.matched_count == 0:
        reset_token_store.pop(token, None)

        return jsonify({
            "success": False,
            "message": "User account was not found.",
        }), 404

    # Make the token single-use.
    reset_token_store.pop(token, None)

    return jsonify({
        "success": True,
        "message": "Password reset successfully.",
    }), 200

@auth_bp.route("/api/auth/session", methods=["GET"])
def auth_session():
    """
    Return the currently logged-in user's session details.
    """

    authenticated = bool(session.get("authenticated"))

    return jsonify({
        "success": True,
        "authenticated": authenticated,
        "user_name": session.get("user_name", ""),
        "user_email": session.get("user_email", ""),
        "user_role": session.get("user_role", "user")
    }), 200

@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    """Log out the current user."""

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully.",
        "redirect": "/signin",
    }), 200


def is_email_verified(email: str) -> bool:
    """Check whether an email has been successfully verified."""

    email = str(email or "").strip().lower()

    stored = otp_store.get(email)

    if not stored:
        return False

    if time.time() > stored["expires_at"]:
        otp_store.pop(email, None)
        return False

    return stored.get("verified", False)