const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mammoth = require("mammoth");
const { PDFDocument, rgb, PDFName } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const {
  Document,
  Packer,
  Paragraph,
  ImageRun,
  TextRun,
  Table,
  TableRow,
  TableCell,
} = require("docx");
const { protect } = require("../middleware/auth");
const mime = require("mime-types");
const { createCanvas, registerFont } = require("canvas");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const JSZip = require("jszip");
const sharp = require("sharp");
const fsPromises = require("fs").promises;
const XLSX = require("xlsx");
const ConvertAPI = require("convertapi");
const axios = require("axios");
const convertapi = new ConvertAPI(process.env.CONVERT_API_KEY);
const archiver = require("archiver");
const opentype = require("opentype.js");
const ssrfFilter = require("ssrf-req-filter");
const router = express.Router();

const uploadsDir = path.join(__dirname, "../uploads/converter");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

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
  "image/heic", // <-- ADD THIS
  "image/heif", // <-- ADD THIS (often used interchangeably)
];

// --- SECURITY: Safe Storage Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // 1. Force lowercase extension
    const ext = path.extname(file.originalname).toLowerCase();

    // 2. Generate timestamp + random string to prevent overwriting
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    // 3. Sanitize filename (remove special chars)
    const safeName = file.fieldname + "-" + uniqueSuffix + ext;

    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedExts = [
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".pot",
    ".potx",
    ".xls",
    ".xlsx",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".txt",
    ".html",
    ".heic", // <-- ADD THIS
    ".heif", // <-- ADD THIS
  ];

  // Allow file if extension is valid EVEN IF MIME is application/octet-stream
  if (ALLOWED_MIMES.includes(file.mimetype) || allowedExts.includes(ext)) {
    // Block dangerous extensions
    if ([".php", ".exe", ".sh", ".js"].includes(ext)) {
      return cb(new Error("Security Error: Executable files are not allowed."));
    }
    return cb(null, true);
  }

  cb(
    new Error(
      `Security Error: File type ${file.mimetype} / ${ext} is not supported.`,
    ),
  );
};

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: fileFilter,
});

function validateFileType(allowedTypes = []) {
  return (req, res, next) => {
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded." });
    }

    const mimetype = (file.mimetype || "").toLowerCase();
    const ext = path
      .extname(file.originalname || "")
      .slice(1)
      .toLowerCase(); // get extension without "."

    const typeMap = {
      pdf: ["application/pdf", "application/octet-stream"], // allow octet-stream for Flutter web
      docx: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      ppt: ["application/vnd.ms-powerpoint"],
      pptx: [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ],
      pot: ["application/vnd.ms-powerpoint"],
      potx: [
        "application/vnd.openxmlformats-officedocument.presentationml.template",
      ],
      xlsx: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      jpg: ["image/jpeg"],
      jpeg: ["image/jpeg"],
      png: ["image/png"],
      webp: ["image/webp"],
      heic: ["image/heic", "image/heif", "application/octet-stream"],
    };

    const isValid = allowedTypes.some((type) => {
      return (
        typeMap[type]?.includes(mimetype) || ext === type // fallback to extension
      );
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid file type. Allowed only: ${allowedTypes.join(", ")}`,
      });
    }

    next();
  };
}

async function convertImageApi(req, res, targetFormat) {
  try {
    const file = req.file;
    if (!file)
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded." });

    const inputPath = path.join(uploadsDir, file.filename);
    const outputFileName = `${Date.now()}-converted.${targetFormat}`;
    const outputPath = path.join(uploadsDir, outputFileName);

    // Call ConvertAPI
    const result = await convertapi.convert(targetFormat, { File: inputPath });

    // Save Result
    await result.file.save(outputPath);

    // Cleanup Input
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

async function pdfToExcel(inputPath, outputPath, layoutMode) {
  try {
    const result = await convertapi.convert(
      "xlsx",
      {
        File: inputPath,
        Ocr: "true",
        SplitWorkbook: layoutMode === "multiple" ? "true" : "false",
        OcrLanguages: "eng",
      },
      "pdf",
    );

    await result.files[0].save(outputPath);
  } catch (err) {
    console.error("OCR PDF-to-Excel error:", err);
    throw new Error("PDF to Excel failed (OCR)");
  }
}

router.post(
  "/word-to-pdf",
  protect,
  upload.single("file"),
  validateFileType(["docx"]),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });

      const inputPath = path.join(uploadsDir, file.filename);
      const outputFile = `${Date.now()}-converted.pdf`;
      const outputPath = path.join(uploadsDir, outputFile);

      const result = await convertapi.convert(
        "pdf",
        { File: inputPath },
        "docx",
      );

      await result.file.save(outputPath);
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: "DOCX → PDF success",
        pdfPath: `/uploads/converter/${outputFile}`,
      });
    } catch (err) {
      console.error("DOCX-to-PDF error:", err);
      res.status(500).json({ success: false, error: "Conversion failed" });
    }
  },
);

// 2. PDF to DOCX (ConvertAPI)
router.post(
  "/pdf-to-word",
  protect,
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });

      const inputPath = path.join(uploadsDir, file.filename);
      const outFile = `${Date.now()}-converted.docx`;
      const outPath = path.join(uploadsDir, outFile);

      const result = await convertapi.convert(
        "docx",
        { File: inputPath },
        "pdf",
      );

      await result.file.save(outPath);
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: "PDF → DOCX success",
        wordPath: `/uploads/converter/${outFile}`,
      });
    } catch (err) {
      console.error("PDF-to-Word error:", err);
      res.status(500).json({ success: false, error: "Conversion failed" });
    }
  },
);
// 3. Image to PDF (ConvertAPI)
router.post(
  "/image-to-pdf",
  protect,
  protect,
  upload.single("file"),
  validateFileType(["png", "jpg", "jpeg", "webp"]),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded." });

      const inputPath = path.join(uploadsDir, file.filename);
      const outputFileName = `${Date.now()}-image.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);

      const result = await convertapi.convert("pdf", { File: inputPath });

      await result.file.save(outputPath);
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: "PDF generated successfully",
        pdfPath: `/uploads/converter/${outputFileName}`,
      });
    } catch (err) {
      console.error("Image to PDF error:", err);
      res.status(500).json({ success: false, error: "Error converting image" });
    }
  },
);

