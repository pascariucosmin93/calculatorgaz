import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";
import { locationNotFound, readingScope, resolveLocation } from "@/lib/locations";
import prisma from "@/lib/prisma";

const pdfText = (value: string) => value.replace(/[^\x20-\x7E]/g, "?").replace(/[\\()]/g, "\\$&");

function createPdf(lines: string[]): Buffer {
  const content = ["BT", "/F1 10 Tf", "50 790 Td", ...lines.flatMap((line, index) => [
    index ? "0 -16 Td" : "",
    `(${pdfText(line)}) Tj`
  ]), "ET"].filter(Boolean).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, "ascii");
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

export async function GET(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const requestedUser = request.nextUrl.searchParams.get("userId")?.trim();
  if (requestedUser && requestedUser !== session.id) {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }
  const location = await resolveLocation(session.id, request.nextUrl.searchParams.get("locationId"));
  if (!location) return locationNotFound();
  const readings = await prisma.reading.findMany({ where: readingScope(location), orderBy: [{ readingAt: "asc" }, { createdAt: "asc" }] });
  const lines = ["Istoric consum gaze", `Cont: ${session.username}`, `Locatie: ${location.name.normalize("NFD").replace(/[^\x20-\x7E]/g, "")}`, ""];
  readings.forEach((entry) => lines.push(
    `${new Date(entry.readingAt).toLocaleDateString("ro-RO")} | ${entry.consumptionM3.toFixed(2)} m3 | ${entry.consumptionKwh.toFixed(0)} kWh | ${entry.total.toFixed(2)} lei`
  ));
  return new NextResponse(createPdf(lines), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="istoric-consum-gaz.pdf"'
    }
  });
}
