const express = require("express");
const { body } = require("express-validator");
const { pool, withTransaction, isDuplicateEntry } = require("../db");
const { requireDoctor } = require("../middleware/auth");
const { validate, requiredText } = require("../middleware/validate");
const { HttpError, asyncHandler } = require("../utils/http");

const router = express.Router();

// Every route in this file is for doctors only

const medicineRules = [
  requiredText("name", "Medicine name", 100),
  body("count").isInt({ min: 0 }).withMessage("Count must be a whole number of 0 or more").toInt(),
  body("expire").isISO8601().withMessage("Expiry must be a valid date"),
];

// Medicine stock for the drug records page
router.get(
  "/data",
  requireDoctor,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query("SELECT name, count, expire, last_updated FROM meds");
    res.json(rows);
  })
);

// Medicine stock for the edit page and dispensing autocomplete
router.get(
  "/medicines",
  requireDoctor,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query("SELECT name, count, manufacture, expire, last_updated FROM meds");
    res.json(rows);
  })
);

// Dispense medicine and close the appointment, as one transaction
router.post(
  "/update-medicine-and-appointment",
  requireDoctor,
  validate([
    body("appointmentId").isInt({ min: 1 }).withMessage("Invalid appointment").toInt(),
    requiredText("medicineName", "Medicine name", 100),
    body("count").isInt({ min: 1 }).withMessage("Count must be at least 1").toInt(),
  ]),
  asyncHandler(async (req, res) => {
    const { appointmentId, medicineName, count } = req.body;

    await withTransaction(async (connection) => {
      const [medicineResult] = await connection.query(
        "UPDATE meds SET count = count - ?, last_updated = CURRENT_TIMESTAMP WHERE name = ? AND count >= ?",
        [count, medicineName, count]
      );
      if (medicineResult.affectedRows === 0) {
        throw new HttpError(400, "Insufficient medicine quantity");
      }

      const [appointmentResult] = await connection.query(
        "UPDATE appointment SET status = 'closed' WHERE apmtid = ? AND status = 'open'",
        [appointmentId]
      );
      if (appointmentResult.affectedRows === 0) {
        throw new HttpError(404, "Appointment not found or already closed");
      }
    });

    res.json({ success: true, message: "Medicine and appointment updated successfully" });
  })
);

// Add a new medicine
router.post(
  "/add-medicine",
  requireDoctor,
  validate(medicineRules),
  asyncHandler(async (req, res) => {
    const { name, count, expire } = req.body;

    try {
      await pool.query(
        "INSERT INTO meds (name, count, expire, last_updated) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
        [name, count, expire]
      );
    } catch (err) {
      if (isDuplicateEntry(err)) {
        throw new HttpError(409, "Medicine already exists");
      }
      throw err;
    }

    res.json({ success: true, message: "Medicine added successfully" });
  })
);

// Update a medicine's count and expiry
router.post(
  "/update-medicine",
  requireDoctor,
  validate(medicineRules),
  asyncHandler(async (req, res) => {
    const { name, count, expire } = req.body;

    const [result] = await pool.query(
      "UPDATE meds SET count = ?, expire = ?, last_updated = CURRENT_TIMESTAMP WHERE name = ?",
      [count, expire, name]
    );
    if (result.affectedRows === 0) {
      throw new HttpError(404, "Medicine not found");
    }

    res.json({ success: true, message: "Medicine updated successfully" });
  })
);

// Delete a medicine
router.delete(
  "/delete-medicine",
  requireDoctor,
  validate([requiredText("name", "Medicine name", 100)]),
  asyncHandler(async (req, res) => {
    const [result] = await pool.query("DELETE FROM meds WHERE name = ?", [req.body.name]);
    if (result.affectedRows === 0) {
      throw new HttpError(404, "Medicine not found");
    }

    res.json({ success: true, message: "Medicine deleted successfully" });
  })
);

module.exports = router;
