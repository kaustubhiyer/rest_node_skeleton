const express = require("express");
const { body } = require("express-validator");

const authController = require("../controllers/auth");

const User = require("../models/user");

const router = express.Router();

router.put(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail()
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((user) => {
          if (user) {
            return Promise.reject("Email address already exists!");
          }
        });
      }),
    body(
      "password",
      "Password must be at least 6 characters in length and be alphanumeric"
    )
      .trim()
      .isAlphanumeric()
      .isLength({ min: 6 }),
    body("name").trim().not().isEmpty(),
  ],
  authController.signup
);

router.post("/login", authController.login);

module.exports = router;
