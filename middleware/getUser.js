const jwt = require("jsonwebtoken");

const getUser = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.sendStatus(401);
  try {
    const token = authHeader.split("Bearer ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = decoded;
      return next();
    });
  } catch (err) {
    res
      .status(500)
      .send({ error: "Something went wrong! Please login and try again" });
  }
};

module.exports = getUser;
