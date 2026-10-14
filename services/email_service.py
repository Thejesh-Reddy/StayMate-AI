import os
from html import escape
import smtplib
from email.message import EmailMessage

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from dotenv import load_dotenv

load_dotenv()


SMTP_HOST = os.getenv("MAIL_SERVER", "smtp.gmail.com").strip()
SMTP_PORT = int(os.getenv("MAIL_PORT", "587"))
SMTP_USE_TLS = os.getenv("MAIL_USE_TLS", "True").strip().lower() == "true"
SMTP_USERNAME = os.getenv("MAIL_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("MAIL_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("MAIL_DEFAULT_SENDER", SMTP_USERNAME).strip()


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    attachment: dict | None = None,
) -> tuple[bool, str | None]:
    """Send an email using Gmail SMTP."""

    if not SMTP_USERNAME or not SMTP_PASSWORD:
        return False, "Gmail SMTP credentials are not configured."

    if not to_email:
        return False, "Recipient email is required."

    try:
        message = EmailMessage()
        message["From"] = SMTP_FROM_EMAIL or SMTP_USERNAME
        message["To"] = to_email
        message["Subject"] = subject

        message.set_content(
            "Please view this email in an HTML-compatible email client."
        )
        message.add_alternative(html_content, subtype="html")

        if attachment:
            attachment_content = attachment["content"]
            if not isinstance(attachment_content, bytes):
                attachment_content = bytes(attachment_content)

            message.add_attachment(
                attachment_content,
                maintype="application",
                subtype="pdf",
                filename=attachment["filename"],
            )

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            if SMTP_USE_TLS:
                smtp.starttls()
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message)

        return True, None

    except Exception as exc:
        return False, str(exc)


def send_otp_email(
    to_email: str,
    otp: str,
) -> tuple[bool, str | None]:
    """
    Send email verification OTP.
    """

    subject = "STAYMATE AI - Email Verification OTP"

    safe_otp = escape(str(otp))

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>STAYMATE AI Email Verification</title>
    </head>

    <body style="
        margin: 0;
        padding: 0;
        background-color: #f5f7fb;
        font-family: Arial, sans-serif;
    ">

        <div style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        ">

            <h2 style="margin-top: 0;">
                STAYMATE AI
            </h2>

            <p>Hello,</p>

            <p>
                Use the following OTP to verify your email address:
            </p>

            <div style="
                text-align: center;
                margin: 30px 0;
            ">
                <span style="
                    display: inline-block;
                    padding: 15px 30px;
                    background: #f1f3f6;
                    border-radius: 8px;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                ">
                    {safe_otp}
                </span>
            </div>

            <p>
                This OTP is valid for <strong>10 minutes</strong>.
            </p>

            <p>
                If you did not request this verification code,
                you can safely ignore this email.
            </p>

            <br>

            <p>
                Regards,<br>
                <strong>STAYMATE AI</strong>
            </p>

        </div>

    </body>
    </html>
    """

    return send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
    )


def send_password_reset_email(
    to_email: str,
    reset_link: str,
) -> tuple[bool, str | None]:
    """
    Send password-reset email.
    """

    subject = "STAYMATE AI - Reset Your Password"

    safe_reset_link = escape(reset_link, quote=True)

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>STAYMATE AI Password Reset</title>
    </head>

    <body style="
        margin: 0;
        padding: 0;
        background-color: #f5f7fb;
        font-family: Arial, sans-serif;
    ">

        <div style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        ">

            <h2 style="margin-top: 0;">
                STAYMATE AI
            </h2>

            <p>Hello,</p>

            <p>
                We received a request to reset your STAYMATE AI password.
            </p>

            <p>
                Click the button below to create a new password:
            </p>

            <div style="
                text-align: center;
                margin: 30px 0;
            ">
                <a href="{safe_reset_link}" style="
                    display: inline-block;
                    padding: 14px 24px;
                    background-color: #2563eb;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                ">
                    Reset Password
                </a>
            </div>

            <p>
                This link is valid for <strong>15 minutes</strong>.
            </p>

            <p>
                If you did not request a password reset,
                you can safely ignore this email.
            </p>

            <br>

            <p>
                Regards,<br>
                <strong>STAYMATE AI</strong>
            </p>

        </div>

    </body>
    </html>
    """

    return send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
    )

