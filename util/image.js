const fs = require("fs");
const path = require("path");

exports.clearImage = (filePath) => {
  filepath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.log(err);
    }
  });
};
