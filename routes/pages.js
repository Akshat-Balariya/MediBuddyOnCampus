const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const pagesDir = path.join(__dirname, "..", "main");

// Only real files in main/ can be served, e.g. /Appointment -> main/Appointment.html
const pages = new Set(
  fs.readdirSync(pagesDir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => file.slice(0, -".html".length))
);

router.get("/", (req, res) => {
  res.sendFile("index.html", { root: pagesDir });
});

router.get("/:page", (req, res, next) => {
  if (!pages.has(req.params.page)) {
    return next();
  }
  res.sendFile(`${req.params.page}.html`, { root: pagesDir });
});

module.exports = router;
