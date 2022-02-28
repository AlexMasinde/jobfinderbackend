const router = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { v4: uuidv4 } = require("uuid");

const { createAccessToken } = require("../utils/createAccessToken");
const { createRefreshToken } = require("../utils/createRefreshToken");
const { sendCookie } = require("../utils/sendCookie");

const prisma = require("../config/prisma");
const getUser = require("../middleware/getUser");

//Register users
router.post("/signup", async (req, res) => {
  const { type, userName, email, password } = req.body;
  try {
    const userExists = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (userExists) {
      return res.status(400).json({
        error: "User with email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        type,
        username: userName,
        email,
        password: hashedPassword,
        emailverified: false,
      },
    });
    const accessToken = createAccessToken(user.id, user.type);
    const refreshToken = createRefreshToken(user.id, user.type);

    await prisma.refreshtoken.upsert({
      where: {
        userId: user.id,
      },
      update: {
        token: refreshToken,
      },
      create: {
        token: refreshToken,
        userId: user.id,
      },
    });
    sendCookie(res, refreshToken);
    res.status(201).send({ accessToken, userId: user.id, type: user.type });
  } catch (err) {
    console.log(err);
    res.status(500).send(errß);
  }
});

//login user
//Send jwt token
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(404).json({
        error: "Invalid credentials",
      });
    }

    console.log(user.type);
    const accessToken = createAccessToken(user.id, user.type);
    const refreshToken = createRefreshToken(user.id, user.type);

    await prisma.refreshtoken.upsert({
      where: {
        userId: user.id,
      },
      update: {
        token: refreshToken,
      },
      create: {
        token: refreshToken,
        userId: user.id,
      },
    });
    sendCookie(res, refreshToken);
    res.status(200).send({ accessToken, type: user.type, userId: user.id });
  } catch (err) {
    res.status(500).json({ error: "Could not log in user! Try again" });
    console.log(err);
  }
});

//create password reset token
router.post("/password-reset", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const uniqueNumber = crypto.randomInt(0, 1000000);
    const resetToken = uniqueNumber.toString().padStart(6, "0");

    const currentToken = await prisma.reset.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (currentToken) {
      await prisma.reset.update({
        where: {
          id: currentToken.id,
        },
        data: {
          resetToken: resetToken,
        },
      });
    } else {
      await prisma.reset.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          resetToken: resetToken,
        },
      });
    }

    res.status(200).send({
      resetToken: resetToken,
    });
  } catch (err) {
    res
      .status(500)
      .send({ error: "Could not create password reset token! Try again" });
    console.log(err);
  }
});

//Change password
router.post("/change-password", async (req, res) => {
  const { email, password, resetToken } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    const reset = await prisma.reset.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!reset) {
      return res.status(404).json({
        error: "Reset token not found",
      });
    }

    if (reset.resetToken !== resetToken) {
      return res.status(400).json({
        error: "Invalid token",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    });
    await prisma.reset.delete({
      where: {
        id: reset.id,
      },
    });
    const accessToken = createAccessToken(user.id, user.type);
    const refreshToken = createRefreshToken(user.id, user.type);

    await prisma.refreshtoken.upsert({
      where: {
        userId: user.id,
      },
      update: {
        token: refreshToken,
      },
      create: {
        token: refreshToken,
        userId: user.id,
      },
    });
    sendCookie(res, refreshToken);
    res.status(200).send({
      accessToken,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not change password! Try again" });
    console.log(err);
  }
});

router.get("/refresh", async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.status(401).send({ error: "Not authorized" });
  const refreshToken = cookies.jwt;
  try {
    const user = await prisma.refreshtoken.findUnique({
      where: {
        token: refreshToken,
      },
    });
    if (!user) {
      return res.status(403).send({ error: "Not authorized" });
    }
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      async (err, decoded) => {
        if (err || user.userId !== decoded.id)
          return res.status(403).send({ error: "Not authorized" });
        const accessToken = createAccessToken(decoded.id, decoded.type);
        sendCookie(res, refreshToken);
        res
          .status(200)
          .send({ accessToken, type: decoded.type, userId: decoded.id });
      }
    );
  } catch (err) {
    res.status(500).json({ error: "Could not refresh token! Try again" });
    console.log(err);
  }
});

router.get("/logout", async (req, res) => {
  console.log("working to logout user");
  //also delete access token on client
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.status(204).send({ message: "No content" });
  const refreshToken = cookies.jwt;
  try {
    const user = await prisma.refreshtoken.findUnique({
      where: {
        token: refreshToken,
      },
    });
    if (!user) {
      console.log("no user found");
      res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: "None",
        secure: true,
      });
      return res.status(204).send({ message: "No content" });
    }
    await prisma.refreshtoken.delete({
      where: {
        token: refreshToken,
      },
    });
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not logout! Try again" });
    console.log(err);
  }
});

//search candidates
router.post("/search", async (req, res) => {
  console.log("searching candidates");
  try {
    const candidates = await prisma.candidateInformation.findMany(req.body);
    res.status(200).send(candidates);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

//change password
router.post("/new-password", getUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id } = req.user;
  console.log(req.body);
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    if (!user) {
      return res.status(404).send({
        error: "User not found",
      });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).send({
        error: "Incorrect password",
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await prisma.user.update({
      where: {
        id: id,
      },
      data: {
        password: hashedPassword,
      },
    });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

module.exports = router;
