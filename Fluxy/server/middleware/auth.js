const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const SECRET_FILE = path.join(__dirname, "..", "db", ".jwt-secret");

function loadJwtSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }

  try {
    if (fs.existsSync(SECRET_FILE)) {
      const fromFile = fs.readFileSync(SECRET_FILE, "utf8").trim();
      if (fromFile) return fromFile;
    }
  } catch (error) {
    console.warn("Failed to read JWT secret file:", error.message);
  }

  const generated = crypto.randomBytes(48).toString("hex");
  try {
    fs.writeFileSync(SECRET_FILE, generated, "utf8");
  } catch (error) {
    console.warn("Failed to persist generated JWT secret:", error.message);
  }

  console.warn("JWT_SECRET not set. Generated a local secret for this environment.");
  return generated;
}

const JWT_SECRET = loadJwtSecret();

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    next();
  });
};

module.exports = { auth, adminAuth, JWT_SECRET };
