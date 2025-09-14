require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Create reusable transporter using your HostGator SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// POST /api/contact - send an email
app.post("/api/contact", async (req, res) => {
  const { email, subject, message } = req.body;

  if (!email || !subject || !message) {
    return res.status(400).json({
      success: false,
      error: "All fields (email, subject, message) are required",
    });
  }

  try {
    const mailOptions = {
      from: `"BlueStar Contact Form" <${process.env.EMAIL_USER}>`, // always your domain
      to: process.env.RECIPIENT_EMAIL, // info@bluestarmgt.com
      replyTo: email, // user's email
      subject: `Contact Form: ${subject}`,
      html: `
        <h3>New Contact Submission</h3>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);

    res.status(200).json({
      success: true,
      message: "Your message has been sent successfully!",
    });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message. Please try again later.",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

app.listen(PORT, () => console.log(`🚀 API server running on port ${PORT}`));