// 4. PDF to Image (ConvertAPI)
router.post(
  "/pdf-to-image",
  protect,
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded." });

      const inputPath = path.join(uploadsDir, file.filename);
      const format = req.body.format === "jpg" ? "jpg" : "png";

      const result = await convertapi.convert(
        format,
        {
          File: inputPath,
          ScaleImage: "true",
          ScaleProportions: "true",
        },
        "pdf",
      );

      const images = [];
      // ConvertAPI returns result.files (array)
      for (let i = 0; i < result.files.length; i++) {
        const outputFileName = `${Date.now()}-page-${i + 1}.${format}`;
        const outputPath = path.join(uploadsDir, outputFileName);
        await result.files[i].save(outputPath);
        images.push({
          page: i + 1,
          path: `/uploads/converter/${outputFileName}`,
        });
      }

      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: "PDF converted to images successfully",
        images,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Conversion failed" });
    }
  },
);

router.post(
  "/webp-to-png",
  protect,
  upload.single("file"),
  validateFileType(["webp"]),
  (req, res) => convertImageApi(req, res, "png"),
);
router.post(
  "/webp-to-jpg",
  protect,
  upload.single("file"),
  validateFileType(["webp"]),
  (req, res) => convertImageApi(req, res, "jpg"),
);
router.post("/jpg-to-webp", protect, upload.single("file"), (req, res) =>
  convertImageApi(req, res, "webp"),
);
router.post(
  "/png-to-webp",
  protect,
  upload.single("file"),
  validateFileType(["png"]),
  (req, res) => convertImageApi(req, res, "webp"),
);
router.post(
  "/png-to-jpg",
  protect,
  upload.single("file"),
  validateFileType(["png"]),
  (req, res) => convertImageApi(req, res, "jpg"),
);
router.post("/jpg-to-png", protect, upload.single("file"), (req, res) =>
  convertImageApi(req, res, "png"),
);

// router.post("/html-to-pdf", upload.single("file"), async (req, res) => {
//   try {
//     const file = req.file;
//     if (!file)
//       return res
//         .status(400)
//         .json({ success: false, error: "No HTML uploaded" });

//     const inputPath = path.join(uploadsDir, file.filename);
//     const outputFileName = `${Date.now()}-html.pdf`;
//     const outputPath = path.join(uploadsDir, outputFileName);

//     const result = await convertapi.convert("pdf", { File: inputPath });

//     await result.file.save(outputPath);
//     fs.unlinkSync(inputPath);

//     res.json({
//       success: true,
//       message: "HTML converted to PDF successfully",
//       pdfPath: `/uploads/converter/${outputFileName}`,
//     });
//   } catch (err) {
//     console.error("HTML → PDF error:", err);
//     res
//       .status(500)
//       .json({ success: false, error: "HTML to PDF conversion failed" });
//   }
// });

// router.post("/url-to-pdf", async (req, res) => {
//   try {
//     const { url } = req.body;
//     if (!url)
//       return res.status(400).json({ success: false, error: "URL is required" });

//     if (!url.startsWith("http://") && !url.startsWith("https://")) {
//       return res.status(400).json({ error: "Invalid protocol" });
//     }

//     // 2. Safe Request using SSRF Filter
//     const response = await axios.get(url, {
//       httpAgent: ssrfFilter.httpAgent(),
//       httpsAgent: ssrfFilter.httpsAgent(),
//     });
//     const htmlContent = response.data;

//     const tempHtmlPath = path.join(uploadsDir, `${Date.now()}-temp.html`);
//     fs.writeFileSync(tempHtmlPath, htmlContent);

//     const outputFileName = `${Date.now()}-url.pdf`;
//     const outputPath = path.join(uploadsDir, outputFileName);

//     // 2. Convert HTML file to PDF using ConvertAPI
//     const result = await convertapi.convert("pdf", { File: tempHtmlPath });

//     await result.file.save(outputPath);

//     fs.unlinkSync(tempHtmlPath);

//     res.json({
//       success: true,
//       message: "URL converted to PDF successfully",
//       pdfPath: `/uploads/converter/${outputFileName}`,
//     });
//   } catch (err) {
//     console.error("URL → PDF error:", err);
//     res
//       .status(500)
//       .json({ success: false, error: "URL to PDF conversion failed" });
//   }
// });

// router.post("/pdf-to-excel", upload.single("file"), async (req, res) => {
//   try {
//     const file = req.file;
//     if (!file) {
//       return res
//         .status(400)
//         .json({ success: false, error: "No PDF file uploaded." });
//     }

