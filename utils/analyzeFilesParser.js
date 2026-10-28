const path = require("path");
const xlsx = require("xlsx");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const WordExtractor = require("word-extractor");
const sharp = require("sharp");
const wordExtractor = new WordExtractor();

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".txt",
  ".md",
  ".xlsx",
  ".xls",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".json",
];

const REJECTED_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".vbs",
  ".js",
  ".py",
  ".php",
  ".jar",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
];

// Configurable Limits per MVP Specs
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_EXCEL_ROWS = 50000;
const MAX_EXCEL_SHEETS = 10;
const MAX_DOC_PAGES = 500;

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Inspect magic bytes / file signature to prevent renamed executable/archive attacks
 */
function inspectMagicBytes(buffer, ext) {
  if (!buffer || buffer.length < 4) return { safe: true };

  // Common dangerous signatures
  // Windows PE Executable (.exe, .dll, .scr): "MZ" (0x4D, 0x5A)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return {
      safe: false,
      error:
        "Unsafe file detected. Executable binaries are strictly prohibited.",
    };
  }

  // Linux ELF Executable: 0x7F, 'E', 'L', 'F'
  if (
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    return {
      safe: false,
      error:
        "Unsafe file detected. Binary executables are strictly prohibited.",
    };
  }

  // Java Archive / Class: 0xCA, 0xFE, 0xBA, 0xBE
  if (
    buffer[0] === 0xca &&
    buffer[1] === 0xfe &&
    buffer[2] === 0xba &&
    buffer[3] === 0xbe
  ) {
    return {
      safe: false,
      error: "Unsafe file detected. Java binaries are strictly prohibited.",
    };
  }

  // Archive signatures: RAR (Rar! = 0x52, 0x61, 0x72, 0x21), 7z (0x37, 0x7A, 0xBC, 0xAF), GZ (0x1F, 0x8B)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x61 &&
    buffer[2] === 0x72 &&
    buffer[3] === 0x21
  ) {
    return {
      safe: false,
      error:
        "Archive files (RAR) are not allowed. Please upload individual supported files.",
    };
  }
  if (
    buffer[0] === 0x37 &&
    buffer[1] === 0x7a &&
    buffer[2] === 0xbc &&
    buffer[3] === 0xaf
  ) {
    return {
      safe: false,
      error:
        "Archive files (7-Zip) are not allowed. Please upload individual supported files.",
    };
  }

  // Verify format signatures for expected types
  if (ext === ".pdf") {
    // PDF magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46)
    const isPdf = buffer.slice(0, 5).toString("ascii").startsWith("%PDF");
    if (!isPdf) {
      return {
        safe: false,
        error:
          "Invalid PDF file. The file content does not match standard PDF format.",
      };
    }
  } else if ([".jpg", ".jpeg"].includes(ext)) {
    // JPEG magic bytes: FF D8 FF
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      return {
        safe: false,
        error:
          "Invalid JPEG image. The file signature does not match image format.",
      };
    }
  } else if (ext === ".png") {
    // PNG magic bytes: 89 50 4E 47
    if (
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47
    ) {
      return {
        safe: false,
        error:
          "Invalid PNG image. The file signature does not match PNG format.",
      };
    }
  } else if ([".docx", ".xlsx"].includes(ext)) {
    // Office Open XML (PK zip structure): PK.. (0x50, 0x4B, 0x03, 0x04)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return {
        safe: false,
        error: `Invalid document structure for ${ext.toUpperCase()}. The file appears corrupted or altered.`,
      };
    }
  }

  return { safe: true };
}

/**
 * Validates file safety, extension, size, and real magic byte signatures
 */
