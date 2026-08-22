const express = require('express')
const Contact = require('../models/contactUser');
const { validateContactUser, handleValidationErrors } = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');
const emailService = require('../utils/emailService');
const router = express.Router();


// @desc get all contact user 
// @route GET /api/contact-user
// @access Public 

router.get('/',protect, async (req, res) => {
    try {
        
        const { page = 1, limit = 10, search = '', category  = '' } = req.query;
        let query = {};

        if (category) {
            query ={
                ...query,
                issueCategory: category
            }
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } }
            ];
        }
        const skip = (page - 1) * limit;
        const [contact, total] = await Promise.all([
            Contact.find(query)
                .populate('issueCategory', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Contact.countDocuments(query),
        ]);
        res.json({
            success: true,
            data: contact,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / limit),
                total,
            },
        });
    } catch (error) {
        console.error("Get contact user error: ", error);
        res.status(500).json({ Success: false, message: "Server Error" });
    }
});


// @desc Create new contact user 
// @route POST /api/contact-user
// @access Public
router.post("/", validateContactUser, handleValidationErrors, async (req, res) => {
  try {
    const contactData = { ...req.body };
    const contact = await Contact.create(contactData);

    // 1️⃣ Send email to Admin immediately
    await emailService.sendEmailTemplate(
      process.env.ADMIN_EMAIL,
    //   'New Contact Form Submission',
    contact.subject,
      'contactFormSubmission',   
      {
        name: contact.name,
        email: contact.email,
        issueCategory: contact.issueCategory,
        subject: contact.subject,
        message: contact.message,
        createdAt: contact.createdAt.toLocaleString(),
      },
       { replyTo: contact.email } 
    );

    // // 2️⃣ Send email to User immediately (or you can delay using setTimeout if you prefer)
    // await emailService.sendEmailTemplate(
    //   req.body.email,
    //   'Thank You for Contacting Us!',
    //   'contactUserThankYou',
    //   {
    //     name: req.body.name,
    //     email: req.body.email
    //   }
    // );

    res.status(201).json({
      success: true,
      message: 'Contact is added successfully. Emails sent to admin and user.',
    });
  } catch (error) {
    console.error('Error adding contact or sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});


// @desc Delete contact user
// @route DELETE /api/contact-user/:id
// @access  Private (Admin only)

router.delete("/:id", protect, authorize("admin"), async (req, res) => {
    try {
        const id = req.params.id;
        const contact = await Contact.findById(id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found',
            })
        }

        await Contact.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Contact deleted successfully',
        })

    } catch (error) {
        console.error("Delete contact error : ", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
})


// @desc Delete multiple contact user
// @route DELETE /api/contact-user/
// @access  Private (Admin only)

router.delete("/", protect, authorize("admin"), async (req, res) => {

    const contactsToDelete = req.body;
  
    if (!Array.isArray(contactsToDelete) || contactsToDelete.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Please provide an array of objects with id and name to delete",
        });
    }

    const ids = contactsToDelete.map(c => c.id);

    try {
        // Fetch existing contact IDs from the database
        const existingContacts = await Contact.find({ _id: { $in: ids } }).select('_id').lean();
        const existingIds = existingContacts.map(c => c._id.toString());

        // Identify missing IDs and their names
        const missingContacts = contactsToDelete.filter(c => !existingIds.includes(c.id));

        if (missingContacts.length > 0) {
            const missingNames = missingContacts.map(c => c.name);
            return res.status(404).json({
                success: false,
                message: `Contacts not found: ${missingNames.join(', ')}`,
                missingContacts,
            });
        }

        // Proceed with deletion
        const result = await Contact.deleteMany({ _id: { $in: ids } });
        return res.json({
            success: true,
            message: `${result.deletedCount} contacts deleted successfully`,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error during bulk delete",
        });
    }
});



module.exports = router
 