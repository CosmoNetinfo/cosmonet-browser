# Sicurezza e segnalazioni

Non pubblicare credenziali, profili browser, archivi password, chiavi di firma o
report contenenti segreti. Le chiavi Android devono rimanere in una cartella
privata esterna alla repository e negli Actions Secrets, mai nei file versionati.

Gli avvisi GitGuardian del primo commit di preparazione sono in verifica: la
schermata ricevuta non contiene i percorsi delle tre singole segnalazioni e non
consente di dichiararle tutte risolte. Un controllo indipendente con Gitleaks su
43 commit ha individuato due digest SHA-256 di sorgenti pubblici Chromium nel
vecchio `upstream.lock.json`; i digest corrispondono ai file upstream verificati,
non sono credenziali. I loro soli fingerprint storici sono documentati in
`.gitleaksignore`, senza esclusioni generali di file o regole. Il formato del lock
ora distingue esplicitamente percorsi e campi `sha256`.

Sono stati rimossi i valori statici usati nei test di rifiuto delle credenziali:
i test generano dati temporanei casuali durante l'esecuzione. Lo script
amministrativo che accedeva al gestore credenziali Git non viene più distribuito
con il prodotto. Non sono state riscritte la cronologia pubblica o le segnalazioni
GitGuardian. Qualunque credenziale reale eventualmente confermata deve essere
revocata/ruotata prima di ripulire i riferimenti: cancellarla dal ramo corrente
non la rimuove dai commit precedenti.

Per una scansione ripetibile:

```sh
node tools/python.cjs tools/security-scan.py
```

Lo script usa Gitleaks ufficiale, ne verifica il checksum e scansiona tutta la
cronologia disponibile. I valori sono oscurati e il report resta in `.work/`,
esclusa da Git. La CI deve usare `fetch-depth: 0`. Un risultato senza rilevamenti
non dimostra sicurezza assoluta e non sostituisce la verifica dei singoli alert.
