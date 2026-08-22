const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFDocument, rgb, degrees } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { protect } = require("../middleware/auth");
const { createCanvas } = require("canvas");
const CloudConvert = require("cloudconvert"); // NEW SDK
const axios = require("axios"); // Still needed for downloading result streams
const opentype = require("opentype.js");
const router = express.Router();
const JSZip = require("jszip"); // Ensure this is installed for zipping output

// --- CONFIGURATION ---
const uploadsDir = path.join(__dirname, "../uploads/converter");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// CloudConvert Configuration
const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;
const USE_SANDBOX = process.env.CLOUDCONVERT_SANDBOX === 'true';
if (!CLOUDCONVERT_API_KEY) {
  console.error("WARNING: CLOUDCONVERT_API_KEY is missing from environment variables.");
}

const cloudConvert = new CloudConvert(CLOUDCONVERT_API_KEY, USE_SANDBOX);
console.log("cloudConvert",cloudConvert)

// --- HELPER: CloudConvert Processor ---
// Handles the Job creation, Upload, Wait, and Download cycle
async function processCloudConvert(operation, outputFormat, files, options = {}) {
  try {
    const fileList = Array.isArray(files) ? files : [files];
    
    // 1. Build the Job Task Graph
    const tasks = {};
    const importTaskNames = [];

    // Create an import task for every file
    fileList.forEach((file, index) => {
      const taskName = `import-${index}`;
      importTaskNames.push(taskName);
      tasks[taskName] = {
        operation: "import/upload",
      };
    });

    // Create the processing task (convert, merge, or optimize)
    const processTaskName = "task-process";
    
    // Logic for Merge vs Convert
    let taskPayload = {
      operation: operation, // 'convert', 'optimize', 'merge'
      ...options,
    };

    if (operation === "merge") {
      taskPayload.input = importTaskNames; // Merge takes array
      taskPayload.output_format = outputFormat;
    } else {
      taskPayload.input = importTaskNames[0]; // Convert takes single
      if (outputFormat) taskPayload.output_format = outputFormat;
    }

    tasks[processTaskName] = taskPayload;

    // Create the export task
    tasks["export-file"] = {
      operation: "export/url",
      input: processTaskName,
    };

    // 2. Create the Job
    const job = await cloudConvert.jobs.create({ tasks });

    // 3. Upload Files
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const taskName = `import-${i}`;
      const uploadTask = job.tasks.find((t) => t.name === taskName);
      
      const filePath = path.join(uploadsDir, file.filename);
      const readStream = fs.createReadStream(filePath);
      
      await cloudConvert.tasks.upload(uploadTask, readStream, file.filename);
    }

    // 4. Wait for completion
    const finishedJob = await cloudConvert.jobs.wait(job.id);
    const exportTask = finishedJob.tasks.find((t) => t.name === "export-file");
    
    if (!exportTask || exportTask.status !== "finished") {
      throw new Error("Conversion job failed or did not finish.");
    }

    const resultFile = exportTask.result.files[0];
    const downloadUrl = resultFile.url;
    const outputFileName = `${Date.now()}-${resultFile.filename}`;
    const outputPath = path.join(uploadsDir, outputFileName);

    // 5. Download the Result
    const writer = fs.createWriteStream(outputPath);
    const downloadRes = await axios({
      url: downloadUrl,
      method: "GET",
      responseType: "stream",
    });

    downloadRes.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve({
        path: outputPath,
        filename: outputFileName,
        url: `/uploads/converter/${outputFileName}`,
      }));
      writer.on("error", reject);
    });

  } catch (err) {
    console.error(`CloudConvert Error [${operation}]:`, err.message);
    // Log detailed CloudConvert error if available
    if (err.response && err.response.data) {
        console.error("API details:", JSON.stringify(err.response.data, null, 2));
    }
    throw new Error("File processing failed via CloudConvert.");
  }
}

