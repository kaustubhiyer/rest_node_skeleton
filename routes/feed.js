// Module imports
const express = require("express");
const { body } = require("express-validator");

// Controller/Middleware imports
const feedController = require("../controllers/feed");
const isAuth = require("../middleware/auth");

const router = express.Router();

// GET - /feed/posts
router.get("/posts", isAuth, feedController.getPosts);

// GET - /feed/post:postId
router.get("/post/:postId", isAuth, feedController.getPost);

// POST - /feed/post
router.post(
  "/post",
  isAuth,
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.createPost
);

// PUT - /feed/post
router.put(
  "/post/:postId",
  isAuth,
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.updatePost
);

// DELETE - /feed/post
router.delete("/post/:postId", isAuth, feedController.deletePost);

// GET - /feed/status
router.get("/status", isAuth, feedController.getStatus);

// PUT - /feed/status
router.put(
  "/status",
  isAuth,
  [body("status").isString().not().isEmpty()],
  feedController.updateStatus
);

module.exports = router;
