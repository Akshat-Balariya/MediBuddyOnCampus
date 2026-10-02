const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET is not set. Add it to your .env file.");
  process.exit(1);
}

const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
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

module.exports = { signToken, authenticateToken, requireStudent, requireDoctor };
