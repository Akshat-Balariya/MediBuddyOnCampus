require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const path = require("path");

const app = express();
const port = 5000;
const BCRYPT_ROUNDS = 10;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET is not set. Add it to your .env file.");
  process.exit(1);
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/assests', express.static(path.join(__dirname, 'assests')));
app.use('/main', express.static(path.join(__dirname, 'main')));

// Database connection setup
const db = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DB,
  port: "10444",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the MySQL database");
});

app.get('/:slug?', (req, res, next) => {
  if(req.params.slug && req.params.slug.includes("api")) {
    return next();
  }

  const filePath = !req.params.slug || req.params.slug === ""
    ? '/main/index.html'
    : `/main/${req.params.slug}.html`;

  res.sendFile(path.join(__dirname, filePath));
});

// Logs the real error on the server and sends the client a generic message
function serverError(res, err, message = "Something went wrong. Please try again later.") {
  console.error(err);
  res.status(500).json({ success: false, message });
}

// Brute-force protection for the login and registration routes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in 15 minutes." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many registrations from this device. Please try again later." },
});

// Helper function to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: "Invalid or expired token." });
    req.user = user;
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ success: false, message: "You are not allowed to do this." });
    }
    next();
  };
}

const requireStudent = [authenticateToken, requireRole("student")];
const requireDoctor = [authenticateToken, requireRole("doctor")];

const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

// Checks a password against the stored value. Accounts created before hashing
// was added still hold plain-text passwords; those are verified directly and
// re-saved as a bcrypt hash so they are upgraded on their next login.
async function verifyPassword(password, stored, upgrade) {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(password, stored);
  }
  if (typeof stored !== "string" || stored !== password) {
    return false;
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  upgrade(hash);
  return true;
}

// Student Rgistration Route
app.post("/api/student_register", registerLimiter, async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid request body"
    });
  }

  const {
    registrationNo,
    name,
    password,
    hostel,
    contact,
    gender,
    room,
    medicalCondition,
    bloodGroup,
  } = req.body;

  // Validate input
  if (!registrationNo || !name || !gender || !contact || !hostel || !room || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  let passwordHash;
  try {
    passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (err) {
    return serverError(res, err);
  }

  // First query - Insert into stud_info
  const query1 = "INSERT INTO stud_info (RegNo, Name, gender, Blood_Grp,contact, Hostel, Room,Prev_cond ) VALUES (?, ?, ?, ?, ?, ?, ?,?);";
  db.query(query1, [registrationNo, name, gender, bloodGroup,contact, hostel, room, medicalCondition], (err1, result1) => {
    if (err1) {
      if (err1.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message: "This registration number is already registered"
        });
      }
      return serverError(res, err1, "Registration failed. Please try again later.");
    }

    // Second query - Insert into stud_cred
    const query2 = "INSERT INTO stud_cred (RegNo, passwd, Name) VALUES (?, ?, ?)";
    db.query(query2, [registrationNo, passwordHash, name], (err2, result2) => {
      if (err2) {
        return serverError(res, err2, "Registration failed. Please try again later.");
      }

      res.json({
        success: true,
        message: "Registration successful"
      });
    });
  });
});

// Student login route with JWT
app.post("/api/student_login", loginLimiter, (req, res) => {
  const { registrationNo, password } = req.body;
  if (!registrationNo || !password) {
    return res.status(400).json({ success: false, message: "Registration Number and Password are required" });
  }

  const query = "SELECT RegNo, Passwd AS passwd FROM stud_cred WHERE RegNo = ?";
  db.query(query, [registrationNo], async (err, results) => {
    if (err) {
      return serverError(res, err);
    }

    try {
      const stored = results.length > 0 ? results[0].passwd : null;
      const valid = await verifyPassword(password, stored, (hash) => {
        db.query("UPDATE stud_cred SET Passwd = ? WHERE RegNo = ?", [hash, registrationNo], (updateErr) => {
          if (updateErr) console.error("Failed to upgrade student password hash:", updateErr);
        });
      });

      if (!valid) {
        return res.status(401).json({
          success: false,
          message: "Invalid Registration Number or Password",
        });
      }

      const token = jwt.sign({ role: "student", registrationNo }, JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ success: true, message: "Login successful", token });
    } catch (verifyErr) {
      serverError(res, verifyErr);
    }
  });
});

