const router = require("express").Router();
const multer = require("multer");

const getUser = require("../middleware/getUser");
const exclude = require("../utils/exclude");
const { handleUpload } = require("../utils/imageHandler");

const prisma = require("../config/prisma");
const { user } = require("../config/prisma");
const upload = multer({ desc: "uploads/" });

//recruiter routes start here
//
//
//

router.post("/recruiter-profile", getUser, async (req, res) => {
  const { type, id } = req.user;
  if (type !== "recruiter") return res.sendStatus(401);
  try {
    const response = await prisma.recruiter.upsert({
      where: {
        recruiterId: id,
      },
      update: {
        ...req.body,
      },
      create: {
        ...req.body,
        recruiterId: id,
      },
    });
    res.status(201).send(response);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.get("/recruiter-profile/:id", async (req, res) => {
  const { id } = req.params;
  console.log(req.params);

  //fetch user profile
  try {
    const response = await prisma.user.findUnique({
      where: {
        id: id,
      },
      include: {
        recruiter: true,
        jobs: true,
      },
    });

    const userWithoutPassword = exclude(response, "password");
    res.status(200).send(userWithoutPassword);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

//candidate routes start here
//
//
//

router.post("/candidate-profile", getUser, async (req, res) => {
  const { type, id } = req.user;
  if (type !== "candidate") return res.sendStatus(401);

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    const response = await prisma.candidateInformation.upsert({
      where: {
        candidateId: id,
      },
      update: {
        ...req.body,
      },
      create: {
        ...req.body,
        candidateId: id,
        email: user.email,
      },
    });
    res.status(201).send(response);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.post("/candidate-education", getUser, async (req, res) => {
  const { type, id } = req.user;
  const { id: educationId } = req.body;
  if (type !== "candidate") return res.sendStatus(401);

  try {
    const response = await prisma.candidateEducation.upsert({
      where: {
        id: educationId,
      },
      update: {
        ...req.body,
      },
      create: {
        ...req.body,
        candidateId: id,
      },
    });
    res.status(201).send(response);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.post("/candidate-experience", getUser, async (req, res) => {
  const { type, id } = req.user;
  const { id: experienceId } = req.body;
  if (type !== "candidate") return res.sendStatus(401);

  try {
    const response = await prisma.candidateExperience.upsert({
      where: {
        id: experienceId,
      },
      update: {
        ...req.body,
      },
      create: {
        ...req.body,
        candidateId: id,
      },
    });
    res.status(201).send(response);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.post(
  "/candidate-uploads",
  getUser,
  upload.single("file"),
  async (req, res) => {
    const { type, id } = req.user;
    const { fileName, fileType } = req.body;
    const file = req.file;

    if (!file) return res.sendStatus(400);

    if (type !== "candidate") return res.sendStatus(401);

    try {
      const files = [file];
      const basekey = `uploads/${id}`;
      const urlArray = await handleUpload(files, basekey);
      const url = urlArray[0];

      const fileDetails = await prisma.candidateUploads.create({
        data: {
          fileName,
          fileType,
          fileURL: url,
          candidateId: id,
        },
      });

      res.status(201).send(fileDetails);
    } catch (err) {
      console.log(err);
      res.sendStatus(500);
    }
  }
);
module.exports = router;

router.get("/candidate-profile/:id", async (req, res) => {
  const { id } = req.params;
  console.log(req.params);

  //fetch user profile
  try {
    const response = await prisma.user.findUnique({
      where: {
        id: id,
      },
      include: {
        candidate: true,
        candidateUploads: true,
        candidateEducation: true,
        candidateExperience: true,
      },
    });
    const userWithoutPassword = exclude(response, "password");
    res.status(200).send(userWithoutPassword);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.delete("/candidate-education/:id", getUser, async (req, res) => {
  const { type, id } = req.user;
  const { id: educationId } = req.params;
  if (type !== "candidate") return res.sendStatus(401);

  try {
    const eduToDelete = await prisma.candidateEducation.findUnique({
      where: {
        id: educationId,
      },
    });

    if (!eduToDelete) return res.sendStatus(404);
    if (eduToDelete.candidateId !== id) return res.sendStatus(401);
    await prisma.candidateEducation.delete({
      where: {
        id: educationId,
      },
    });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.delete("/candidate-experience/:id", getUser, async (req, res) => {
  const { type, id } = req.user;
  const { id: experienceId } = req.params;
  if (type !== "candidate") return res.sendStatus(401);

  try {
    const expToDelete = await prisma.candidateExperience.findUnique({
      where: {
        id: experienceId,
      },
    });

    if (!expToDelete) return res.sendStatus(404);
    if (expToDelete.candidateId !== id) return res.sendStatus(401);
    await prisma.candidateExperience.delete({
      where: {
        id: experienceId,
      },
    });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

router.delete("/candidate-uploads/:id", getUser, async (req, res) => {
  const { type, id } = req.user;
  const { id: uploadId } = req.params;
  if (type !== "candidate") return res.sendStatus(401);

  try {
    const uploadToDelete = await prisma.candidateUploads.findUnique({
      where: {
        id: uploadId,
      },
    });

    if (!uploadToDelete) return res.sendStatus(404);
    if (uploadToDelete.candidateId !== id) return res.sendStatus(401);
    await prisma.candidateUploads.delete({
      where: {
        id: uploadId,
      },
    });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

//general routes start here
//
//
//

router.post(
  "/profile-image",
  getUser,
  upload.single("file"),
  async (req, res) => {
    const { type, id } = req.user;
    const file = req.file;

    if (!file) return res.sendStatus(400);
    const files = [file];

    try {
      const basekey = `profileimages/${id}`;
      const urlArray = await handleUpload(files, basekey);
      const url = urlArray[0];
      if (type === "recruiter") {
        await prisma.recruiter.upsert({
          where: {
            recruiterId: id,
          },
          update: {
            photoURL: url,
          },
          create: {
            photoURL: url,
            recruiterId: id,
          },
        });
      }

      if (type === "candidate") {
        await prisma.candidateInformation.upsert({
          where: {
            candidateId: id,
          },
          update: {
            photoURL: url,
          },
          create: {
            photoURL: url,
            candidateId: id,
          },
        });
      }

      res.status(201).send(url);
    } catch (err) {
      console.log(err);
      res.sendStatus(500);
    }
  }
);
