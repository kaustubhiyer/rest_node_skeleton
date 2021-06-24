// Module Imports
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");

// Routes import
const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");

// Initialize
const app = express();
dotenv.config();
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Setup routes
app.use(express.json());
app.use(cors());
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(
  multer({
    storage: fileStorage,
    fileFilter: fileFilter,
  }).single("image")
);

app.use("/feed", feedRoutes);
app.use("/auth", authRoutes);

app.use((err, req, res, next) => {
  console.log(err);
  const status = err.status || 500;
  const msg = err.message;
  const data = err.data;
  return res.status(status).json({
    message: msg,
    data,
  });
});

// Listen
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const server = app.listen(8080);
    const io = require("./socket").init(server);
    io.on("connection", (socket) => {
      console.log("client connected");
    });
  })
  .catch((err) => console.error(err));
