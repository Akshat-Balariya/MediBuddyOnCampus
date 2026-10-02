require("dotenv").config();

const express = require("express");
const path = require("path");
const { pool } = require("./db");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();
app.set("trust proxy", 1);
const port = Number(process.env.PORT) || 5000;

// Middleware
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/main', express.static(path.join(__dirname, 'main')));

// API routes
app.use(
  "/api",
  require("./routes/auth"),
  require("./routes/appointments"),
  require("./routes/ambulance"),
  require("./routes/student"),
  require("./routes/doctor"),
  require("./routes/medicines")
);

// HTML pages
app.use(require("./routes/pages"));

app.use(notFound);
app.use(errorHandler);

// Check the database is reachable at startup; the pool reconnects on its own after that
pool.query("SELECT 1")
  .then(() => console.log("Connected to the MySQL database"))
  .catch((err) => console.error("Could not connect to the database:", err.message));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
