const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000; // Added fallback

// Debug: Check if env variables are loaded
console.log("Environment check:");
console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PORT:", process.env.EMAIL_PORT);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// const staticDir = path.join(__dirname, "api", "dist");
// app.use(express.static(staticDir));
// console.log("Serving static from:", staticDir);
// app.use(express.static("/api/dist"));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BlueStar Contact API",
      version: "1.0.0",
      description: "API for BlueStar Contact Form",
    },
    servers: [
      {
        url: `https://bluestar-server.onrender.com/`,
        description: "Development server",
      },
    ],
  },
  apis: ["./api/server.js"], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Rate limiting to prevent spam
// const contactLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // Limit each IP to 5 requests per windowMs
//   message: {
//     error: "Too many contact form submissions, please try again later.",
//   },
// });

// Email configuration - FIXED for Gmail
const transporter = nodemailer.createTransport({
 // service: "gmail", // Use Gmail service instead of manual config
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Fallback to manual config if service doesn't work
  host: process.env.EMAIL_HOST, // "smtp.gmail.com"
  port: parseInt(process.env.EMAIL_PORT) , // 587
  secure: true,
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email transporter error:", error);

    // Try alternative configuration
    console.log("🔄 Trying alternative Gmail configuration...");
    const altTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    altTransporter.verify((altError, altSuccess) => {
      if (altError) {
        console.log("❌ Alternative config also failed:", altError);
      } else {
        console.log("✅ Alternative Gmail configuration ready!");
      }
    });
  } else {
    console.log("✅ Email transporter ready");
  }
});

// Input validation middleware
const validateContactForm = (req, res, next) => {
  const { email, subject, message } = req.body;

  // Basic validation
  if (!email || !subject || !message) {
    return res.status(400).json({
      success: false,
      error: "All fields (email, subject, message) are required",
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Please provide a valid email address",
    });
  }

  // Length validation
  if (subject.length > 200) {
    return res.status(400).json({
      success: false,
      error: "Subject must be less than 200 characters",
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      success: false,
      error: "Message must be less than 2000 characters",
    });
  }

  next();
};

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Send a contact form message
 *     description: Send a message through the contact form
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The sender's email address
 *               subject:
 *                 type: string
 *                 description: The subject of the message
 *               message:
 *                 type: string
 *                 description: The message content
 *             required:
 *               - email
 *               - subject
 *               - message
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 */
// Contact form endpoint
app.post("/api/contact", validateContactForm, async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    // Email options
    const mailOptions = {
      from: {
        name: "BlueStar Contact Form",
        address: process.env.EMAIL_USER,
      },
      to: process.env.RECIPIENT_EMAIL,
      subject: `Contact Form: ${subject}`,
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              New Contact Form Submission - BlueStar
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Contact Details:</h3>
              <p><strong>From:</strong> ${email}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h3 style="color: #333; margin-top: 0;">Message:</h3>
              <p style="line-height: 1.6; color: #555;">${message.replace(
                /\n/g,
                ""
              )}</p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #e0f2fe; border-radius: 8px;">
              <p style="margin: 0; font-size: 14px; color: #0277bd;">
                <strong>Reply Instructions:</strong> You can reply directly to this email to respond to ${email}
              </p>
            </div>
          </div>
        `,
      replyTo: email,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", info.messageId);

    res.status(200).json({
      success: true,
      message:
        "Your message has been sent successfully! We'll get back to you soon.",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Error sending email:", error);

    res.status(500).json({
      success: false,
      error: "Failed to send message. Please try again later.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the API is running
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BlueStar Contact API is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Something went wrong!",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

app.listen(PORT, () => {
  console.log(`BlueStar Contact API server running on port ${PORT}`);
});

module.exports = app;
