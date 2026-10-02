const { body, validationResult } = require("express-validator");

// Runs the given validation chains, then rejects the request with the first error message
function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }
      next();
    },
  ];
}

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Common field rules shared by several routes
const requiredText = (field, label, max) =>
  body(field)
    .trim()
    .notEmpty().withMessage(`${label} is required`)
    .isLength({ max }).withMessage(`${label} must be at most ${max} characters`);

const dateNotInPast = (field, label) =>
  body(field)
    .isISO8601().withMessage(`${label} must be a valid date`)
    .custom((value) => {
      // Compare calendar dates only, so a booking for later today is accepted
      if (String(value).slice(0, 10) < todayString()) {
        throw new Error(`${label} cannot be in the past`);
      }
      return true;
    });

const mobileNumber = (field, label) =>
  body(field)
    .customSanitizer((value) => String(value ?? "").replace(/[\s-]/g, ""))
    .matches(/^(\+91)?[6-9]\d{9}$/).withMessage(`${label} must be a valid 10-digit mobile number`);

module.exports = { validate, requiredText, dateNotInPast, mobileNumber };
