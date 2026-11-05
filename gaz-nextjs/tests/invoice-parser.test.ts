import { describe, expect, it } from "vitest";
import { extractInvoiceDetails, extractInvoiceTariffProfile } from "@/lib/invoices/parser";

const eonDuoGasSection = `
Furnizor E.ON Energie România S.A. București
Detalii gaze naturale
Adresă loc consum Str. BAZEI 2.1.A, T.64,corp C2, 20, Valea Adanca(IS)
Cod punct de măsură (CLC) DEG3455470
Serie contor
00838754/2013 05.08.2026 - 02.09.2026 17.230,0000 17.244,0000 14,000 10,845 151,830 C.1.1 75,0
Pret gaze naturale 05.08.2026-02.09.2026 151,830 kWh 0,19500
Cost transport 05.08.2026-02.09.2026 151,830 kWh 0,01380
Tarif distributie 05.08.2026-02.09.2026 151,830 kWh 0,06459
TVA (21%) 6,93
`;

describe("E.ON Duo invoice parser", () => {
  it("uses the gas section instead of the supplier address", () => {
    const profile = extractInvoiceTariffProfile(eonDuoGasSection, "auto");
    expect(profile.city).toBe("iasi");
    expect(profile.gasPriceMwh).toBeCloseTo(195, 6);
    expect(profile.transportPriceMwh).toBeCloseTo(13.8, 6);
    expect(profile.distributionPriceMwh).toBeCloseTo(64.59, 6);
    expect(extractInvoiceDetails(eonDuoGasSection).address).toContain("Valea Adanca(IS)");
    expect(extractInvoiceDetails(eonDuoGasSection).meterSerial).toBe("00838754/2013");
  });

  it("does not interpret unrelated PDF text as gas tariffs", () => {
    const profile = extractInvoiceTariffProfile("Factura de electricitate București", "auto");

    expect(profile).toMatchObject({ city: "bucuresti", gasPriceMwh: 171.44 });
  });
});