// Doctor login route with JWT
app.post("/api/doctor_login", loginLimiter, (req, res) => {
  const { empNo, password } = req.body;
  if (!empNo || !password) {
    return res.status(400).json({ success: false, message: "Employee ID and Password are required" });
  }

  const query = "SELECT EmpID, Passwd AS passwd FROM doc_cred WHERE EmpID = ?";
  db.query(query, [empNo], async (err, results) => {
    if (err) {
      return serverError(res, err);
    }

    try {
      const stored = results.length > 0 ? results[0].passwd : null;
      const valid = await verifyPassword(password, stored, (hash) => {
        db.query("UPDATE doc_cred SET Passwd = ? WHERE EmpID = ?", [hash, empNo], (updateErr) => {
          if (updateErr) console.error("Failed to upgrade doctor password hash:", updateErr);
        });
      });

      if (!valid) {
        return res.status(401).json({
          success: false,
          message: "Invalid Employee Number or Password",
        });
      }

      const token = jwt.sign({ role: "doctor", empNo }, JWT_SECRET, { expiresIn: "1h" });
      res.json({ success: true, message: "Login successful", token });
    } catch (verifyErr) {
      serverError(res, verifyErr);
    }
  });
});

// Appointment booking route (students only)
app.post("/api/book_appointment", requireStudent, (req, res) => {
  const { name, age, phone, email, appointment_date, symptoms } = req.body;
  const { registrationNo } = req.user;

  if (!name || !age || !phone || !email || !appointment_date || !symptoms) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  const query =
    "INSERT INTO appointment (name, age, phone, email, appointment_date, status, symptoms, RegistrationNo) VALUES (?, ?, ?, ?, ?,'open',?, ?)";
  db.query(
    query,
    [name, age, phone, email, appointment_date, symptoms, registrationNo],
    (err, result) => {
      if (err) {
        return serverError(res, err, "Could not book the appointment. Please try again later.");
      }

      res.json({ success: true, message: "Appointment booked successfully" });
    }
  );
});

// Fetch appointments: doctors see all, students see only their own
app.get("/api/appointment", authenticateToken, (req, res) => {
  let query =
    "SELECT apmtid, name, age, appointment_date, status FROM appointment";
  const params = [];

  if (req.user.role === "student") {
    query += " WHERE RegistrationNo = ?";
    params.push(req.user.registrationNo);
  } else if (req.user.role !== "doctor") {
    return res.status(403).json({ success: false, message: "You are not allowed to do this." });
  }

  db.query(query, params, (err, results) => {
    if (err) {
      return serverError(res, err);
    }
    res.json(results);
  });
});

// Fetch prescriptions data (doctors only)
app.get("/api/data", requireDoctor, (req, res) => {
  const query = "SELECT name, count, expire, last_updated FROM meds";
  db.query(query, (err, results) => {
    if (err) {
      return serverError(res, err);
    }
    res.json(results);
  });
});

