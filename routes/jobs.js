const router = require("express").Router();

const getUser = require("../middleware/getUser");

const prisma = require("../config/prisma");

//create job positing
router.post("/create", getUser, async (req, res) => {
  const { type, id } = req.user;
  if (type !== "recruiter") {
    return res.status(401).send({ message: "Only recruiters can create jobs" });
  }

  try {
    const job = await prisma.job.create({
      data: {
        ...req.body,
        recruiterId: id,
      },
    });
    res.status(201).send(job);
  } catch (err) {
    res.status(500).json({ message: "Could not create job! Try again" });
    console.log(err);
  }
});

//Edit a job Posting
router.patch("/:jobid", getUser, async (req, res) => {
  const { jobid } = req.params;
  const { id } = req.user;

  try {
    const job = await prisma.job.findUnique({
      where: {
        id: jobid,
      },
    });

    if (!job) return res.status(404).send({ message: "Job not found" });
    if (job.recruiterId !== id)
      return res
        .status(401)
        .send({ message: "You can only edit jobs you created" });

    const updatedJob = await prisma.job.update({
      where: {
        id: jobid,
      },
      data: {
        ...req.body,
      },
    });
    res.status(201).send(updatedJob);
  } catch (err) {
    res.status(500).send({ message: "Could not update job. Try again" });
    console.log(err);
  }
});

//Delete job post
router.delete("/:jobid", getUser, async (req, res) => {
  const { jobid } = req.params;
  const { id } = req.user;

  try {
    const job = await prisma.job.findUnique({
      where: {
        id: jobid,
      },
    });

    if (!job) return res.status(404).send({ message: "Job not found" });
    if (id !== job.recruiterId)
      return res
        .status(401)
        .send({ message: "You can only delete jobs you created" });

    await prisma.job.delete({
      where: {
        id: jobid,
      },
    });
    res.status(200).send({ message: "Job deleted successfully" });
  } catch (err) {
    res.status(500).send({ message: "Could not delete job. Try again" });
    console.log(err);
  }
});

//search jobs
router.post("/search", async (req, res) => {
  try {
    const jobs = await prisma.job.findMany(req.body);
    res.status(200).send(jobs);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

//Get 20 jobs sorted by createdat
router.get("/", async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
    res.status(200).send(jobs);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

module.exports = router;
