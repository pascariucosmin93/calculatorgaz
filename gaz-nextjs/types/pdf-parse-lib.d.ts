declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = {
    text: string;
    numpages: number;
  };

  const pdfParse: (data: Buffer) => Promise<PdfParseResult>;
  export default pdfParse;
}
