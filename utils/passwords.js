const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = 10;

const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

// Checks a password against the stored value. Accounts created before hashing
// was added still hold plain-text passwords; those are verified directly and
// passed to `upgrade` as a bcrypt hash so they are re-saved on this login.
async function verifyPassword(password, stored, upgrade) {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(password, stored);
  }
  if (typeof stored !== "string" || stored !== password) {
    return false;
  }
  try {
    await upgrade(await hashPassword(password));
  } catch (err) {
    console.error("Failed to upgrade password hash:", err);
  }
  return true;
}

module.exports = { hashPassword, verifyPassword };
