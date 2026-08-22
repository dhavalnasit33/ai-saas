const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const NutritionPlanner = mongoose.model("NutritionPlanner", baseSchema);
module.exports = NutritionPlanner;
