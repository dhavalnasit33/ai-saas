const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const LifeGoalsGenerator = mongoose.model("LifeGoalsGenerator", baseSchema);

module.exports = LifeGoalsGenerator;