// Ambulance request route (students only)
app.post("/api/book_ambulance", requireStudent, (req, res) => {
  const { date, location, detail } = req.body;
  const { registrationNo } = req.user;

  if (!date || !location || !detail) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  // Fetch Name and Hostel from `stud_info` table
  const fetchStudentInfoQuery =
  "SELECT Name, Hostel FROM stud_info WHERE RegNo = ?";
  db.query(fetchStudentInfoQuery, [registrationNo], (err, results) => {
    if (err) {
      return serverError(res, err);
    }

    if (results.length === 0) {
      return res
      .status(404)
      .json({ success: false, message: "Student information not found" });
    }

    const { Name, Hostel } = results[0];

    // Insert into `ambulance_requests` table
    const insertRequestQuery = `
    INSERT INTO ambulance_requests (RegNo, Name, Hostel, Date_, location, detail)
    VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(
      insertRequestQuery,
      [registrationNo, Name, Hostel, date, location, detail],
      (err, result) => {
        if (err) {
          return serverError(res, err, "Could not book the ambulance. Please try again or call the medical centre.");
        }
        res.json({ success: true, message: "Ambulance request booked successfully" });
      }
    );
  });
});

// Doctor profile route (doctors only)
app.get("/api/doctor_profile", requireDoctor, (req, res) => {
  const { empNo } = req.user; // Extract from decoded token

  const query = "SELECT * FROM doc_info WHERE EmpID = ?";
  db.query(query, [empNo], (err, results) => {
    if (err) {
      return serverError(res, err);
    }

    if (results.length > 0) {
      res.json({ success: true, profileData: results[0] });
    } else {
      res.status(404).json({ success: false, message: "Profile not found" });
    }
  });
});

// Fetch medicines for autocomplete (doctors only)
app.get("/api/medicines", requireDoctor, (req, res) => {
  const query =
    "SELECT name, count, manufacture, expire, last_updated FROM meds";
  db.query(query, (err, results) => {
    if (err) {
      return serverError(res, err);
    }
    res.json(results);
  });
});

// Update medicine count and appointment status (doctors only)
app.post("/api/update-medicine-and-appointment", requireDoctor, (req, res) => {
  const { appointmentId, medicineName } = req.body;
  const count = Number(req.body.count);

  // Validate input
  if (!appointmentId || !medicineName || !Number.isInteger(count) || count <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid input parameters",
    });
  }

  // Start a transaction to ensure data consistency
  db.beginTransaction((err) => {
    if (err) {
      return serverError(res, err);
    }

    // First, update medicine count
    const updateMedicineQuery = `
      UPDATE meds
      SET count = count - ?,
          last_updated = CURRENT_TIMESTAMP
      WHERE name = ? AND count >= ?
    `;

    db.query(
      updateMedicineQuery,
      [count, medicineName, count],
      (err, medicineResult) => {
        if (err) {
          return db.rollback(() => serverError(res, err, "Error updating medicine"));
        }

        // Check if medicine update was successful
        if (medicineResult.affectedRows === 0) {
          return db.rollback(() => {
            res.status(400).json({
              success: false,
              message: "Insufficient medicine quantity",
            });
          });
        }

        // Update appointment status
        const updateAppointmentQuery = `
        UPDATE appointment
        SET status = 'closed'
        WHERE apmtid = ? AND status = 'open'
      `;

        db.query(
          updateAppointmentQuery,
          [appointmentId],
          (err, appointmentResult) => {
            if (err) {
              return db.rollback(() => serverError(res, err, "Error updating appointment"));
            }

            if (appointmentResult.affectedRows === 0) {
              return db.rollback(() => {
                res.status(404).json({
                  success: false,
                  message: "Appointment not found or already closed",
                });
              });
            }

            // Commit the transaction
            db.commit((err) => {
              if (err) {
                return db.rollback(() => serverError(res, err));
              }

              res.json({
                success: true,
                message: "Medicine and appointment updated successfully",
              });
            });
          }
        );
      }
    );
  });
});

// Add a new medicine (doctors only)
app.post("/api/add-medicine", requireDoctor, (req, res) => {
  const { name, expire } = req.body;
  const count = Number(req.body.count);

  if (!name || !expire || !Number.isInteger(count) || count < 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid input parameters",
    });
  }

  const query = `
      INSERT INTO meds (name, count, expire, last_updated)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `;

  db.query(query, [name, count, expire], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ success: false, message: "Medicine already exists" });
      }
      return serverError(res, err);
    }

    res.json({
      success: true,
      message: "Medicine added successfully",
    });
  });
});

// Update medicine count and details (doctors only)
app.post("/api/update-medicine", requireDoctor, (req, res) => {
  const { name, expire } = req.body;
  const count = Number(req.body.count);

  // Validate input
  if (!name || !expire || !Number.isInteger(count) || count < 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid input parameters",
    });
  }

  // Update medicine in the database
  const query = `
      UPDATE meds
      SET count = ?, expire = ?, last_updated = CURRENT_TIMESTAMP
      WHERE name = ?
  `;

  db.query(query, [count, expire, name], (err, result) => {
    if (err) {
      return serverError(res, err);
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.json({
      success: true,
      message: "Medicine updated successfully",
    });
  });
});

// Delete medicine route (doctors only)
app.delete("/api/delete-medicine", requireDoctor, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: "Medicine name is required" });
  }

  const query = "DELETE FROM meds WHERE name = ?";
  db.query(query, [name], (err, result) => {
    if (err) {
      return serverError(res, err);
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    res.json({
      success: true,
      message: "Medicine deleted successfully",
    });
  });
});

// Server listening on port 5000
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
