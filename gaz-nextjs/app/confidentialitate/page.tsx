import Link from "next/link";

import { Footer } from "../components/Footer";

const CONTACT_EMAIL = "pascariucosmin93@gmail.com";

export const metadata = {
  title: "Politica de confidențialitate — CalculatorGaz"
};

export default function PrivacyPolicyPage() {
  return (
    <main className="app-page">
      <div className="app-content" style={{ maxWidth: 760 }}>
        <Link className="text-link" href="/">
          ← Înapoi
        </Link>
        <h1>Politica de confidențialitate</h1>
        <p>
          <em>Ultima actualizare: 23 septembrie 2026.</em>
        </p>

        <h2>Cine este operatorul de date</h2>
        <p>
          CalculatorGaz este un proiect personal, gratuit și fără scop
          comercial, dezvoltat și operat de Cosmin Pascariu, persoană fizică.
          Pentru orice întrebare legată de datele tale sau pentru a-ți
          exercita drepturile de mai jos, scrie la{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>Ce date colectăm</h2>
        <ul>
          <li>
            <strong>Date de cont:</strong> nume de utilizator, parolă
            (stocată criptat, niciodată în text clar), opțional email și
            adresă.
          </li>
          <li>
            <strong>Date de consum:</strong> citirile de index pe care le
            introduci manual, poza contorului dacă alegi să o atașezi,
            împreună cu calculele de cost rezultate.
          </li>
          <li>
            <strong>Facturi încărcate:</strong> fișierele PDF pe care le
            urci sunt stocate criptat la un furnizor de stocare cloud și sunt
            șterse automat după 365 de zile.
          </li>
          <li>
            <strong>Date tehnice minime:</strong> loguri de infrastructură
            (adresă IP, timestamp) folosite strict pentru depanare și
            prevenirea abuzurilor, păstrate pe termen scurt. Evenimentele de
            autentificare reușită/eșuată sunt înregistrate agregat, fără
            identificarea utilizatorului sau a adresei IP.
          </li>
        </ul>
        <p>
          Nu colectăm date din categorii speciale (sănătate, origine etnică
          etc.) și aplicația nu este destinată colectării intenționate de
          date de la minori.
        </p>

        <h2>Cookie-uri</h2>
        <p>
          Folosim exclusiv cookie-uri strict necesare funcționării
          aplicației — nu folosim cookie-uri de analiză, publicitate sau
          urmărire:
        </p>
        <ul>
          <li>
            <strong>gaz-session</strong> — menține sesiunea ta autentificată
            (24 de ore).
          </li>
          <li>
            <strong>gaz-csrf</strong> — protecție împotriva atacurilor
            cross-site (24 de ore).
          </li>
        </ul>

        <h2>Cui îi transmitem date</h2>
        <p>Nu vindem și nu închiriem datele tale către nimeni. Folosim câțiva furnizori tehnici, doar în măsura necesară funcționării serviciului:</p>
        <ul>
          <li>
            <strong>Furnizor de bază de date (Aiven)</strong> — găzduiește
            baza de date PostgreSQL folosită de aplicație.
          </li>
          <li>
            <strong>Cloudflare R2</strong> — stochează fișierele PDF ale
            facturilor și pozele de contor pe care le încarci.
          </li>
          <li>
            <strong>Discord</strong> — folosit doar în fluxul de resetare a
            parolei: dacă ceri resetarea parolei, un link de resetare
            (însoțit de numele de utilizator) este trimis printr-un canal
            intern Discord, către administratorul aplicației, care ți-l
            retransmite. Nu se trimit pe Discord alte date (citiri, facturi
            etc.).
          </li>
        </ul>

        <h2>Temeiul legal al prelucrării</h2>
        <p>
          Prelucrăm datele contului și ale citirilor pentru a-ți furniza
          serviciul pe care l-ai solicitat prin crearea contului (executarea
          unei relații la cererea ta). Datele tehnice minime sunt prelucrate
          în baza interesului legitim de a menține aplicația funcțională și
          în siguranță.
        </p>

        <h2>Cât timp păstrăm datele</h2>
        <p>
          Datele contului și citirile sunt păstrate cât timp contul tău este
          activ. Facturile PDF sunt șterse automat după 365 de zile. Poți
          cere oricând ștergerea contului — vezi mai jos.
        </p>

        <h2>Drepturile tale</h2>
        <p>
          Conform Regulamentului (UE) 2016/679 (GDPR), ai dreptul de acces,
          rectificare, ștergere, restricționare, portabilitate și opoziție
          cu privire la datele tale personale.
        </p>
        <ul>
          <li>
            <strong>Acces și rectificare:</strong> îți poți actualiza datele
            de profil direct din secțiunea „Contul meu”.
          </li>
          <li>
            <strong>Portabilitate:</strong> îți poți exporta istoricul de
            citiri (CSV/PDF) din secțiunea „Consum”/„Facturi”.
          </li>
          <li>
            <strong>Ștergerea contului:</strong> scrie la{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> cu cererea
            de ștergere. Contul și datele asociate vor fi șterse în cel mult
            30 de zile de la cerere.
          </li>
        </ul>
        <p>
          Dacă consideri că prelucrarea datelor tale încalcă legea, ai
          dreptul de a depune o plângere la Autoritatea Națională de
          Supraveghere a Prelucrării Datelor cu Caracter Personal (
          <a href="https://www.dataprotection.ro" target="_blank" rel="noreferrer">
            www.dataprotection.ro
          </a>
          ).
        </p>

        <h2>Securitate</h2>
        <p>
          Parolele sunt stocate criptat (bcrypt), sesiunile folosesc cookie-uri
          httpOnly/secure, iar accesul la rutele interne este protejat printr-o
          cheie separată. Aplicația limitează numărul de încercări pe rutele
          sensibile (autentificare, resetare parolă) pentru a preveni abuzul.
        </p>
        <Footer />
      </div>
    </main>
  );
}
