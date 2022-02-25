const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const credentials = require("./middleware/credentials");

const corsOptions = require("./config/corsOptions");

const app = express();

app.use(credentials);

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

const userRoutes = require("./routes/users");
const jobRoutes = require("./routes/jobs");
const profileRoutes = require("./routes/profiles");

app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/profiles", profileRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
