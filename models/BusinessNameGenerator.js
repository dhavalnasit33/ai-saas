const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const BusinessNameGenerator = mongoose.model("BusinessNameGenerator", baseSchema);
module.exports = BusinessNameGenerator;
