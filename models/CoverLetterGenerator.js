const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const CoverLetterGenerator = mongoose.model("CoverLetterGenerator", baseSchema);
module.exports = CoverLetterGenerator;

