const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const SmallBusinessIdeaGenerator = mongoose.model("SmallBusinessIdeaGenerator", baseSchema);
module.exports = SmallBusinessIdeaGenerator;
