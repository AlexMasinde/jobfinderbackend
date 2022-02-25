const jwt = require("jsonwebtoken");

const createAccessToken = (id, type) => {
  return jwt.sign({ id: id, type: type }, process.env.JWT_SECRET, {
    expiresIn: "900s", //15 minutes in production
  });
};

module.exports = {
  createAccessToken,
};
