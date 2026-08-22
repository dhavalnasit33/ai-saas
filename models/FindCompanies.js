const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const FindCompanies = mongoose.model("FindCompanies", baseSchema);
module.exports = FindCompanies;