def create_booking_confirmation_pdf(booking: dict) -> bytes:
    """
    Generate a booking confirmation PDF and return it as bytes.
    """

    pdf_buffer = BytesIO()

    document = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "BookingTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=20,
        leading=24,
        spaceAfter=8,
    )

    subtitle_style = ParagraphStyle(
        "BookingSubtitle",
        parent=styles["Normal"],
        alignment=TA_CENTER,
        fontSize=10,
        textColor=colors.grey,
        spaceAfter=18,
    )

    normal_style = ParagraphStyle(
        "BookingNormal",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
    )

    reference = str(booking.get("booking_reference", "N/A"))
    hotel_name = str(booking.get("hotel_name", "N/A"))
    hotel_address = str(booking.get("hotel_address", "N/A"))
    guest_name = str(booking.get("guest_name", "N/A"))
    mobile = str(booking.get("mobile", "N/A"))
    check_in = str(booking.get("check_in", "N/A"))
    check_out = str(booking.get("check_out", "N/A"))
    num_rooms = str(booking.get("num_rooms", 1))
    room_type = str(booking.get("room_type", "N/A"))
    num_persons = str(booking.get("num_persons", 1))
    num_children = str(booking.get("num_children", 0))
    payment_method = str(booking.get("payment_method", "N/A"))
    price_per_night = str(booking.get("price_per_night", 0))
    total_amount = str(booking.get("total_amount", 0))

    story = []

    story.append(Paragraph("STAYMATE AI", title_style))
    story.append(Paragraph("Hotel Booking Confirmation", subtitle_style))

    story.append(
        Paragraph(
            f"<b>Booking Reference:</b> {reference}",
            normal_style,
        )
    )

    story.append(Spacer(1, 12))

    booking_rows = [
        ["Hotel Name", hotel_name],
        ["Hotel Address", hotel_address],
        ["Guest Name", guest_name],
        ["Mobile Number", mobile],
        ["Check-in", check_in],
        ["Check-out", check_out],
        ["Room Type", room_type],
        ["Number of Rooms", num_rooms],
        ["Adults", num_persons],
        ["Children", num_children],
        ["Price per Night", f"₹{price_per_night}"],
        ["Payment Method", payment_method],
        ["Total Amount", f"₹{total_amount}"],
        ["Booking Status", "Confirmed"],
    ]

    table = Table(
        booking_rows,
        colWidths=[52 * mm, 112 * mm],
        repeatRows=0,
    )

    table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (0, -1),
                    colors.HexColor("#eef2ff"),
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, -1),
                    colors.black,
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (0, -1),
                    "Helvetica-Bold",
                ),
                (
                    "FONTNAME",
                    (1, 0),
                    (1, -1),
                    "Helvetica",
                ),
                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    9,
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.lightgrey,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
            ]
        )
    )

    story.append(table)
    story.append(Spacer(1, 20))

    story.append(
        Paragraph(
            "Thank you for choosing STAYMATE AI. "
            "Please keep this document for your records.",
            normal_style,
        )
    )

    document.build(story)

    pdf_buffer.seek(0)
    return pdf_buffer.read()

