# Calculator cost gaz

Aplicație Next.js care calculează consumul și costul la gaz pe baza citirilor de pe contor și a tarifelor din contract.

## Caracteristici
- încărcare a două poze cu contorul (luna trecută și luna curentă) și extragerea automată a cifrelor cu OCR (Tesseract)
- calcul automat m³ → kWh și tarif per kWh bazat pe ofertele E.ON (configurabil)
- formă manuală pentru reglaje fine: preț pe kWh, factor conversie, abonament, TVA
- salvarea ultimei citiri și a tarifelor în `localStorage` pentru următoarea sesiune
- rezumat cu cost variabil, abonament, TVA și preț efectiv per m³

## Rulare locală
1. Instalează dependențele:
   ```bash
   npm install
   ```
2. Configurează conexiunea la Postgres în `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/gaz"
   ```
3. Rulează migrațiile Prisma (prima dată poți folosi `db push` pentru a crea schema):
   ```bash
   npx prisma db push
   ```
   sau, pentru migrații versionate:
   ```bash
   npx prisma migrate dev --name init
   ```
   **Notă:** după fiecare actualizare a schemei (ex: adăugarea coloanei `email` pentru utilizatori) rulează din nou `npx prisma migrate deploy` sau `npx prisma migrate dev` pentru a aplica noile migrații; altfel API-urile precum `/api/auth/signup` vor returna eroare 500.
4. Pornește aplicația în modul dezvoltare:
   ```bash
   npm run dev
   ```
   Apoi deschide `http://localhost:3000`.
5. Pentru producție locală:
   ```bash
   npm run build
   npm start
   ```

## Rulare cu Docker
1. Creează imaginea:
   ```bash
   docker build -t gaz-calculator .
   ```
2. Rulează containerul (ai nevoie de un Postgres accesibil și variabila `DATABASE_URL`):
   ```bash
   docker run --rm -p 3000:3000 \
     -e DATABASE_URL="postgresql://user:password@host:5432/gaz" \
      gaz-calculator
   ```
   La pornire, containerul rulează `prisma migrate deploy`, astfel încât tabela `Reading` este creată automat dacă nu există.
3. Aplicația este disponibilă la `http://localhost:3000`.

## Rulare cu Docker Compose
1. Pornește atât aplicația, cât și Postgres + Nginx:
   ```bash
   docker compose up --build
   ```
   Contul implicit definit în `docker-compose.yml` este `gaz:gazpass` pentru baza `gaz`. Modifică variabilele dacă este necesar.
2. Accesează aplicația prin Nginx: `http://localhost:8080/` (sau IP-ul hostului pe portul 8080).
3. Datele Postgres sunt păstrate într-un volum denumit `gaz-db-data`.

## Structură
- `app/page.tsx` – interfața principală, logica OCR și calculatorul de cost
- `app/api/ocr/route.ts` – endpoint care rulează Tesseract pe imaginile trimise
- `app/layout.tsx` și `app/globals.css` – layout-ul Next.js și stilurile globale
- `Dockerfile` / `.dockerignore` – rulare containerizată
