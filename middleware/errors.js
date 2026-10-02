const path = require("path");
const { HttpError } = require("../utils/http");

const pagesDir = path.join(__dirname, "..", "main");

// Unknown /api routes get JSON; everything else gets the 404 page
function notFound(req, res) {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  res.status(404).sendFile("404.html", { root: pagesDir });
}

// Logs unexpected errors and sends the client a generic message
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON in request body" });
  }
  console.error(err);
  res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
}

module.exports = { notFound, errorHandler };