function validateFile(file) {
  if (!file) {
    return { valid: false, error: "No file provided." };
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (REJECTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error:
        "Unsafe file format detected. Executables, scripts, and archive files are prohibited for security.",
    };
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File type "${ext}" is not supported. Please upload a PDF, Word doc, Excel, CSV, text, JSON, or image file.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `This file is too large to analyze. Maximum allowed size is 20MB (Uploaded: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  // Inspect real bytes
  const signatureCheck = inspectMagicBytes(file.buffer, ext);
  if (!signatureCheck.safe) {
    return {
      valid: false,
      error: signatureCheck.error,
    };
  }

  return { valid: true, ext };
}

/**
 * Parse Spreadsheets (XLSX, XLS, CSV)
 */
async function parseSpreadsheet(buffer, ext) {
  const formulaWarnings = [];
  try {
    // Read workbook safely without executing macros or formulas
    let workbook;
    try {
      workbook = xlsx.read(buffer, {
        type: "buffer",
        cellFormula: false,
        cellHTML: false,
        cellDates: true, // Automatically parse Excel date serials into real dates
        dateNF: "yyyy-mm-dd",
        raw: false, // Reads formatted/cached strings
        dense: true,
      });
    } catch (readErr) {
      const errMsg = (readErr.message || "").toLowerCase();
      if (
        errMsg.includes("password") ||
        errMsg.includes("encrypted") ||
        errMsg.includes("protected")
      ) {
        return {
          error:
            "We cannot read this protected file. Please upload an unlocked copy.",
        };
      }
      return {
        error:
          "We could not read content from this spreadsheet. It may be corrupted or unsupported.",
      };
    }

    const sheetNames = (workbook.SheetNames || []).slice(0, MAX_EXCEL_SHEETS);
    if (sheetNames.length === 0) {
      return {
        error: "The spreadsheet contains no readable worksheets.",
      };
    }

    if (workbook.SheetNames.length > MAX_EXCEL_SHEETS) {
      formulaWarnings.push(
        `Workbook contains ${workbook.SheetNames.length} sheets. Analyzing first ${MAX_EXCEL_SHEETS} sheets only.`,
      );
    }

    const primarySheetName = sheetNames[0];
    const primaryWorksheet = workbook.Sheets[primarySheetName];
    // Convert primary sheet to JSON array of objects
    const rawRows = xlsx.utils.sheet_to_json(primaryWorksheet, {
      defval: "",
      blankrows: false,
    });
    const totalRows = rawRows.length;
    const isComplete = totalRows <= MAX_EXCEL_ROWS;
    const rows = rawRows.slice(0, MAX_EXCEL_ROWS);
    if (!isComplete) {
      formulaWarnings.push(
        `Spreadsheet has ${totalRows} rows. Capped at first ${MAX_EXCEL_ROWS} rows for deterministic processing.`,
      );
    }
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const tabularPreview = rows.slice(0, 10); // First 10 rows for UI table
    // 🔥 FIX: Construct a rich, multi-sheet text representation so Thesys gets all worksheets data
    let textRepresentation = `Spreadsheet Worksheets (${sheetNames.length}): ${sheetNames.join(", ")}\n\n`;
    sheetNames.forEach((sName, sIdx) => {
      const sWs = workbook.Sheets[sName];
      if (!sWs) return;
      const sData = xlsx.utils.sheet_to_json(sWs, {
        defval: "",
        blankrows: false,
      });
      const sCols = sData.length > 0 ? Object.keys(sData[0]) : [];
      textRepresentation += `======================================================\n`;
      textRepresentation += `SHEET [${sIdx + 1}]: "${sName}"\n`;
      textRepresentation += `Total Rows: ${sData.length} | Columns (${sCols.length}): [${sCols.join(", ")}]\n`;
      textRepresentation += `------------------------------------------------------\n`;
      if (sData.length === 0) {
        textRepresentation += `(Sheet is empty)\n\n`;
        return;
      }
      textRepresentation += `Complete Sheet Data (${sData.length} rows):\n`;
      sData.forEach((r, rIdx) => {
        textRepresentation += `Row ${rIdx + 1}: ${JSON.stringify(r)}\n`;
      });

      textRepresentation += `\nColumn Structure for "${sName}":\n`;
      sCols.slice(0, 150).forEach((col) => {
        const sampleVals = sData
          .slice(0, 4)
          .map((r) => r[col])
          .filter((v) => v !== "" && v !== null);
        textRepresentation += `- "${col}": e.g., ${sampleVals.join(", ") || "(empty)"}\n`;
      });
      textRepresentation += `\n`;
    });

    return {
      fileType: ext === ".csv" ? "csv" : "xlsx",
      sheetNames,
      columns,
      rowCount: totalRows,
      columnCount: columns.length,
      tabularPreview,
      datasetCoverage: {
        totalRows,
        analyzedRows: rows.length,
        isComplete,
        limitReason: isComplete
          ? null
          : `Dataset exceeded limit of ${MAX_EXCEL_ROWS} rows.`,
      },
      formulaWarnings,
      extractedText: textRepresentation,
      canonicalContent: textRepresentation,
      rawTableData: rows, // Kept in memory/doc for fast deterministic calculations
    };
  } catch (err) {
    return {
      error: "Failed to read spreadsheet file: " + err.message,
    };
  }
}

/**
 * Parse Word Documents (DOCX, DOC)
 */
async function parseWord(buffer, ext) {
  try {
    let extractedText = "";
    if (ext === ".docx") {
      const docxResult = await mammoth.extractRawText({ buffer });
      if (docxResult && docxResult.value) {
        extractedText = docxResult.value.trim();
      }
    } else if (ext === ".doc") {
      const extractedDoc = await wordExtractor.extract(buffer);
      const docBody = extractedDoc.getBody();
      if (docBody && docBody.trim()) {
        extractedText = docBody.trim();
      }
    }

    if (!extractedText) {
      extractedText = "[Word document content could not be read or is empty]";
    }

    const words = extractedText.split(/\s+/).filter(Boolean).length;
    const pageCount = Math.max(1, Math.ceil(words / 400));

    if (pageCount > MAX_DOC_PAGES) {
      return {
        error: `Word document exceeds maximum limit of ${MAX_DOC_PAGES} pages (~${pageCount} estimated pages).`,
      };
    }

    return {
      fileType: ext.replace(".", ""),
      pageCount,
      wordCount: words,
      extractedText,
      canonicalContent: extractedText,
      tabularPreview: [],
    };
  } catch (err) {
    const errMsg = (err.message || "").toLowerCase();
    if (
      errMsg.includes("password") ||
      errMsg.includes("encrypted") ||
      errMsg.includes("protected")
    ) {
      return {
        error:
          "We cannot read this protected file. Please upload an unlocked copy.",
      };
    }
    return {
      error: "Failed to read Word document: " + err.message,
    };
  }
}

/**
 * Parse PDF Document
 */
async function parsePdf(buffer) {
  try {
    let extractedText = "";
    let pageCount = 1;

    try {
      const parsed = await pdfParse(buffer);
      pageCount = parsed.numpages || 1;
      if (parsed.text && parsed.text.trim()) {
        extractedText = parsed.text.trim();
      }
    } catch (parseErr) {
      if (parseErr.message && parseErr.message.includes("Password")) {
        return {
          error:
            "This PDF is password-protected. Please upload an unlocked copy.",
        };
      }
    }

    if (pageCount > MAX_DOC_PAGES) {
      return {
        error: `PDF exceeds maximum limit of ${MAX_DOC_PAGES} pages (Uploaded PDF has ${pageCount} pages).`,
      };
    }

    const words = extractedText
      ? extractedText.split(/\s+/).filter(Boolean).length
      : 0;

    return {
      fileType: "pdf",
      pageCount,
      wordCount: words,
      extractedText,
      canonicalContent: extractedText,
      tabularPreview: [],
    };
  } catch (err) {
    return {
      error: "Failed to parse PDF document: " + err.message,
    };
  }
}

/**
 * Parse Images (JPG, PNG, WEBP)
 */
async function parseImage(buffer, ext) {
  try {
    const metadata = await sharp(buffer).metadata();
    const compressed = await sharp(buffer)
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const dataUri = "data:image/jpeg;base64," + compressed.toString("base64");
    const imageDesc = `[Image File: ${metadata.format.toUpperCase()} ${metadata.width}x${metadata.height}px]`;

    return {
      fileType: "image",
      extractedText: imageDesc,
      canonicalContent: imageDesc,
      visualImageUrls: [dataUri],
      pageCount: 1,
      tabularPreview: [],
    };
  } catch (err) {
    return {
      error: "Failed to process image file: " + err.message,
    };
  }
}

/**
 * Parse Text or JSON Files
 */
function parseTextOrJson(buffer, ext) {
  try {
    const rawText = buffer.toString("utf8").trim();
    if (ext === ".json") {
      try {
        const parsedJson = JSON.parse(rawText);
        let tabularPreview = [];
        let rawTableData = null;
        let columns = [];
        let rowCount = 0;

        if (Array.isArray(parsedJson)) {
          rowCount = parsedJson.length;
          tabularPreview = parsedJson.slice(0, 10);
          rawTableData = parsedJson.slice(0, MAX_EXCEL_ROWS);
          if (parsedJson.length > 0 && typeof parsedJson[0] === "object") {
            columns = Object.keys(parsedJson[0]);
          }
        }

        const previewText =
          `JSON Data (${rowCount ? `${rowCount} items` : "Object structure"}):\n` +
          JSON.stringify(
            Array.isArray(parsedJson) ? parsedJson.slice(0, 10) : parsedJson,
            null,
            2,
          );

        return {
          fileType: "json",
          extractedText: previewText,
          canonicalContent: previewText,
          tabularPreview,
          rawTableData,
          columns,
          rowCount,
        };
      } catch (jsonErr) {
        return { error: "Invalid JSON file structure: " + jsonErr.message };
      }
    }

    const words = rawText.split(/\s+/).filter(Boolean).length;
    const pageCount = Math.max(1, Math.ceil(words / 400));

    return {
      fileType: ext === ".md" ? "txt" : "txt",
      extractedText: rawText,
      canonicalContent: rawText,
      pageCount,
      wordCount: words,
      tabularPreview: [],
    };
  } catch (err) {
    return {
      error: "Failed to decode text file: " + err.message,
    };
  }
}

/**
 * Master File Parser Dispatcher
 */
async function parseUploadedFile(file) {
  const validation = validateFile(file);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const ext = validation.ext;
  const buffer = file.buffer;

  if ([".xlsx", ".xls", ".csv"].includes(ext)) {
    return await parseSpreadsheet(buffer, ext);
  } else if ([".docx", ".doc"].includes(ext)) {
    return await parseWord(buffer, ext);
  } else if (ext === ".pdf") {
    return await parsePdf(buffer);
  } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return await parseImage(buffer, ext);
  } else if ([".txt", ".md", ".json"].includes(ext)) {
    return parseTextOrJson(buffer, ext);
  }

  return { error: "Unsupported file extension: " + ext };
}

module.exports = {
  validateFile,
  parseUploadedFile,
  estimateTokens,
};
