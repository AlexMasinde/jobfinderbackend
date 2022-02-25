function sendCookie(res, refreshToken) {
  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: "None",
    secure: true,
  });
}

module.exports = {
  sendCookie,
};
