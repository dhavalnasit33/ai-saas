const mongoose = require("mongoose");

const savedContentManagerSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // reference to the User model
            required: true,
        },
        content_name: {
            type: String,
            required: true,
        },
        content_text: {
            type: String,
            required: true, 
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SavedContent", savedContentManagerSchema);