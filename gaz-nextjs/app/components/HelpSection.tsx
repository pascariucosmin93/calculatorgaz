"use client";

import { memo } from "react";
import { styles } from "../styles";

function HelpSectionComponent() {
  return (
    <section style={styles.helpBox}>
      <h2 style={styles.sectionTitle}>Cum reproducem factura</h2>
      <p style={styles.helpText}>
        Completează tarifele exact ca în tabelul de pe factură (lei/MWh, fără TVA). Valorile
        implicite sunt cele din exemplul tău: PCS 10.548 kWh/mc, gaz 171.44, transport 13.8,
        distribuție 70.96, plafonare OUG 26/25 -20.54, plafonare OUG 6/25 -0.063, TVA 21%.
      </p>
      <ol style={styles.helpList}>
        <li>Introdu citirea anterioară, PCS și tarifele pe MWh din factura curentă.</li>
        <li>Lasă compensațiile cu semn minus dacă apar în factură (plafonări OUG).</li>
        <li>Apasă „Trimite” pentru a vedea costul pe kWh/m³ și totalul cu TVA identic facturii.</li>
      </ol>
    </section>
  );
}

export const HelpSection = memo(HelpSectionComponent);
