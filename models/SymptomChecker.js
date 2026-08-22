const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const SymptomChecker = mongoose.model("SymptomChecker", baseSchema);
module.exports = SymptomChecker;