//     const inputPath = path.join(uploadsDir, file.filename);
//     const outputFileName = `${Date.now()}-converted.xlsx`;
//     const outputPath = path.join(uploadsDir, outputFileName);

//     // Call the helper function
//     await pdfToExcel(inputPath, outputPath);

//     // Cleanup: Remove the uploaded PDF
//     fs.unlinkSync(inputPath);

//     res.json({
//       success: true,
//       message: "PDF converted to Excel successfully",
//       excelPath: `/uploads/converter/${outputFileName}`,
//     });
//   } catch (err) {
//     console.error("PDF to Excel conversion error:", err);
//     res.status(500).json({
//       success: false,
//       error: "Error converting PDF to Excel",
//     });
//   }
// });

router.post(
  "/pdf-to-excel",
  protect,
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded." });

      const layoutMode = req.body.layout || "multiple";
      const inputPath = path.join(uploadsDir, file.filename);
      const outputFileName = `${Date.now()}-converted.xlsx`;
      const outputPath = path.join(uploadsDir, outputFileName);

      const result = await convertapi.convert(
        "xlsx",
        {
          File: inputPath,
          Ocr: "true",
          SplitWorkbook: layoutMode === "multiple" ? "true" : "false",
        },
        "pdf",
      );

      await result.files[0].save(outputPath);
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: "PDF converted to Excel successfully",
        layoutModeUsed: layoutMode,
        excelPath: `/uploads/converter/${outputFileName}`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Conversion failed" });
    }
  },
);

// 7. PPT to PDF (ConvertAPI)
router.post(
  "/ppt-to-pdf",
  protect,
  upload.single("file"),
  validateFileType(["ppt", "pptx", "pot", "potx"]),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No PowerPoint file uploaded." });

      const inputPath = path.join(uploadsDir, file.filename);
      const outputFileName = `${Date.now()}-presentation.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);

      const result = await convertapi.convert(
        "pdf",
        { File: inputPath },
        "pptx",
      );

      await result.saveFiles(outputPath);
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: "PowerPoint converted to PDF successfully",
        pdfPath: `/uploads/converter/${outputFileName}`,
      });
    } catch (err) {
      console.error("PPT conversion error:", err);
      res.status(500).json({ success: false, error: "Conversion failed." });
    }
  },
);

// 8. Merge PDF (Updated to use ConvertAPI)
router.post(
  "/merge-pdf",
  protect,
  upload.array("files", 10),
  async (req, res) => {
    try {
      const files = req.files;
      if (!files || files.length < 2)
        return res
          .status(400)
          .json({ success: false, error: "Upload at least 2 PDFs" });

      // Map files to paths
      const inputPaths = files.map((file) =>
        path.join(uploadsDir, file.filename),
      );
      const outputFileName = `${Date.now()}-merged.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);

      // Call ConvertAPI Merge
      const result = await convertapi.convert("merge", {
        Files: inputPaths,
      });

      await result.file.save(outputPath);

      // Cleanup inputs
      files.forEach((file) => {
        const p = path.join(uploadsDir, file.filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });

      res.json({
        success: true,
        message: "PDFs merged successfully",
        pdfPath: `/uploads/converter/${outputFileName}`,
      });
    } catch (err) {
      console.error("Merge PDF error:", err);
      res.status(500).json({ success: false, error: "PDF merge failed" });
    }
  },
);

router.post(
  "/split-pdf",
  protect,
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
  },
);

router.post(
  "/split-pdf-range",
  protect,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const { ranges } = req.body;

      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No PDF uploaded" });

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
          Array.from({ length: end - start + 1 }, (_, idx) => start - 1 + idx),
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
  },
);

