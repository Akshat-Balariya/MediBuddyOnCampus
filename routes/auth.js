const express = require("express");
const { body } = require("express-validator");
const { pool, withTransaction, isDuplicateEntry } = require("../db");
const { signToken } = require("../middleware/auth");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimits");
const { validate, requiredText, mobileNumber } = require("../middleware/validate");
const { hashPassword, verifyPassword } = require("../utils/passwords");
const { HttpError, asyncHandler } = require("../utils/http");

const router = express.Router();

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["male", "female", "other"];

// Student registration
router.post(
  "/student_register",
  registerLimiter,
  validate([
    requiredText("registrationNo", "Registration Number", 20),
    requiredText("name", "Name", 100),
    body("gender").isIn(GENDERS).withMessage("Please select a gender"),
    mobileNumber("contact", "Contact"),
    requiredText("hostel", "Hostel", 50),
    requiredText("room", "Room Number", 20),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("bloodGroup").optional({ values: "falsy" }).isIn(BLOOD_GROUPS).withMessage("Please select a valid blood group"),
    body("medicalCondition").optional().trim().isLength({ max: 255 }).withMessage("Medical condition must be at most 255 characters"),
  ]),
  asyncHandler(async (req, res) => {
    const { registrationNo, name, password, hostel, contact, gender, room, medicalCondition, bloodGroup } = req.body;
    const passwordHash = await hashPassword(password);

    try {
      // Both rows are written together, so a failure can't leave a student who can't log in
      await withTransaction(async (connection) => {
        await connection.query(
          "INSERT INTO stud_info (RegNo, Name, gender, Blood_Grp, contact, Hostel, Room, Prev_cond) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [registrationNo, name, gender, bloodGroup || null, contact, hostel, room, medicalCondition || null]
        );
        await connection.query(
          "INSERT INTO stud_cred (RegNo, passwd, Name) VALUES (?, ?, ?)",
          [registrationNo, passwordHash, name]
        );
      });
    } catch (err) {
      if (isDuplicateEntry(err)) {
        throw new HttpError(409, "This registration number is already registered");
      }
      throw err;
    }

    res.json({ success: true, message: "Registration successful" });
  })
);

// Student login
router.post(
  "/student_login",
  loginLimiter,
  validate([
    body("registrationNo").trim().notEmpty().withMessage("Registration Number is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ]),
  asyncHandler(async (req, res) => {
    const { registrationNo, password } = req.body;

    const [rows] = await pool.query("SELECT Passwd AS passwd FROM stud_cred WHERE RegNo = ?", [registrationNo]);
    const valid = await verifyPassword(password, rows[0]?.passwd, (hash) =>
      pool.query("UPDATE stud_cred SET Passwd = ? WHERE RegNo = ?", [hash, registrationNo])
    );

    if (!valid) {
      throw new HttpError(401, "Invalid Registration Number or Password");
    }

    const token = signToken({ role: "student", registrationNo });
    res.json({ success: true, message: "Login successful", token });
  })
);

// Doctor login
router.post(
  "/doctor_login",
  loginLimiter,
  validate([
    body("empNo").trim().notEmpty().withMessage("Employee ID is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ]),
  asyncHandler(async (req, res) => {
    const { empNo, password } = req.body;

    const [rows] = await pool.query("SELECT Passwd AS passwd FROM doc_cred WHERE EmpID = ?", [empNo]);
    const valid = await verifyPassword(password, rows[0]?.passwd, (hash) =>
      pool.query("UPDATE doc_cred SET Passwd = ? WHERE EmpID = ?", [hash, empNo])
    );

    if (!valid) {
      throw new HttpError(401, "Invalid Employee Number or Password");
    }

    const token = signToken({ role: "doctor", empNo });
    res.json({ success: true, message: "Login successful", token });
  })
);

module.exports = router;
