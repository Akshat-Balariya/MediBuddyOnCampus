const express = require("express");
const { pool } = require("../db");
const { requireStudent } = require("../middleware/auth");
const { HttpError, asyncHandler } = require("../utils/http");

const router = express.Router();

// The logged-in student's own details (students only)
router.get(
  "/student_profile",
  requireStudent,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT RegNo, Name, gender, Blood_Grp, contact, Hostel, Room, Prev_cond FROM stud_info WHERE RegNo = ?",
      [req.user.registrationNo]
    );
    if (rows.length === 0) {
      throw new HttpError(404, "Student information not found");
    }

    const student = rows[0];
    res.json({
      success: true,
      profile: {
        registrationNo: student.RegNo,
        name: student.Name,
        gender: student.gender,
        bloodGroup: student.Blood_Grp,
        contact: student.contact,
        hostel: student.Hostel,
        room: student.Room,
        medicalCondition: student.Prev_cond,
      },
    });
  })
);

module.exports = router;