router.post(
  "/edit-pdf",
  protect,
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      const { modifications, erasures } = req.body;

      // 1. CONSTANTS FROM FLUTTER UI
      const CANVAS_W = 600;
      const CANVAS_H = 800;

      if (!file) {
        return res
          .status(400)
          .json({ success: false, error: "No PDF file uploaded." });
      }

      const inputPath = path.join(uploadsDir, file.filename);
      const pdfBytes = fs.readFileSync(inputPath);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.registerFontkit(fontkit);

      const { StandardFonts, rgb } = require("pdf-lib");
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaItalic = await pdfDoc.embedFont(
        StandardFonts.HelveticaOblique,
      );
      const helveticaBoldItalic = await pdfDoc.embedFont(
        StandardFonts.HelveticaBoldOblique,
      );

      const pages = pdfDoc.getPages();

      // === HELPER: CALCULATE TRANSFORM ===
      // This mimics how Flutter fits the image inside the 600x800 box (BoxFit.contain)
      const getTransform = (page) => {
        const { width: pdfW, height: pdfH } = page.getSize();

        const pdfRatio = pdfW / pdfH;
        const canvasRatio = CANVAS_W / CANVAS_H;

        let renderW, renderH, offsetX, offsetY, scaleFactor;

        if (pdfRatio < canvasRatio) {
          // PDF is taller (Fit Height) -> Horizontal Bars
          renderH = CANVAS_H;
          renderW = CANVAS_H * pdfRatio;
          scaleFactor = pdfH / CANVAS_H;
          offsetX = (CANVAS_W - renderW) / 2;
          offsetY = 0;
        } else {
          // PDF is wider (Fit Width) -> Vertical Bars
          renderW = CANVAS_W;
          renderH = CANVAS_W / pdfRatio;
          scaleFactor = pdfW / CANVAS_W;
          offsetX = 0;
          offsetY = (CANVAS_H - renderH) / 2;
        }

        return { scaleFactor, offsetX, offsetY };
      };

      // 2. APPLY ERASURES (Whiteout)
      if (erasures) {
        let erasureList = [];
        try {
          erasureList = JSON.parse(erasures);
        } catch (e) {}

        for (const erase of erasureList) {
          const pageIndex = (erase.page || 1) - 1;
          if (pageIndex >= 0 && pageIndex < pages.length) {
            const page = pages[pageIndex];
            const { scaleFactor, offsetX, offsetY } = getTransform(page);

            // Remove offset first (coordinate relative to image), then scale
            const finalX = (Number(erase.x) - offsetX) * scaleFactor;
            // Y is tricky: Flutter sends "800 - top - height".
            // We need to account for the vertical offset (black bars) if any.
            // If offsetY > 0, the image starts 'offsetY' pixels from bottom in Flutter logic?
            // Actually, simplest is: Treat X/Y as relative to the rendered image box.
            const finalY = (Number(erase.y) - offsetY) * scaleFactor;
            const finalW = Number(erase.width) * scaleFactor;
            const finalH = Number(erase.height) * scaleFactor;

            page.drawRectangle({
              x: finalX,
              y: finalY,
              width: finalW,
              height: finalH,
              color: rgb(1, 1, 1),
            });
          }
        }
      }

      // 3. APPLY TEXT MODIFICATIONS
      if (modifications) {
        let edits = [];
        try {
          edits = JSON.parse(modifications);
        } catch (e) {}

        for (const edit of edits) {
          const pageIndex = (edit.page || 1) - 1;
          while (pageIndex >= pages.length) pages.push(pdfDoc.addPage());

          const page = pages[pageIndex];
          const { scaleFactor, offsetX, offsetY } = getTransform(page);

          // Calculate Font
          const fontSizeRaw = Number(edit.size) || 18; // Default 18 from frontend
          const fontSize = fontSizeRaw * scaleFactor;

          let fontToUse = helvetica;
          if (edit.isBold && edit.isItalic) fontToUse = helveticaBoldItalic;
          else if (edit.isBold) fontToUse = helveticaBold;
          else if (edit.isItalic) fontToUse = helveticaItalic;

          // Color
          const c = edit.color ? edit.color.split(",").map(Number) : [0, 0, 0];
          const pdfColor = rgb(c[0] / 255, c[1] / 255, c[2] / 255);

          // Coordinates
          const finalX = (Number(edit.x) - offsetX) * scaleFactor;

          // Fix Text Y: Flutter sends the TOP of the text box.
          // PDF-Lib draws from the BASELINE (Bottom).
          // We must subtract fontSize to shift it down correctly.
          const rawY = (Number(edit.y) - offsetY) * scaleFactor;
          const finalY = rawY - fontSize * 0.8; // 0.8 approximates cap-height vs baseline

          page.drawText(edit.text, {
            x: finalX,
            y: finalY,
            size: fontSize,
            font: fontToUse,
            color: pdfColor,
          });
        }
      }

      // 4. SAVE
      const outputFileName = `${Date.now()}-edited.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);
      const savedBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, savedBytes);

      res.json({
        success: true,
        message: "PDF edited successfully",
        pdfPath: `/uploads/converter/${outputFileName}`,
      });
    } catch (err) {
      console.error("Edit PDF error:", err);
      res.status(500).json({ success: false, error: "Failed to edit PDF" });
    }
  },
);

const fontFiles = [
  { file: "Pacifico-Regular.ttf", name: "Pacifico" },
  { file: "GreatVibes-Regular.ttf", name: "GreatVibes" },
  { file: "Allura-Regular.ttf", name: "Allura" },
  { file: "DancingScript-Regular.ttf", name: "DancingScript" },
  { file: "Parisienne-Regular.ttf", name: "Parisienne" },
];

const fontsDir = path.join(__dirname, "..", "fonts");

router.post("/generate-signatures", protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const dir = path.join(__dirname, "..", "uploads", "signatures");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const signatures = [];
    const formattedName = name.trim();

    for (const fontConfig of fontFiles) {
      const fontPath = path.join(fontsDir, fontConfig.file);

      // Verify file exists before trying to load
      if (!fs.existsSync(fontPath)) {
        console.log(`❌ Skipped missing font: ${fontConfig.file}`);
        continue;
      }

      // 🟢 Load font file directly (Bypasses system registration)
      const font = opentype.loadSync(fontPath);

      const canvas = createCanvas(800, 200, "png");
      const ctx = canvas.getContext("2d");

      // 🟢 Dynamic Font Sizing with Opentype
      let fontSize = 120;
      let textWidth = font.getAdvanceWidth(formattedName, fontSize);

      // Shrink if too big
      while (textWidth > 750 && fontSize > 20) {
        fontSize -= 5;
        textWidth = font.getAdvanceWidth(formattedName, fontSize);
      }

      // 🟢 Calculate Centering
      // opentype draws from the baseline, so we need to calculate where to start
      const pathObject = font.getPath(formattedName, 0, 0, fontSize);
      const box = pathObject.getBoundingBox();
      const actualWidth = box.x2 - box.x1;
      const actualHeight = box.y2 - box.y1;

      // Center X: (Canvas Width - Text Width) / 2
      const x = (800 - actualWidth) / 2 - box.x1;
      // Center Y: (Canvas Height + Text Height) / 2 (approximate for baseline)
      const y = (200 + actualHeight) / 2 - box.y2 * 0.2;

      // 🟢 Draw the text path directly to the canvas context
      const textPath = font.getPath(formattedName, x, y, fontSize);
      textPath.fill = "black";
      textPath.draw(ctx);

      // Save
      const fileName = `${fontConfig.name}_${Date.now()}.png`;
      const filePath = path.join(dir, fileName);

      fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
      signatures.push(`/uploads/signatures/${fileName}`);
      console.log(`✅ Generated: ${fileName}`);
    }

    res.json({
      success: true,
      message: "Signatures generated",
      signatures,
    });
  } catch (err) {
    console.error("Signature Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/upload-drawn-signature", protect, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    const dir = path.join(__dirname, "..", "uploads", "signatures");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Remove the data URL header
    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    const fileName = `drawn_${Date.now()}.png`;
    const filePath = path.join(dir, fileName);

    fs.writeFileSync(filePath, base64Data, "base64");

    res.json({
      success: true,
      message: "Signature saved",
      url: `/uploads/signatures/${fileName}`,
    });
  } catch (err) {
    console.error("Upload Drawn Signature Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// router.post("/sign-pdf", uploadFields, async (req, res) => {
//   try {
//     const files = req.files;
//     if (!files || !files.file || !files.signature) {
//       return res.status(400).json({
//         success: false,
//         error: "Both PDF and Signature are required.",
//       });
//     }

//     const pdfPath = path.join(uploadsDir, files.file[0].filename);
//     const signPath = path.join(uploadsDir, files.signature[0].filename);

//     // 1. Load PDF and Signature
//     const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
//     const signFile = files.signature[0];
//     const signBytes = fs.readFileSync(signPath);

//     let embeddedSignature;
//     if (
//       signFile.mimetype === "image/jpeg" ||
//       signFile.filename.endsWith(".jpg")
//     ) {
//       embeddedSignature = await pdfDoc.embedJpg(signBytes);
//     } else {
//       embeddedSignature = await pdfDoc.embedPng(signBytes);
//     }

//     // 2. Get User Inputs
//     const pageNumber = Number(req.body.page) || 1;
//     // Default to bottom-left if no coordinates provided, but usually UI sends Top-Left
//     const uiX = Number(req.body.x) || 50;
//     const uiY = Number(req.body.y) || 50; // Distance from TOP
//     const scale = Number(req.body.scale) || 1.0;

//     // 3. Prepare Page
//     const pages = pdfDoc.getPages();
//     const page = pages[pageNumber - 1];
//     const { height: pageHeight } = page.getSize();

//     // 4. Scale Image
//     const { width: imgWidth, height: imgHeight } =
//       embeddedSignature.scale(scale);

//     // 5. 🟢 CRITICAL MATH FIX: Convert "Top-Left" (UI) to "Bottom-Left" (PDF)
//     // Formula: PageHeight - DistanceFromTop - ImageHeight
//     let pdfY = pageHeight - uiY - imgHeight;

//     console.log(
//       `Debug: Page H=${pageHeight}, UI Y=${uiY}, Img H=${imgHeight} -> PDF Y=${pdfY}`
//     );

//     // 6. Safety Check: If signature falls off the bottom, shift it up
//     if (pdfY < 0) {
//       console.warn(
//         "⚠️ Signature is too large or too low! Snapping to bottom margin."
//       );
//       pdfY = 10; // 10 units from bottom
//     }

//     // 7. Draw
//     page.drawImage(embeddedSignature, {
//       x: uiX,
//       y: pdfY,
//       width: imgWidth,
//       height: imgHeight,
//     });

//     // 8. Save
//     const outputFileName = `signed-${Date.now()}.pdf`;
//     const outputPath = path.join(uploadsDir, outputFileName);
//     fs.writeFileSync(outputPath, await pdfDoc.save());

//     // Cleanup
//     try {
//       fs.unlinkSync(pdfPath);
//       fs.unlinkSync(signPath);
//     } catch (e) {}

//     res.json({
//       success: true,
//       pdfPath: `/uploads/converter/${outputFileName}`,
//     });
//   } catch (err) {
//     console.error("Sign PDF error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// router.post("/sign-pdf", uploadFields, async (req, res) => {
//   try {
//     const pdfFile = req.files?.file?.[0];
//     const uploadedSignatures = req.files?.signature || [];

//     if (!pdfFile) {
//       return res.status(400).json({
//         success: false,
//         error: "PDF file is required",
//       });
//     }

//     const inputPath = path.join(uploadsDir, pdfFile.filename);
//     const pdfDoc = await PDFDocument.load(fs.readFileSync(inputPath));
//     const pages = pdfDoc.getPages();

//     // Determine mode: URL-based or file-based
//     let signaturePayload = [];

//     if (req.body.signatures) {
//       // NEW MODE → JSON with URLs
//       try {
//         signaturePayload = JSON.parse(req.body.signatures);
//       } catch (err) {
//         return res.status(400).json({
//           success: false,
//           error: "Invalid JSON format for signatures",
//         });
//       }
//     } else {
//       // OLD MODE → Files + individual fields
//       const toArray = (v) => (Array.isArray(v) ? v : [v]);

//       const pagesArr = toArray(req.body.page);
//       const xArr = toArray(req.body.x);
//       const yArr = toArray(req.body.y);
//       const scaleArr = toArray(req.body.scale);

//       uploadedSignatures.forEach((file, idx) => {
//         signaturePayload.push({
//           page: Number(pagesArr[idx] || 1),
//           x: Number(xArr[idx] || 50),
//           y: Number(yArr[idx] || 50),
//           scale: Number(scaleArr[idx] || 1),
//           fileObj: file // store file reference
//         });
//       });
//     }

//     // Process signatures
//     for (const sig of signaturePayload) {
//       const pageIndex = (sig.page || 1) - 1;
//       const x = sig.x || 0;
//       const y = sig.y || 0;
//       const scale = sig.scale || 1;

//       // Load image (either from URL or uploaded file)
//       let imgBytes;

//       if (sig.signatureUrl) {
//         // URL mode
//         const response = await axios.get(sig.signatureUrl, { responseType: "arraybuffer" });
//         imgBytes = Buffer.from(response.data);
//       } else if (sig.fileObj) {
//         // File upload mode
//         const filePath = path.join(uploadsDir, sig.fileObj.filename);
//         imgBytes = fs.readFileSync(filePath);
//         fs.unlinkSync(filePath); // delete upload
//       } else {
//         continue; // skip invalid entry
//       }

//       // Embed image
//       let embeddedImg;
//       if ((sig.signatureUrl || "").endsWith(".jpg") || (sig.signatureUrl || "").endsWith(".jpeg")) {
//         embeddedImg = await pdfDoc.embedJpg(imgBytes);
//       } else {
//         embeddedImg = await pdfDoc.embedPng(imgBytes);
//       }

//       const page = pages[pageIndex];
//       const { height: pageHeight } = page.getSize();

//       const scaled = embeddedImg.scale(scale);
//       const pdfY = pageHeight - y - scaled.height;

//       page.drawImage(embeddedImg, {
//         x,
//         y: pdfY,
//         width: scaled.width,
//         height: scaled.height,
//       });
//     }

//     const outputName = `signed-${Date.now()}.pdf`;
//     const outputPath = path.join(uploadsDir, outputName);

//     fs.writeFileSync(outputPath, await pdfDoc.save());
//     fs.unlinkSync(inputPath);

//     res.json({
//       success: true,
//       message: "PDF signed successfully",
//       pdfPath: `/uploads/converter/${outputName}`,
//     });

//   } catch (err) {
//     console.error("SIGN PDF ERROR:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

router.post("/sign-pdf", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "PDF file is required",
      });
    }

    const inputPath = path.join(uploadsDir, req.file.filename);
    const pdfDoc = await PDFDocument.load(fs.readFileSync(inputPath));
    const pages = pdfDoc.getPages();

    // Expecting JSON array in req.body.signatures
    if (!req.body.signatures) {
      return res.status(400).json({
        success: false,
        error: "Signatures payload missing",
      });
    }

    let signatures;
    try {
      signatures = JSON.parse(req.body.signatures);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON format for signatures",
      });
    }

    for (const sig of signatures) {
      // 🟢 CHANGED: Destructure box dimensions
      const {
        page,
        x,
        y,
        signatureUrl,
        viewportWidth,
        viewportHeight,
        boxWidth,
        boxHeight,
      } = sig;

      if (!signatureUrl) {
        return res
          .status(400)
          .json({ success: false, error: "signatureUrl is missing" });
      }

      const response = await axios.get(signatureUrl, {
        responseType: "arraybuffer",
      });
      const imgBytes = Buffer.from(response.data);

      let embeddedImg;
      if (signatureUrl.endsWith(".jpg") || signatureUrl.endsWith(".jpeg")) {
        embeddedImg = await pdfDoc.embedJpg(imgBytes);
      } else {
        embeddedImg = await pdfDoc.embedPng(imgBytes);
      }

      const targetPage = pages[(page || 1) - 1];
      const { width: pdfPageWidth, height: pdfPageHeight } =
        targetPage.getSize();

      // 1. Calculate Scale Ratio (Viewer Pixels -> PDF Points)
      const vWidth = viewportWidth || pdfPageWidth;
      const vHeight = viewportHeight || pdfPageHeight;
      const scaleX = pdfPageWidth / vWidth;
      const scaleY = pdfPageHeight / vHeight;

      // 2. Calculate Target Box Size on PDF (Converted from Frontend Pixels)
      // Default to arbitrary scale if box dimensions are missing
      const targetBoxW = boxWidth ? boxWidth * scaleX : embeddedImg.width * 0.2;
      const targetBoxH = boxHeight
        ? boxHeight * scaleY
        : embeddedImg.height * 0.2;

      // 3. Calculate "BoxFit.contain" logic
      // We scale the image to fit within the target box while maintaining aspect ratio
      const widthRatio = targetBoxW / embeddedImg.width;
      const heightRatio = targetBoxH / embeddedImg.height;
      const scaleFactor = Math.min(widthRatio, heightRatio);

      const finalW = embeddedImg.width * scaleFactor;
      const finalH = embeddedImg.height * scaleFactor;

      // 4. Calculate Coordinates
      // X is simple scaling
      const finalX = x * scaleX;

      // Y needs to be flipped (Top-Left origin -> Bottom-Left origin)
      // We calculate the top position in PDF points, then subtract image height
      const yInPdfPointsFromTop = y * scaleY;
      const finalY = pdfPageHeight - yInPdfPointsFromTop - finalH;

      targetPage.drawImage(embeddedImg, {
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH,
      });
    }
    const outputName = `signed-${Date.now()}.pdf`;
    const outputPath = path.join(uploadsDir, outputName);

    fs.writeFileSync(outputPath, await pdfDoc.save());
    fs.unlinkSync(inputPath);

    res.json({
      success: true,
      message: "PDF signed successfully",
      pdfPath: `/uploads/converter/${outputName}`,
    });
  } catch (err) {
    console.error("SIGN PDF ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post(
  "/compress-pdf",
  protect,
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      const level = req.body.level || "medium"; // Default to medium

      if (!file) {
        return res
          .status(400)
          .json({ success: false, error: "No PDF uploaded" });
      }

      const inputPath = path.join(uploadsDir, file.filename);
      const outputFileName = `${Date.now()}-compressed.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);

      // Original Size
      const originalSize = fs.statSync(inputPath).size;

      // -----------------------
      // Compression Settings
      // -----------------------

      let compressionParams = { File: inputPath };

      switch (level) {
        // 🔥 HIGH COMPRESSION (smallest size)
        case "high":
          compressionParams = {
            ...compressionParams,
            ImageQuality: "25", // very low
            ImageResolution: "72",
            ImageCompression: "jpg",
            RemoveBookmarks: "true",
            RemoveForms: "true",
            RemoveAnnotations: "true",
            RemoveMetadata: "true",
          };
          break;

        // ⭐ MEDIUM COMPRESSION (balanced)
        case "medium":
        default:
          compressionParams = {
            ...compressionParams,
            ImageQuality: "60",
            ImageResolution: "150",
            ImageCompression: "jpg",
            RemoveBookmarks: "true",
          };
          break;

        // ✔ LOW COMPRESSION (best quality)
        case "low":
          compressionParams = {
            ...compressionParams,
            ImageQuality: "85",
            ImageResolution: "300",
            ImageCompression: "jpg",
          };
          break;
      }

      // -----------------------
      // ConvertAPI Compression
      // -----------------------
      const result = await convertapi.convert(
        "compress",
        compressionParams,
        "pdf",
      );
      await result.saveFiles(outputPath);

      // Compressed Size
      const compressedSize = fs.statSync(outputPath).size;

      // Size Reduction
      const diff = originalSize - compressedSize;
      const percentage =
        diff > 0 ? ((diff / originalSize) * 100).toFixed(2) : "0.00";

      // Format Size (Readable)
      const formatSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
      };

      // Remove input file
      fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: `PDF compressed successfully (${level} mode)`,
        pdfPath: `/uploads/converter/${outputFileName}`,
        stats: {
          originalSize: formatSize(originalSize),
          compressedSize: formatSize(compressedSize),
          reduction: `${percentage}%`,
        },
      });
    } catch (err) {
      console.error("PDF Compression error:", err);
      res.status(500).json({
        success: false,
        error: "PDF compression failed.",
      });
    }
  },
);

