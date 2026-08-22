const  mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const VisionBoardGenerator = mongoose.model("VisionBoardGenerator", baseSchema);

module.exports = VisionBoardGenerator