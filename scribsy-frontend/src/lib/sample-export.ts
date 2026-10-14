import type { SOAPNote } from "@/types";
import { SOAP_SECTIONS } from "./sample-visit";

export async function createSampleDocument(
  soap: SOAPNote,
  options: {
    title?: string;
    subtitle?: string;
    plainText?: string;
    loadFont?: (filename: string) => Promise<Uint8Array>;
  } = {},
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  await Promise.all(
    [
      ["plex-sans-regular", "PlexSans", "normal"],
      ["plex-sans-semibold", "PlexSans", "bold"],
      ["plex-mono", "PlexMono", "normal"],
    ].map(async ([file, family, weight]) => {
      const bytes = options.loadFont
        ? await options.loadFont(`${file}.ttf`)
        : await (async () => {
            const response = await fetch(`/fonts/${file}.ttf`);
            if (!response.ok)
              throw new Error("Sample export font unavailable.");
            return new Uint8Array(await response.arrayBuffer());
          })();
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 8192) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      }
      doc.addFileToVFS(`${file}.ttf`, binary);
      doc.addFont(`${file}.ttf`, family, weight);
    }),
  );
  const ink = "#0F1A24",
    muted = "#556270",
    blue = "#1D4ED8";
  let y = 152;
  const plain = (value: string) =>
    value
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/\u00a0/g, " ");
  const pageHeader = () => {
    doc.setFillColor("#F4F6F7");
    doc.rect(0, 0, 612, 100, "F");
    doc.setTextColor(ink);
    doc.setFont("PlexSans", "bold");
    doc.setFontSize(20);
    doc.text("Scribsy", 48, 43);
    doc.setFont("PlexMono", "normal");
    doc.setFontSize(10);
    doc.setTextColor(muted);
    doc.text("ILLUSTRATIVE SAMPLE / NOT REAL PATIENT DATA", 48, 67);
    doc.setDrawColor("#DCE1E5");
    doc.line(48, 115, 564, 115);
  };
  const newPage = () => {
    doc.addPage();
    pageHeader();
    y = 145;
  };
  pageHeader();
  doc.setTextColor(ink);
  doc.setFont("PlexSans", "bold");
  doc.setFontSize(17);
  doc.text(options.title || "Right ankle injury", 48, y);
  y += 18;
  doc.setFont("PlexSans", "normal");
  doc.setTextColor(muted);
  doc.setFontSize(10);
  doc.text(options.subtitle || "Reviewed sample SOAP note", 48, y);
  y += 35;
  const sections = options.plainText
    ? [{ letter: "", title: "Clinical notes", key: "subjective" as const }]
    : SOAP_SECTIONS;
  for (const section of sections) {
    if (y > 670) newPage();
    doc.setTextColor(blue);
    doc.setFont("PlexMono", "normal");
    doc.setFontSize(13);
    doc.text(section.letter, 48, y);
    doc.setTextColor(ink);
    doc.setFont("PlexSans", "bold");
    doc.setFontSize(12);
    doc.text(section.title, 78, y);
    y += 22;
    doc.setFont("PlexSans", "normal");
    doc.setFontSize(11);
    doc.setTextColor(ink);
    const lines = doc.splitTextToSize(
      plain(options.plainText || soap[section.key] || "Not documented."),
      486,
    ) as string[];
    for (const line of lines) {
      if (y > 720) {
        newPage();
        doc.setFont("PlexSans", "normal");
        doc.setFontSize(11);
        doc.setTextColor(ink);
      }
      doc.text(line, 78, y);
      y += 16;
    }
    y += 22;
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFont("PlexMono", "normal");
    doc.setFontSize(9);
    doc.setTextColor(muted);
    doc.text(`SCRIBSY SAMPLE / ${page} OF ${doc.getNumberOfPages()}`, 48, 762);
  }
  return doc;
}

export async function exportSamplePDF(soap: SOAPNote) {
  const doc = await createSampleDocument(soap);
  doc.save("scribsy-sample-visit.pdf");
}