router.post(
  "/pdf-to-ppt",
  protect,
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;

      if (!file)
        return res.status(400).json({
          success: false,
          error: "No PDF file uploaded.",
        });

      const inputPath = path.join(uploadsDir, file.filename);

      // Output filename and folder
      const outputFileName = `${Date.now()}-presentation.pptx`;
      const outputFolder = uploadsDir; // folder only (important!)
      const outputPath = path.join(outputFolder, outputFileName);

      // ---- Convert PDF ➝ PPTX using ConvertAPI ----
      const result = await convertapi.convert(
        "pptx",
        { File: inputPath },
        "pdf",
      );

      // Save output file to folder (NOT file path)
      const savedFiles = await result.saveFiles(outputFolder);

      // savedFiles[0] contains the real exported file path
      const finalOutput = savedFiles[0];

      // Rename ConvertAPI output to your file name
      fs.renameSync(finalOutput, outputPath);

      // Cleanup: remove uploaded PDF
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      return res.json({
        success: true,
        message: "PDF converted to PowerPoint successfully",
        pptPath: `/uploads/converter/${outputFileName}`,
      });
    } catch (err) {
      console.error("PDF to PPT conversion error:", err);
      res.status(500).json({
        success: false,
        error: "Conversion failed.",
      });
    }
  },
);