// --- MULTER CONFIGURATION (Unchanged) ---
const ALLOWED_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/html",
  "text/plain",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeName = file.fieldname + "-" + uniqueSuffix + ext;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if ([".php", ".exe", ".sh", ".js"].includes(ext)) {
      return cb(new Error("Security Error: Executable files are not allowed."));
  }
  if (ALLOWED_MIMES.includes(file.mimetype) || ext.length > 1) {
    return cb(null, true);
  }
  cb(new Error(`Security Error: File type ${file.mimetype} / ${ext} is not supported.`));
};

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: fileFilter,
});

function validateFileType(allowedTypes = []) {
  return (req, res, next) => {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: "No file uploaded." });
    
    // Simple extension check is usually sufficient after Multer
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    
    // Map complex extensions to simple keys
    const extMapping = {
        docx: 'docx', doc: 'doc', 
        xlsx: 'xlsx', xls: 'xls', 
        pptx: 'pptx', ppt: 'ppt',
        pdf: 'pdf', 
        png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp'
    };

    const simpleExt = extMapping[ext] || ext;
    
    // Check if the simple extension is in the allowed list (handling generic mappings)
    const isAllowed = allowedTypes.some(type => {
        return type === simpleExt || type === ext;
    });

    if (!isAllowed) {
      return res.status(400).json({
        success: false,
        error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
      });
    }
    next();
  };
}

