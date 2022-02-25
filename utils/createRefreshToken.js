const jwt = require("jsonwebtoken");

const createRefreshToken = (id, type) => {
  return jwt.sign({ id, type }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

module.exports = {
  createRefreshToken,
};