// ==========================================
// 10. Excel to PDF (ConvertAPI)
// ==========================================
router.post(
  "/excel-to-pdf",
  protect,
  upload.single("file"),
  validateFileType(["xlsx", "xls"]), // Ensure 'xls' is handled if your validator allows it
  async (req, res) => {
    try {
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No Excel file uploaded." });

      const inputPath = path.join(uploadsDir, file.filename);
      const outputFileName = `${Date.now()}-spreadsheet.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);

      // Convert Excel (xlsx/xls) to PDF
      const result = await convertapi.convert(
        "pdf",
        { File: inputPath },
        "xlsx", // ConvertAPI often auto-detects, but defining format is safer
      );

      await result.saveFiles(outputPath);
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: "Excel converted to PDF successfully",
        pdfPath: `/uploads/converter/${outputFileName}`,
      });
    } catch (err) {
      console.error("Excel to PDF conversion error:", err);
      res.status(500).json({ success: false, error: "Conversion failed." });
    }
  },
);

// ==========================================
// 11. Rotate PDF (pdf-lib)
// ==========================================
router.post(
  "/rotate-pdf",
  protect,
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      const rotationAngle = Number(req.body.angle) || 0; // Expected: 90, 180, 270, -90

      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No PDF file uploaded." });

      // Import degrees helper specifically for this route
      const { degrees } = require("pdf-lib");

      const inputPath = path.join(uploadsDir, file.filename);
      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // Apply rotation to all pages
      pages.forEach((page) => {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotationAngle));
      });

      const outputFileName = `${Date.now()}-rotated.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);

      const savedBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, savedBytes);

      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: `PDF rotated by ${rotationAngle} degrees`,
        pdfPath: `/uploads/converter/${outputFileName}`,
      });
    } catch (err) {
      console.error("Rotate PDF error:", err);
      res.status(500).json({ success: false, error: "Rotation failed." });
    }
  },
);

