const fs = require("fs");
const pdfParse = require("pdf-parse");

// Extracts text page-by-page from a PDF buffer. pdf-parse's default render
// concatenates everything, so we hook into its per-page render callback to
// capture each page's text separately.
async function extractTextByPage(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pages = [];

  await pdfParse(dataBuffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      pages.push(pageText);
      return pageText;
    },
  });

  return pages; // array of strings, index 0 = page 1
}

module.exports = { extractTextByPage };