def send_booking_confirmation_email(
    booking: dict,
) -> tuple[bool, str | None]:
    """
    Send booking confirmation email with a PDF attachment.
    """

    to_email = str(booking.get("email", "")).strip().lower()

    if not to_email:
        return False, "Booking email is missing."

    booking_reference = escape(
        str(booking.get("booking_reference", "N/A"))
    )

    guest_name = escape(
        str(booking.get("guest_name", "Guest"))
    )

    subject = (
        f"STAYMATE AI - Booking Confirmed "
        f"({booking_reference})"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="
        margin: 0;
        padding: 0;
        background-color: #f5f7fb;
        font-family: Arial, sans-serif;
    ">
        <div style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            padding: 30px;
        ">
            <h2>Booking Confirmed!</h2>

            <p>Hello <strong>{guest_name}</strong>,</p>

            <p>
                Your hotel booking has been successfully confirmed
                through STAYMATE AI.
            </p>

            <p>
                Your complete booking details are available in the
                attached PDF confirmation document.
            </p>

            <p>
                <strong>Booking Reference:</strong>
                {booking_reference}
            </p>

            <p>
                Please keep the attached PDF for your records.
            </p>

            <p>
                Regards,<br>
                <strong>STAYMATE AI</strong>
            </p>
        </div>
    </body>
    </html>
    """

    pdf_content = create_booking_confirmation_pdf(booking)

    attachment = {
        "filename": f"STAYMATE_Booking_{booking.get('booking_reference', 'confirmation')}.pdf",
        "content": pdf_content,
    }

    return send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        attachment=attachment,
    )
def send_booking_cancellation_email(
    booking: dict,
) -> tuple[bool, str | None]:
    """
    Send booking cancellation confirmation email.
    """

    to_email = str(
        booking.get("email", "")
    ).strip().lower()


    if not to_email:

        return False, "Booking email is missing."


    booking_reference = escape(
        str(
            booking.get(
                "booking_reference",
                "N/A"
            )
        )
    )


    guest_name = escape(
        str(
            booking.get(
                "guest_name",
                "Guest"
            )
        )
    )


    hotel_name = escape(
        str(
            booking.get(
                "hotel_name",
                "Hotel"
            )
        )
    )


    check_in = escape(
        str(
            booking.get(
                "check_in",
                "N/A"
            )
        )
    )


    check_out = escape(
        str(
            booking.get(
                "check_out",
                "N/A"
            )
        )
    )


    total_amount = escape(
        str(
            booking.get(
                "total_amount",
                "0"
            )
        )
    )


    cancelled_at = escape(
        str(
            booking.get(
                "cancelled_at",
                "N/A"
            )
        )
    )


    subject = (
        "STAYMATE AI - Booking Cancelled "
        f"({booking_reference})"
    )


    html_content = f"""
    <!DOCTYPE html>
    <html>

    <body style="
        margin: 0;
        padding: 0;
        background-color: #f5f7fb;
        font-family: Arial, sans-serif;
    ">

        <div style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        ">

            <h2 style="
                color: #c0392b;
                margin-top: 0;
            ">
                Booking Cancelled
            </h2>


            <p>
                Hello <strong>{guest_name}</strong>,
            </p>


            <p>
                Your hotel booking through
                <strong>STAYMATE AI</strong>
                has been successfully cancelled.
            </p>


            <div style="
                background: #f8f9fa;
                border-radius: 8px;
                padding: 18px;
                margin: 20px 0;
            ">

                <p>
                    <strong>Booking Reference:</strong>
                    {booking_reference}
                </p>

                <p>
                    <strong>Hotel:</strong>
                    {hotel_name}
                </p>

                <p>
                    <strong>Check-in:</strong>
                    {check_in}
                </p>

                <p>
                    <strong>Check-out:</strong>
                    {check_out}
                </p>

                <p>
                    <strong>Total Booking Amount:</strong>
                    ₹{total_amount}
                </p>

                <p>
                    <strong>Cancelled At:</strong>
                    {cancelled_at}
                </p>

                <p>
                    <strong>Status:</strong>
                    Cancelled
                </p>

            </div>


            <p>
                Your booking has been marked as
                <strong>Cancelled</strong>
                in your STAYMATE AI account.
            </p>


            <p>
                Any applicable refund depends on the
                cancellation conditions associated with
                the booking.
            </p>


            <p>
                You can view your booking history from
                the <strong>My Bookings</strong> section
                of STAYMATE AI.
            </p>


            <p>
                Regards,<br>
                <strong>STAYMATE AI</strong>
            </p>

        </div>

    </body>
    </html>
    """


    return send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
    )