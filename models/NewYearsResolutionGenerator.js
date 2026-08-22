const mongoose =  require('mongoose');
const baseSchema = require('./commonSchema');

const NewYearsResolutionGenerator =  mongoose.model('NewYearsResolutionGenerator', baseSchema);

module.exports = NewYearsResolutionGenerator;