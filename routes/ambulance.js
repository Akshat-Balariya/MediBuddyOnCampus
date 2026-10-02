const express = require("express");
const { body } = require("express-validator");
const { pool } = require("../db");
const { requireStudent } = require("../middleware/auth");
const { validate, requiredText, dateNotInPast } = require("../middleware/validate");
const { HttpError, asyncHandler } = require("../utils/http");

const router = express.Router();

const LOCATIONS = ["Ashta", "Sehore", "Bhopal", "other"];

// Request an ambulance (students only)
router.post(
  "/book_ambulance",
  requireStudent,
  validate([
    dateNotInPast("date", "Date"),
    body("location").isIn(LOCATIONS).withMessage("Please select a location"),
    requiredText("detail", "Detailed location", 255),
  ]),
  asyncHandler(async (req, res) => {
    const { date, location, detail } = req.body;
    const { registrationNo } = req.user;

    const [students] = await pool.query("SELECT Name, Hostel FROM stud_info WHERE RegNo = ?", [registrationNo]);
    if (students.length === 0) {
      throw new HttpError(404, "Student information not found");
    }
    const { Name, Hostel } = students[0];

    try {
      await pool.query(
        "INSERT INTO ambulance_requests (RegNo, Name, Hostel, Date_, location, detail) VALUES (?, ?, ?, ?, ?, ?)",
        [registrationNo, Name, Hostel, date, location, detail]
      );
    } catch (err) {
      console.error(err);
      throw new HttpError(500, "Could not book the ambulance. Please try again or call the medical centre.");
    }

    res.json({ success: true, message: "Ambulance request booked successfully" });
  })
);

module.exports = router;
