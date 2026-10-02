const express = require("express");
const { body } = require("express-validator");
const { pool } = require("../db");
const { authenticateToken, requireStudent } = require("../middleware/auth");
const { validate, requiredText, dateNotInPast, mobileNumber } = require("../middleware/validate");
const { HttpError, asyncHandler } = require("../utils/http");

const router = express.Router();

// Book an appointment (students only)
router.post(
  "/book_appointment",
  requireStudent,
  validate([
    requiredText("name", "Name", 100),
    body("age").isInt({ min: 1, max: 120 }).withMessage("Age must be between 1 and 120").toInt(),
    mobileNumber("phone", "Phone Number"),
    body("email").trim().isEmail().withMessage("Please enter a valid email address"),
    dateNotInPast("appointment_date", "Appointment date"),
    requiredText("symptoms", "Symptoms", 500),
  ]),
  asyncHandler(async (req, res) => {
    const { name, age, phone, email, appointment_date, symptoms } = req.body;
    const { registrationNo } = req.user;

    await pool.query(
      "INSERT INTO appointment (name, age, phone, email, appointment_date, status, symptoms, RegistrationNo) VALUES (?, ?, ?, ?, ?, 'open', ?, ?)",
      [name, age, phone, email, appointment_date, symptoms, registrationNo]
    );

    res.json({ success: true, message: "Appointment booked successfully" });
  })
);

// Fetch appointments: doctors see all, students see only their own
router.get(
  "/appointment",
  authenticateToken,
  asyncHandler(async (req, res) => {
    let query = "SELECT apmtid, name, age, appointment_date, status FROM appointment";
    const params = [];

    if (req.user.role === "student") {
      query += " WHERE RegistrationNo = ?";
      params.push(req.user.registrationNo);
    } else if (req.user.role !== "doctor") {
      throw new HttpError(403, "You are not allowed to do this.");
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  })
);

module.exports = router;
