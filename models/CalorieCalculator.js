const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const CalorieCalculator = mongoose.model("CalorieCalculator", baseSchema);
module.exports = CalorieCalculator;