// ==========================================
// 1. WORD TO PDF (CloudConvert)
// ==========================================
router.post(
  "/word-to-pdf",
  upload.single("file"),
  validateFileType(["docx", "doc"]),
  async (req, res) => {
    try {
      const result = await processCloudConvert("convert", "pdf", req.file);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({ success: true, message: "Word to PDF success", pdfPath: result.url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ==========================================
// 2. PDF TO WORD (CloudConvert)
// ==========================================
router.post("/pdf-to-word", upload.single("file"), validateFileType(["pdf"]), async (req, res) => {
    try {
      const result = await processCloudConvert("convert", "docx", req.file);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({ success: true, message: "PDF to Word success", wordPath: result.url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 3. EXCEL TO PDF (CloudConvert)
// ==========================================
router.post(
  "/excel-to-pdf",
  upload.single("file"),
  validateFileType(["xlsx", "xls"]),
  async (req, res) => {
    try {
      const result = await processCloudConvert("convert", "pdf", req.file);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({ success: true, message: "Excel to PDF success", pdfPath: result.url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ==========================================
// 4. PDF TO EXCEL (CloudConvert)
// ==========================================
router.post("/pdf-to-excel", upload.single("file"), validateFileType(["pdf"]), async (req, res) => {
    try {
      const result = await processCloudConvert("convert", "xlsx", req.file);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({ success: true, message: "PDF to Excel success", excelPath: result.url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 5. POWERPOINT TO PDF (CloudConvert)
// ==========================================
router.post(
  "/ppt-to-pdf",
  upload.single("file"),
  validateFileType(["ppt", "pptx"]),
  async (req, res) => {
    try {
      const result = await processCloudConvert("convert", "pdf", req.file);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({ success: true, message: "PPT to PDF success", pdfPath: result.url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ==========================================
// 6. PDF TO POWERPOINT (CloudConvert)
// ==========================================
router.post("/pdf-to-ppt", upload.single("file"), validateFileType(["pdf"]), async (req, res) => {
    try {
      const result = await processCloudConvert("convert", "pptx", req.file);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({ success: true, message: "PDF to PPT success", pptPath: result.url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 7. IMAGE TO PDF (CloudConvert)
// ==========================================
router.post(
  "/image-to-pdf",
  protect,
  upload.single("file"),
  validateFileType(["png", "jpg", "jpeg", "webp"]),
  async (req, res) => {
    try {
      const result = await processCloudConvert("convert", "pdf", req.file);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({ success: true, message: "Image to PDF success", pdfPath: result.url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ==========================================
// 8. PDF TO IMAGE (CloudConvert)
// ==========================================
router.post(
  "/pdf-to-image",
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      const { format } = req.body; // dynamic output format

      if (!file)
        return res.status(400).json({ success: false, error: "No PDF file uploaded." });

      if (!format)
        return res.status(400).json({ success: false, error: "Output format required (jpg, png, webp, pdf)." });

      const validFormats = ["jpg", "png", "webp", "pdf"];

      if (!validFormats.includes(format.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: `Invalid format. Allowed: ${validFormats.join(", ")}`,
        });
      }

      // Process Conversion using CloudConvert
      const result = await processCloudConvert("convert", format.toLowerCase(), file);

      // Delete uploaded original file
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      const isZip = result.filename.endsWith(".zip");

      res.json({
        success: true,
        message: `PDF converted to ${format.toUpperCase()} successfully`,
        downloadPath: result.url,
        isZip,
      });

    } catch (err) {
      console.error("PDF to image error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ==========================================
// 9. MERGE PDF (CloudConvert)
// ==========================================
router.post("/merge-pdf", upload.array("files", 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length < 2)
      return res.status(400).json({ success: false, error: "Upload at least 2 PDFs" });

    const result = await processCloudConvert("merge", "pdf", files);

    files.forEach((file) => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });

    res.json({
      success: true,
      message: "PDFs merged successfully",
      pdfPath: result.url,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 10. COMPRESS PDF (CloudConvert)
// ==========================================
router.post(
  "/compress-pdf",
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      
      // CloudConvert uses 'optimize' operation
      // profiles: 'web' (low size), 'print', 'archive', 'max' (high quality)
      let profile = "web"; 
      if (req.body.level === "high") profile = "web"; // high compression
      if (req.body.level === "low") profile = "print"; // low compression (better quality)

      const result = await processCloudConvert("optimize", "pdf", file, { profile: profile });

      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      res.json({
        success: true,
        message: `PDF compressed successfully`,
        pdfPath: result.url,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.post(
  "/split-pdf",
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No PDF uploaded" });

      const inputPath = path.join(uploadsDir, file.filename);
      const pdfBytes = fs.readFileSync(inputPath);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const totalPages = pdfDoc.getPageCount();

      const outputFiles = [];

      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);

        const newPdfBytes = await newPdf.save();
        const outputName = `${Date.now()}-page-${i + 1}.pdf`;
        const outputPath = path.join(uploadsDir, outputName);

        fs.writeFileSync(outputPath, newPdfBytes);

        outputFiles.push(`/uploads/converter/${outputName}`);
      }

      fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: "PDF split successfully",
        pages: outputFiles,
      });
    } catch (err) {
      console.error("Split PDF error:", err);
      res.status(500).json({ success: false, error: "PDF split failed" });
    }
  }
);

router.post("/split-pdf-range", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const { ranges } = req.body;

    if (!file)
      return res.status(400).json({ success: false, error: "No PDF uploaded" });

    if (!ranges)
      return res
        .status(400)
        .json({ success: false, error: "No ranges provided" });

    // Ensure uploaded file is a PDF
    if (file.mimetype !== "application/pdf")
      return res
        .status(400)
        .json({ success: false, error: "Uploaded file is not a PDF" });

    const inputPath = path.join(uploadsDir, file.filename);
    const pdfBytes = fs.readFileSync(inputPath);

    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes);
    } catch (err) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or corrupted PDF" });
    }

    const totalPages = pdfDoc.getPageCount();

    const rangeArr = ranges.split(",").map((r) => {
      const [start, end] = r.includes("-")
        ? r.split("-").map(Number)
        : [Number(r), Number(r)];
      return [start, end];
    });

    const outputFiles = [];

    for (let i = 0; i < rangeArr.length; i++) {
      const [start, end] = rangeArr[i];
      if (!start || !end || start < 1 || end > totalPages || start > end)
        return res
          .status(400)
          .json({ success: false, error: `Invalid range: ${start}-${end}` });

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(
        pdfDoc,
        Array.from({ length: end - start + 1 }, (_, idx) => start - 1 + idx)
      );
      copiedPages.forEach((page) => newPdf.addPage(page));

      const newPdfBytes = await newPdf.save();
      const outputName = `${Date.now()}-pages-${start}-${end}.pdf`;
      const outputPath = path.join(uploadsDir, outputName);
      fs.writeFileSync(outputPath, newPdfBytes);

      outputFiles.push({ path: outputPath, name: outputName });
    }

    fs.unlinkSync(inputPath); // delete original uploaded file

    if (outputFiles.length === 1) {
      // Single PDF → return directly
      return res.json({
        success: true,
        message: "PDF split successfully",
        pdfPath: `/uploads/converter/${outputFiles[0].name}`,
      });
    }

    // Multiple PDFs → create ZIP
    const zipName = `${Date.now()}-split.zip`;
    const zipPath = path.join(uploadsDir, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      // delete individual PDFs after zipping
      outputFiles.forEach((f) => fs.unlinkSync(f.path));
      res.json({
        success: true,
        message: "PDFs split and zipped successfully",
        zipPath: `/uploads/converter/${zipName}`,
      });
    });

    archive.on("error", (err) => {
      throw err;
    });
    archive.pipe(output);
    outputFiles.forEach((f) => archive.file(f.path, { name: f.name }));
    archive.finalize();
  } catch (err) {
    console.error("Split PDF by range error:", err);
    res
      .status(500)
      .json({ success: false, error: "PDF split by range failed" });
  }
});

// ==========================================
// 12. HELPER IMAGE CONVERSIONS (Local Sharp)
// ==========================================
// Kept as is - local conversion is best for simple images
async function convertImageLocal(req, res, targetFormat) {
  try {
    const file = req.file;
    const sharp = require("sharp");
    if (!file) return res.status(400).json({ success: false, error: "No file uploaded." });

    const inputPath = file.path;
    const outputFileName = `${Date.now()}-converted.${targetFormat}`;
    const outputPath = path.join(uploadsDir, outputFileName);

    await sharp(inputPath).toFile(outputPath);

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    res.json({
      success: true,
      message: `Converted to ${targetFormat.toUpperCase()}`,
      path: `/uploads/converter/${outputFileName}`,
    });
  } catch (err) {
    console.error(`Image conversion to ${targetFormat} failed:`, err);
    res.status(500).json({ success: false, error: "Conversion failed" });
  }
}

router.post("/webp-to-png", upload.single("file"), validateFileType(["webp"]), (req, res) => convertImageLocal(req, res, "png"));
router.post("/webp-to-jpg", upload.single("file"), validateFileType(["webp"]), (req, res) => convertImageLocal(req, res, "jpg"));
router.post("/jpg-to-webp", upload.single("file"), (req, res) => convertImageLocal(req, res, "webp"));
router.post("/png-to-webp", upload.single("file"), validateFileType(["png"]), (req, res) => convertImageLocal(req, res, "webp"));
router.post("/png-to-jpg", upload.single("file"), validateFileType(["png"]), (req, res) => convertImageLocal(req, res, "jpg"));
router.post("/jpg-to-png", upload.single("file"), (req, res) => convertImageLocal(req, res, "png"));

// =========================================================
// LOCAL PDF-LIB OPERATIONS (Edit, Sign, Rotate, Organize)
// =========================================================
// These remain unchanged as they use local pdf-lib which is free and fast.

router.post(
  "/rotate-pdf",
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      const rotationAngle = Number(req.body.angle) || 0;
      if (!file) return res.status(400).json({ success: false, error: "No PDF file uploaded." });

      const inputPath = path.join(uploadsDir, file.filename);
      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      pages.forEach((page) => {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotationAngle));
      });

      const outputFileName = `${Date.now()}-rotated.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);
      fs.writeFileSync(outputPath, await pdfDoc.save());
      
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({ success: true, message: `PDF rotated by ${rotationAngle} degrees`, pdfPath: `/uploads/converter/${outputFileName}` });
    } catch (err) {
      res.status(500).json({ success: false, error: "Rotation failed." });
    }
  }
);

router.post(
  "/organize-pdf",
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      const pageOrder = req.body.pages; 
      if (!file) return res.status(400).json({ success: false, error: "No PDF file uploaded." });
      if (!pageOrder) return res.status(400).json({ success: false, error: "Page order is required." });

      const inputPath = path.join(uploadsDir, file.filename);
      const pdfBytes = fs.readFileSync(inputPath);
      const srcPdf = await PDFDocument.load(pdfBytes);
      const totalPages = srcPdf.getPageCount();

      const indices = pageOrder.split(",")
        .map(p => Number(p.trim()) - 1)
        .filter(idx => idx >= 0 && idx < totalPages);

      if (indices.length === 0) return res.status(400).json({ success: false, error: "Invalid page selection." });

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(srcPdf, indices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const outputFileName = `${Date.now()}-organized.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);
      fs.writeFileSync(outputPath, await newPdf.save());

      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({ success: true, message: "PDF organized successfully", pdfPath: `/uploads/converter/${outputFileName}` });
    } catch (err) {
      res.status(500).json({ success: false, error: "Organizing failed." });
    }
  }
);

router.post(
  "/edit-pdf",
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      const { modifications, erasures } = req.body;
      if (!file) return res.status(400).json({ success: false, error: "No PDF file uploaded." });

      const inputPath = path.join(uploadsDir, file.filename);
      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.registerFontkit(fontkit);

      const { StandardFonts } = require("pdf-lib");
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const helveticaBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      const pages = pdfDoc.getPages();

      if (erasures) {
        let erasureList = [];
        try { erasureList = JSON.parse(erasures); } catch (e) {}
        for (const erase of erasureList) {
          const pageIndex = (erase.page || 1) - 1;
          if (pageIndex >= 0 && pageIndex < pages.length) {
            pages[pageIndex].drawRectangle({
              x: Number(erase.x), y: Number(erase.y),
              width: Number(erase.width), height: Number(erase.height),
              color: rgb(1, 1, 1),
            });
          }
        }
      }

      let edits = [];
      if (modifications) { try { edits = JSON.parse(modifications); } catch (e) {} }

      for (const edit of edits) {
        const pageIndex = (edit.page || 1) - 1;
        while (pageIndex >= pages.length) pages.push(pdfDoc.addPage());
        
        const page = pages[pageIndex];
        const fontSize = Number(edit.size) || 12;
        let fontToUse = helvetica;
        if (edit.isBold && edit.isItalic) fontToUse = helveticaBoldItalic;
        else if (edit.isBold) fontToUse = helveticaBold;
        else if (edit.isItalic) fontToUse = helveticaItalic;

        const colorValues = edit.color ? edit.color.split(",").map(Number) : [0, 0, 0];
        const pdfColor = rgb(colorValues[0] / 255, colorValues[1] / 255, colorValues[2] / 255);

        page.drawText(edit.text, {
          x: Number(edit.x), y: Number(edit.y),
          size: fontSize, font: fontToUse, color: pdfColor,
        });

        if (edit.isUnderline) {
          const textWidth = fontToUse.widthOfTextAtSize(edit.text, fontSize);
          page.drawLine({
            start: { x: Number(edit.x), y: Number(edit.y) - 2 },
            end: { x: Number(edit.x) + textWidth, y: Number(edit.y) - 2 },
            thickness: 1, color: pdfColor,
          });
        }
      }

      const outputFileName = `${Date.now()}-edited.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);
      fs.writeFileSync(outputPath, await pdfDoc.save());

      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({ success: true, message: "PDF edited successfully", pdfPath: `/uploads/converter/${outputFileName}` });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to edit PDF" });
    }
  }
);

// --- SIGNATURE GENERATION (Local Canvas - Unchanged) ---
const fontFiles = [
  { file: "Pacifico-Regular.ttf", name: "Pacifico" },
  { file: "GreatVibes-Regular.ttf", name: "GreatVibes" },
  { file: "Allura-Regular.ttf", name: "Allura" },
  { file: "DancingScript-Regular.ttf", name: "DancingScript" },
  { file: "Parisienne-Regular.ttf", name: "Parisienne" },
];
const fontsDir = path.join(__dirname, "..", "fonts");

router.post("/generate-signatures", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const dir = path.join(__dirname, "..", "uploads", "signatures");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const signatures = [];
    const formattedName = name.trim();

    for (const fontConfig of fontFiles) {
      const fontPath = path.join(fontsDir, fontConfig.file);
      if (!fs.existsSync(fontPath)) continue;

      const font = opentype.loadSync(fontPath);
      const canvas = createCanvas(800, 200, "png");
      const ctx = canvas.getContext("2d");

      let fontSize = 120;
      let textWidth = font.getAdvanceWidth(formattedName, fontSize);
      while (textWidth > 750 && fontSize > 20) {
        fontSize -= 5;
        textWidth = font.getAdvanceWidth(formattedName, fontSize);
      }

      const pathObject = font.getPath(formattedName, 0, 0, fontSize);
      const box = pathObject.getBoundingBox();
      const actualWidth = box.x2 - box.x1;
      const actualHeight = box.y2 - box.y1;
      const x = (800 - actualWidth) / 2 - box.x1;
      const y = (200 + actualHeight) / 2 - box.y2 * 0.2;

      const textPath = font.getPath(formattedName, x, y, fontSize);
      textPath.fill = "black";
      textPath.draw(ctx);

      const fileName = `${fontConfig.name}_${Date.now()}.png`;
      const filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
      signatures.push(`/uploads/signatures/${fileName}`);
    }

    res.json({ success: true, message: "Signatures generated", signatures });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- SIGN PDF (Local PDF-Lib - Unchanged) ---
router.post("/sign-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "PDF file is required" });

    const inputPath = path.join(uploadsDir, req.file.filename);
    const pdfDoc = await PDFDocument.load(fs.readFileSync(inputPath));
    const pages = pdfDoc.getPages();

    if (!req.body.signatures) return res.status(400).json({ success: false, error: "Signatures payload missing" });

    let signatures;
    try { signatures = JSON.parse(req.body.signatures); } catch (e) {
      return res.status(400).json({ success: false, error: "Invalid JSON format for signatures" });
    }

    for (const sig of signatures) {
      const { page, x, y, scale, signatureUrl, viewportWidth, viewportHeight } = sig;
      if (!signatureUrl) return res.status(400).json({ success: false, error: "signatureUrl is missing" });

      const response = await axios.get(signatureUrl, { responseType: "arraybuffer" });
      const imgBytes = Buffer.from(response.data);

      let embeddedImg;
      if (signatureUrl.endsWith(".jpg") || signatureUrl.endsWith(".jpeg")) {
        embeddedImg = await pdfDoc.embedJpg(imgBytes);
      } else {
        embeddedImg = await pdfDoc.embedPng(imgBytes);
      }

      const targetPage = pages[(page || 1) - 1];
      const { width: pdfPageWidth, height: pdfPageHeight } = targetPage.getSize();
      const vWidth = viewportWidth || pdfPageWidth;
      const vHeight = viewportHeight || pdfPageHeight;
      const scaleX = pdfPageWidth / vWidth;
      const scaleY = pdfPageHeight / vHeight;
      const finalX = x * scaleX;
      const yInPdfPointsFromTop = y * scaleY;
      const scaled = embeddedImg.scale(scale || 1);
      const pdfY = pdfPageHeight - yInPdfPointsFromTop - scaled.height;

      targetPage.drawImage(embeddedImg, {
        x: finalX, y: pdfY,
        width: scaled.width, height: scaled.height,
      });
    }

    const outputName = `signed-${Date.now()}.pdf`;
    const outputPath = path.join(uploadsDir, outputName);
    fs.writeFileSync(outputPath, await pdfDoc.save());
    fs.unlinkSync(inputPath);

    res.json({ success: true, message: "PDF signed successfully", pdfPath: `/uploads/converter/${outputName}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;