// ==========================================
// 12. Organize PDF (Reorder/Delete Pages)
// ==========================================
// router.post(
//   "/organize-pdf",
//   upload.single("file"),
//   validateFileType(["pdf"]),
//   async (req, res) => {
//     try {
//       const file = req.file;
//       // Expects comma-separated string of page numbers, e.g., "1,3,2" or "1,2" (to delete page 3)
//       const pageOrder = req.body.pages;

//       if (!file)
//         return res.status(400).json({ success: false, error: "No PDF file uploaded." });

//       if (!pageOrder)
//         return res.status(400).json({ success: false, error: "Page order is required (e.g., '1,3,2')." });

//       const inputPath = path.join(uploadsDir, file.filename);
//       const pdfBytes = fs.readFileSync(inputPath);

//       // Load source PDF
//       const srcPdf = await PDFDocument.load(pdfBytes);
//       const totalPages = srcPdf.getPageCount();

//       // Parse user input into 0-based indices
//       const indices = pageOrder.split(",")
//         .map(p => Number(p.trim()) - 1)
//         .filter(idx => idx >= 0 && idx < totalPages); // Filter invalid pages

//       if (indices.length === 0) {
//         return res.status(400).json({ success: false, error: "Invalid page selection." });
//       }

//       // Create new PDF
//       const newPdf = await PDFDocument.create();

