require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
require("isomorphic-fetch");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Graph client helper
function getGraphClient() {
  const credential = new ClientSecretCredential(
    process.env.TENANT_ID,
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
  );

  return Client.init({
    authProvider: {
      getAccessToken: async () => {
        const tokenResponse = await credential.getToken(
          "https://graph.microsoft.com/.default"
        );
        return tokenResponse.token;
      },
    },
  });
}

// Send mail function
async function sendMail({ from, to, replyTo, subject, html }) {
  const client = getGraphClient();

  const message = {
    subject,
    body: {
      contentType: "HTML",
      content: html,
    },
    from: { emailAddress: { address: from } },
    toRecipients: to.map((addr) => ({ emailAddress: { address: addr } })),
    replyTo: replyTo ? [{ emailAddress: { address: replyTo } }] : [],
  };

  await client.api(`/users/${from}/sendMail`).post({ message });
}

// API endpoint
app.post("/api/contact", async (req, res) => {
  const { email, subject, message } = req.body;

  if (!email || !subject || !message) {
    return res.status(400).json({
      success: false,
      error: "All fields (email, subject, message) are required",
    });
  }

  try {
    await sendMail({
      from: process.env.EMAIL_USER, // steve@bluestarmgt.com
      to: ["steve@bluestarmgt.com"], // ✅ only Steve now
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <h3>New Contact Submission</h3>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Your message has been sent successfully!",
    });
  } catch (error) {
    console.error("❌ Error sending email:", error.body || error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to send message. Please try again later.",
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

app.listen(PORT, () => console.log(`🚀 API server running on port ${PORT}`));
