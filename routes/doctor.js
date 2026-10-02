const express = require("express");
const { pool } = require("../db");
const { requireDoctor } = require("../middleware/auth");
const { HttpError, asyncHandler } = require("../utils/http");

const router = express.Router();

// Doctor profile (doctors only)
router.get(
  "/doctor_profile",
  requireDoctor,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM doc_info WHERE EmpID = ?", [req.user.empNo]);
    if (rows.length === 0) {
      throw new HttpError(404, "Profile not found");
    }
    res.json({ success: true, profileData: rows[0] });
  })
);

module.exports = router;
