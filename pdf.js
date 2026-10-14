// Lecture de PDF : pdf.js est chargé à la demande, uniquement quand on dépose un PDF.
// Il est hébergé avec le site (aucun appel vers un serveur tiers).

let loading = null;

// PDF.js (hébergé dans assets/vendor/pdfjs) est importé à la demande, une seule fois.
function ensurePdfJs() {
  if (!loading) {
    loading = import('./pdf.min.js').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.min.js', import.meta.url).href;
      return pdfjs;
    });
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

/** Texte d'un PDF, une ligne par ligne visuelle. */
export async function extractPdfText(file) {
  const pdfjs = await ensurePdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise;
  const allLines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const lineMap = new Map();
    content.items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push(item);
    });
    const ys = Array.from(lineMap.keys()).sort((a, b) => b - a);
    ys.forEach((y) => {
      const line = lineMap
        .get(y)
        .sort((a, b) => a.transform[4] - b.transform[4])
        .map((i) => i.str)
        .join(' ')
        .trim();
      if (line) allLines.push(line);
    });
  }
  return allLines.join('\n');
}