//       // Copy pages from source to new PDF in the specified order
//       const copiedPages = await newPdf.copyPages(srcPdf, indices);
//       copiedPages.forEach((page) => newPdf.addPage(page));

//       const outputFileName = `${Date.now()}-organized.pdf`;
//       const outputPath = path.join(uploadsDir, outputFileName);

//       const savedBytes = await newPdf.save();
//       fs.writeFileSync(outputPath, savedBytes);

//       if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

//       res.json({
//         success: true,
//         message: "PDF organized successfully",
//         pdfPath: `/uploads/converter/${outputFileName}`,
//       });
//     } catch (err) {
//       console.error("Organize PDF error:", err);
//       res.status(500).json({ success: false, error: "Organizing failed." });
//     }
//   }
// );

// ==========================================
// 12. Organize PDF (Reorder, Delete, Rotate)
// ==========================================
router.post(
  "/organize-pdf",
  protect,
  upload.single("file"),
  validateFileType(["pdf"]),
  async (req, res) => {
    try {
      const file = req.file;
      const { pageData } = req.body;
      // Expects JSON string: [ { "originalPage": 1, "rotation": 90 }, { "originalPage": 3, "rotation": 0 } ]

      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No PDF file uploaded." });
      if (!pageData)
        return res
          .status(400)
          .json({ success: false, error: "Page configuration is required." });

      let pagesConfig;
      try {
        pagesConfig = JSON.parse(pageData);
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid JSON format for pageData." });
      }

      const inputPath = path.join(uploadsDir, file.filename);
      const pdfBytes = fs.readFileSync(inputPath);

      // Load source PDF
      const srcPdf = await PDFDocument.load(pdfBytes);
      const totalPages = srcPdf.getPageCount();

      // Create new PDF
      const newPdf = await PDFDocument.create();
      const { degrees } = require("pdf-lib");

      for (const item of pagesConfig) {
        // Frontend sends 1-based index, convert to 0-based for pdf-lib
        const pageIdx = Number(item.originalPage) - 1;
        const rotationToAdd = Number(item.rotation) || 0;

        if (pageIdx >= 0 && pageIdx < totalPages) {
          // Copy the page
          const [copiedPage] = await newPdf.copyPages(srcPdf, [pageIdx]);

          // Apply Rotation (Add to existing rotation)
          const currentRotation = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees(currentRotation + rotationToAdd));

          newPdf.addPage(copiedPage);
        }
      }

      const outputFileName = `${Date.now()}-organized.pdf`;
      const outputPath = path.join(uploadsDir, outputFileName);

      const savedBytes = await newPdf.save();
      fs.writeFileSync(outputPath, savedBytes);

      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      res.json({
        success: true,
        message: "PDF organized successfully",
        pdfPath: `/uploads/converter/${outputFileName}`,
      });
    } catch (err) {
      console.error("Organize PDF error:", err);
      res.status(500).json({ success: false, error: "Organizing failed." });
    }
  },
);

router.post(
  "/heic-to-jpg",
  protect,
  upload.single("file"),
  validateFileType(["heic"]),
  (req, res) => convertImageApi(req, res, "jpg"),
);

router.post(
  "/heic-to-png",
  protect,
  upload.single("file"),
  validateFileType(["heic"]),
  (req, res) => convertImageApi(req, res, "png"),
);

router.post(
  "/heic-to-webp",
  protect,
  upload.single("file"),
  validateFileType(["heic"]),
  (req, res) => convertImageApi(req, res, "webp"),
);

module.exports = router;
