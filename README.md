# CORLEONE CITY - IMPERIO

Verwaltungsoberfläche für eine GTA-RP-Familie. Die gesamte Pflege erfolgt direkt über die Website. Es gibt keinen Discord-Bot, keine Discord-Anmeldung und keine Discord-Synchronisierung. Angemeldete Familienmitglieder sehen denselben Datenbestand.

## Lokal starten

Voraussetzung ist Node.js 20 oder neuer.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Trage in `.env.local` die Project URL und den anon/public key deines Supabase-Projekts ein. Diese Werte verbinden den Browser mit Supabase; niemals den `service_role`-Key in die Website oder GitHub Pages eintragen.

`npm run build` erstellt eine lokale, unverschlüsselte Build-Version. `npm run preview` startet den Build lokal zur Ansicht.

## Supabase einrichten

1. Ein kostenloses Supabase-Projekt erstellen.
2. Den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einmalig im SQL Editor ausführen. Die Tabelle enthält eine gemeinsame versionierte JSON-Zeile; Row-Level Security erlaubt Lesen und Schreiben nur angemeldeten Benutzern.
3. Unter **Authentication > Users** für jedes Familienmitglied einen Benutzer anlegen. Als interne E-Mail-Adresse exakt `discord-DISCORDID@imperio.invalid` verwenden, wobei `DISCORDID` durch die 17- bis 20-stellige Discord-ID ersetzt wird (zum Beispiel `discord-12345678901234567@imperio.invalid`). Ein Passwort setzen und **Auto Confirm User / Benutzer automatisch bestätigen** aktivieren. Diese technische Alias-Adresse ist nicht zustellbar; ohne automatische Bestätigung kann der Nutzer keine Bestätigungs-E-Mail erhalten.
4. Project URL und anon/public key aus **Project Settings > API** lokal in `.env.local` eintragen. Das sind öffentliche Client-Konfigurationswerte; die RLS-Regeln schützen die Tabelle. Der geheime `service_role`-Key wird nicht benötigt.

Supabase Free unterliegt aktuellen Quoten und Inaktivitätsregeln des Anbieters; ein kostenloser Tarif ist keine Verfügbarkeitsgarantie. Benutzer mit gültigem Imperio-Konto haben gemeinsamen Lese-/Schreibzugriff auf die Familiendaten. Die Rollenmatrix der App beschränkt weiterhin nur die Oberfläche, nicht die Datenbankaktionen.

Auf der Website melden sich Nutzer ausschließlich mit ihrer Discord-ID und ihrem Passwort an. Die App übersetzt die ID intern in die Alias-Adresse `discord-DISCORDID@imperio.invalid`, weil Supabase Password Auth intern eine E-Mail-Kennung erwartet. Die ID verknüpft sich nicht mit Discord und beweist nicht automatisch die Identität des Nutzers.

## GitHub Pages

1. Repository in GitHub anlegen und den Branch `main` verwenden.
2. Unter **Settings > Secrets and variables > Actions** ein Repository-Secret `IMPERIO_PASSWORD` mit einem langen, zufälligen gemeinsamen Passwort hinterlegen.
3. Repository-Secrets `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` hinterlegen.
4. Unter **Settings > Pages** als Quelle **GitHub Actions** wählen.
5. Den Inhalt dieses Projekts auf `main` pushen. Der Workflow baut eine einzelne HTML-Datei, verschlüsselt ihren App-Inhalt mit AES-GCM und veröffentlicht sie anschließend.

Vite verwendet relative Asset-Pfade. Navigation erfolgt über URL-Hashes, damit Neuladen und direkte Modulaufrufe auf GitHub Pages ohne Server-Rewrites funktionieren.

## Zugang und Sicherheitsgrenzen

Der Pages-Build verlangt das Secret `IMPERIO_PASSWORD`; das Passwort wird nicht in die App-Bundles geschrieben. Der Build verschlüsselt die gebündelte HTML-Anwendung mit Web-Crypto (PBKDF2 und AES-256-GCM). Beim lokalen Entwicklungsserver ist diese Veröffentlichungssperre nicht aktiv.

Das Seitenpasswort ist kein Ersatz für die Supabase-Anmeldung. Die Datenbankzugriffe werden durch Supabase Auth und Row-Level Security geschützt. Rollen in der App steuern weiterhin ausschließlich die Oberfläche. Der anon/public key darf im Frontend stehen; die Sicherheit hängt von den aktivierten RLS-Regeln ab. Veröffentliche niemals den `service_role`-Key.

Familiendaten werden nicht mitgebaut oder in GitHub Pages abgelegt. JSON-Exporte enthalten unverschlüsselte Daten und sollten geschützt aufbewahrt werden.

## Datenverwaltung

Änderungen werden automatisch in Supabase gespeichert und in angemeldeten Browsern live aktualisiert. Der Browser hält zusätzlich eine lokale Arbeitskopie. In **Einstellungen** lassen sich Daten als versioniertes JSON exportieren, importieren (vorher wird eine Sicherung angeboten) oder nach Bestätigung zurücksetzen. Beim ersten Verbinden kann vorhandener lokaler Datenbestand in die gemeinsame Datenbank übernommen werden.

Alle Abläufe werden manuell über die Imperio-Oberfläche ausgeführt. Teilnehmer und Rückmeldungen zu Terminen und Fußballmatches können direkt in den jeweiligen Formularen eingetragen werden. Die optionale Spielerkennung ist lediglich ein Textfeld und verbindet sich mit keinem externen Dienst.