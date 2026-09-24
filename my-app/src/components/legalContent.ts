// Legal texts (GR + EN). These are TEMPLATES, not legal advice: fill in COMPANY
// and have a lawyer review them before launch (see todo.md).

export const COMPANY = {
  name: "[COMPANY LEGAL NAME]",
  brand: "RENDEZVOUS",
  address: "[STREET, CITY, POSTCODE], Greece",
  vat: "[ΑΦΜ]",
  taxOffice: "[ΔΟΥ]",
  gemi: "[ΓΕΜΗ No]",
  email: "[privacy@yourdomain.gr]",
  phone: "[PHONE]",
  updated: "2026-09-23",
};

export type LegalDoc = "privacy" | "terms" | "cookies" | "imprint";
type Section = { h: string; p: string[] };
type Doc = { title: string; sections: Section[] };

const C = COMPANY;

const en: Record<LegalDoc, Doc> = {
  privacy: {
    title: "Privacy policy",
    sections: [
      { h: "Who we are", p: [
        `${C.brand} is an online booking platform operated by ${C.name}, ${C.address} (VAT ${C.vat}). Contact for privacy matters: ${C.email}.`,
        "When you book with a business (salon, studio, etc.), that business is the data controller for your booking data and we process it on its behalf as a processor (GDPR art. 28). For business owner accounts, platform billing, security and analytics, we are the controller.",
      ]},
      { h: "What data we process", p: [
        "Account data: name, email, phone number and, if you sign in with Google, your Google profile name and email.",
        "Booking data: services, professional, date/time, notes, payment method and payment status. Card details are handled by Stripe and never reach us.",
        "Messages: booking confirmations, reminders and, only if you have not opted out, rebooking suggestions and review requests by email or SMS.",
        "Technical data: IP address and device/browser information in server logs; usage analytics only if you accept analytics cookies.",
      ]},
      { h: "Why and on what legal basis", p: [
        "To make and manage bookings and send confirmations/reminders: performance of a contract (art. 6(1)(b)).",
        "Rebooking suggestions and review requests to existing customers: legitimate interest / Law 3471/2006 art. 11(3). You can opt out at any time with one click from any such message.",
        "Security, fraud prevention and service logs: legitimate interest (art. 6(1)(f)).",
        "Error monitoring (Sentry): legitimate interest (art. 6(1)(f)) in keeping the app working. Crash reports contain technical data only (browser, page, error); emails and phone numbers are removed before sending, and no cookies are set.",
        "Invoicing and accounting of business subscriptions: legal obligation (art. 6(1)(c)).",
        "Analytics and support chat: your consent (art. 6(1)(a)), which you can withdraw from “Cookie settings”.",
      ]},
      { h: "Who receives the data", p: [
        "The business you book with. Our sub-processors: Supabase (database and authentication, EU region), Stripe (payments), Resend (email), GatewayAPI (SMS), Sentry (error monitoring, EU region), PostHog (analytics, EU, only with consent), Crisp (support chat, only with consent), Google (sign-in, only if you choose it).",
        "Some providers may transfer data outside the EEA; such transfers rely on the EU–US Data Privacy Framework or Standard Contractual Clauses.",
      ]},
      { h: "How long we keep it", p: [
        "Account data: while your account exists. Deleting your account removes your profile; bookings are anonymised because businesses must keep their records.",
        "Bookings: 5 years after the appointment (tax and accounting obligations), then anonymised.",
        "SMS delivery logs: 12 months. Server logs: as kept by our hosting providers (typically up to 90 days).",
      ]},
      { h: "Your rights", p: [
        "You have the right of access, rectification, erasure, restriction, portability and objection, and you can withdraw consent at any time. You can download your data and delete your account from “My account”, or write to us at the email above.",
        "For bookings, you can also contact the business directly; we will help it answer your request.",
        "You have the right to lodge a complaint with the Hellenic Data Protection Authority (ΑΠΔΠΧ), Kifisias 1-3, 11523 Athens, www.dpa.gr.",
      ]},
      { h: "Changes", p: [`Last updated: ${C.updated}. We will notify you of material changes.`] },
    ],
  },
  terms: {
    title: "Terms of service",
    sections: [
      { h: "The service", p: [
        `${C.brand} (${C.name}) provides software that lets businesses (“Businesses”) take online bookings from their customers (“Clients”). The contract for the booked service is between the Client and the Business; we are not a party to it.`,
      ]},
      { h: "For Clients", p: [
        "Provide accurate contact details. Cancel or reschedule through the links you receive if you cannot attend. Each Business sets its own prices, cancellation and payment rules.",
        "Card payments made at booking go directly to the Business’s Stripe account. Refunds and disputes are handled by the Business.",
      ]},
      { h: "For Businesses: subscription", p: [
        "Business accounts start with a 30-day free trial, then a monthly subscription billed through Stripe. You can cancel at any time from the Billing screen; access continues until the end of the paid period. If a payment fails, access continues for 7 days before the owner panel is locked. Your public booking page is never switched off for non-payment.",
        "Prices exclude VAT where applicable. Invoices are issued in accordance with Greek tax law.",
        "You are responsible for your own tax obligations towards your Clients (receipts, POS/myDATA connection, etc.).",
      ]},
      { h: "For Businesses: acceptable use", p: [
        "You must not use the service for unlawful purposes, send messages Clients did not agree to, or upload content you have no rights to. We may suspend accounts that breach these terms.",
      ]},
      { h: "Data processing agreement (GDPR art. 28)", p: [
        "For Client data, the Business is the controller and we are the processor. We process Client data only on the Business’s documented instructions (i.e. to provide the service), keep it confidential, apply appropriate security measures (encryption in transit, access control, row-level security per Business), and assist the Business with data subject requests and breach notifications.",
        "The Business authorises the sub-processors listed in the Privacy policy. We will give notice of new sub-processors, and the Business may object by terminating.",
        "We will notify the Business without undue delay after becoming aware of a personal data breach. At the end of the contract, we delete or return Client data unless the law requires us to keep it.",
      ]},
      { h: "Liability", p: [
        "The service is provided “as is”. To the extent permitted by law, our total liability to a Business is limited to the fees it paid in the previous 12 months. Nothing limits liability for intent or gross negligence, or Clients’ consumer rights.",
      ]},
      { h: "Law and disputes", p: [
        "Greek law applies. The courts of [CITY] have jurisdiction, without prejudice to consumers’ right to sue in their place of residence. Consumers may also turn to the Hellenic Consumer Ombudsman (www.synigoroskatanaloti.gr).",
        `Last updated: ${C.updated}.`,
      ]},
    ],
  },
  cookies: {
    title: "Cookie policy",
    sections: [
      { h: "What we store", p: [
        "Strictly necessary (no consent needed): Supabase login session (sb-auth-token), your cookie choice (cookieConsent), language (i18nextLng), theme (themeMode), booking progress, referral code (referralCode), and the app’s offline cache (service worker).",
        "Analytics (only with consent): PostHog (ph_* cookie/local storage), hosted in the EU, to understand how the app is used.",
        "Support chat (only with consent): Crisp (crisp-client/* cookies) to let you chat with us.",
        "Fonts are served from our own servers, so no third party sees your IP address when they load.",
        "The Google Maps embed on a business’s info page loads only when you press “Show map”.",
      ]},
      { h: "Your choice", p: [
        "Nothing optional loads until you choose. “Reject all” is as easy as “Accept all”. You can change or withdraw your choice at any time from “Cookie settings” at the bottom of the page.",
        `Last updated: ${C.updated}.`,
      ]},
    ],
  },
  imprint: {
    title: "Company details",
    sections: [
      { h: C.name, p: [
        `Brand: ${C.brand}`, `Address: ${C.address}`, `VAT (ΑΦΜ): ${C.vat} · Tax office (ΔΟΥ): ${C.taxOffice}`,
        `General Commercial Registry (ΓΕΜΗ): ${C.gemi}`, `Email: ${C.email} · Phone: ${C.phone}`,
      ]},
    ],
  },
};

const gr: Record<LegalDoc, Doc> = {
  privacy: {
    title: "Πολιτική απορρήτου",
    sections: [
      { h: "Ποιοι είμαστε", p: [
        `Το ${C.brand} είναι πλατφόρμα online κρατήσεων που λειτουργεί η ${C.name}, ${C.address} (ΑΦΜ ${C.vat}). Επικοινωνία για θέματα προσωπικών δεδομένων: ${C.email}.`,
        "Όταν κλείνετε ραντεβού σε μια επιχείρηση (κομμωτήριο, στούντιο κ.λπ.), η επιχείρηση είναι ο υπεύθυνος επεξεργασίας για τα δεδομένα της κράτησης και εμείς τα επεξεργαζόμαστε για λογαριασμό της ως εκτελούντες την επεξεργασία (άρθρο 28 ΓΚΠΔ). Για τους λογαριασμούς επιχειρήσεων, τη χρέωση της πλατφόρμας, την ασφάλεια και τα στατιστικά, υπεύθυνοι επεξεργασίας είμαστε εμείς.",
      ]},
      { h: "Ποια δεδομένα επεξεργαζόμαστε", p: [
        "Στοιχεία λογαριασμού: όνομα, email, τηλέφωνο και, αν συνδεθείτε με Google, το όνομα και το email του λογαριασμού Google.",
        "Στοιχεία κράτησης: υπηρεσίες, επαγγελματίας, ημερομηνία/ώρα, σημειώσεις, τρόπος και κατάσταση πληρωμής. Τα στοιχεία κάρτας τα διαχειρίζεται η Stripe και δεν φτάνουν ποτέ σε εμάς.",
        "Μηνύματα: επιβεβαιώσεις και υπενθυμίσεις κρατήσεων και, μόνο αν δεν έχετε εξαιρεθεί, προτάσεις νέου ραντεβού και αιτήματα αξιολόγησης μέσω email ή SMS.",
        "Τεχνικά δεδομένα: διεύθυνση IP και στοιχεία συσκευής/προγράμματος περιήγησης στα αρχεία καταγραφής· στατιστικά χρήσης μόνο αν αποδεχτείτε τα cookies στατιστικών.",
      ]},
      { h: "Σκοπός και νομική βάση", p: [
        "Για την πραγματοποίηση και διαχείριση κρατήσεων και την αποστολή επιβεβαιώσεων/υπενθυμίσεων: εκτέλεση σύμβασης (άρθρο 6 παρ. 1 β).",
        "Προτάσεις νέου ραντεβού και αιτήματα αξιολόγησης σε υφιστάμενους πελάτες: έννομο συμφέρον / άρθρο 11 παρ. 3 ν. 3471/2006. Μπορείτε να εξαιρεθείτε οποιαδήποτε στιγμή με ένα κλικ από κάθε τέτοιο μήνυμα.",
        "Ασφάλεια, πρόληψη απάτης και αρχεία καταγραφής: έννομο συμφέρον (άρθρο 6 παρ. 1 στ).",
        "Παρακολούθηση σφαλμάτων (Sentry): έννομο συμφέρον (άρθρο 6 παρ. 1 στ) για τη σωστή λειτουργία της εφαρμογής. Οι αναφορές σφαλμάτων περιέχουν μόνο τεχνικά δεδομένα (πρόγραμμα περιήγησης, σελίδα, σφάλμα)· τα email και τα τηλέφωνα αφαιρούνται πριν την αποστολή και δεν τοποθετούνται cookies.",
        "Τιμολόγηση και λογιστική των συνδρομών επιχειρήσεων: έννομη υποχρέωση (άρθρο 6 παρ. 1 γ).",
        "Στατιστικά και συνομιλία υποστήριξης: συγκατάθεσή σας (άρθρο 6 παρ. 1 α), την οποία μπορείτε να ανακαλέσετε από τις «Ρυθμίσεις cookies».",
      ]},
      { h: "Αποδέκτες", p: [
        "Η επιχείρηση στην οποία κλείνετε ραντεβού. Οι εκτελούντες την επεξεργασία που χρησιμοποιούμε: Supabase (βάση δεδομένων και ταυτοποίηση, περιοχή ΕΕ), Stripe (πληρωμές), Resend (email), GatewayAPI (SMS), Sentry (παρακολούθηση σφαλμάτων, περιοχή ΕΕ), PostHog (στατιστικά, ΕΕ, μόνο με συγκατάθεση), Crisp (συνομιλία υποστήριξης, μόνο με συγκατάθεση), Google (σύνδεση, μόνο αν την επιλέξετε).",
        "Ορισμένοι πάροχοι ενδέχεται να διαβιβάζουν δεδομένα εκτός ΕΟΧ· οι διαβιβάσεις αυτές βασίζονται στο Πλαίσιο Προστασίας Δεδομένων ΕΕ–ΗΠΑ ή σε Τυποποιημένες Συμβατικές Ρήτρες.",
      ]},
      { h: "Χρόνος διατήρησης", p: [
        "Στοιχεία λογαριασμού: όσο υπάρχει ο λογαριασμός σας. Με τη διαγραφή του λογαριασμού διαγράφεται το προφίλ σας· οι κρατήσεις ανωνυμοποιούνται, επειδή οι επιχειρήσεις οφείλουν να τηρούν αρχεία.",
        "Κρατήσεις: 5 έτη από το ραντεβού (φορολογικές και λογιστικές υποχρεώσεις) και στη συνέχεια ανωνυμοποίηση.",
        "Αρχεία αποστολής SMS: 12 μήνες. Αρχεία διακομιστών: όσο τα τηρούν οι πάροχοι φιλοξενίας (συνήθως έως 90 ημέρες).",
      ]},
      { h: "Τα δικαιώματά σας", p: [
        "Έχετε δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού, φορητότητας και εναντίωσης, καθώς και δικαίωμα ανάκλησης της συγκατάθεσής σας οποιαδήποτε στιγμή. Μπορείτε να κατεβάσετε τα δεδομένα σας και να διαγράψετε τον λογαριασμό σας από τον «Λογαριασμό μου» ή να μας γράψετε στο παραπάνω email.",
        "Για τις κρατήσεις μπορείτε να απευθυνθείτε και απευθείας στην επιχείρηση· θα τη βοηθήσουμε να απαντήσει στο αίτημά σας.",
        "Έχετε δικαίωμα υποβολής καταγγελίας στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (ΑΠΔΠΧ), Κηφισίας 1-3, 11523 Αθήνα, www.dpa.gr.",
      ]},
      { h: "Αλλαγές", p: [`Τελευταία ενημέρωση: ${C.updated}. Θα σας ενημερώσουμε για ουσιώδεις αλλαγές.`] },
    ],
  },
  terms: {
    title: "Όροι χρήσης",
    sections: [
      { h: "Η υπηρεσία", p: [
        `Το ${C.brand} (${C.name}) παρέχει λογισμικό με το οποίο επιχειρήσεις («Επιχειρήσεις») δέχονται online κρατήσεις από τους πελάτες τους («Πελάτες»). Η σύμβαση για την υπηρεσία που κλείνεται συνάπτεται μεταξύ Πελάτη και Επιχείρησης· εμείς δεν είμαστε συμβαλλόμενο μέρος.`,
      ]},
      { h: "Για τους Πελάτες", p: [
        "Δώστε ακριβή στοιχεία επικοινωνίας. Αν δεν μπορείτε να προσέλθετε, ακυρώστε ή αλλάξτε το ραντεβού μέσω των συνδέσμων που λαμβάνετε. Κάθε Επιχείρηση ορίζει τις δικές της τιμές και τους δικούς της κανόνες ακύρωσης και πληρωμής.",
        "Οι πληρωμές με κάρτα κατά την κράτηση πηγαίνουν απευθείας στον λογαριασμό Stripe της Επιχείρησης. Επιστροφές χρημάτων και αμφισβητήσεις χειρίζεται η Επιχείρηση.",
      ]},
      { h: "Για τις Επιχειρήσεις: συνδρομή", p: [
        "Οι λογαριασμοί επιχειρήσεων ξεκινούν με δωρεάν δοκιμή 30 ημερών και στη συνέχεια μηνιαία συνδρομή μέσω Stripe. Μπορείτε να ακυρώσετε οποιαδήποτε στιγμή από την οθόνη Χρέωσης· η πρόσβαση συνεχίζεται έως το τέλος της πληρωμένης περιόδου. Αν αποτύχει μια πληρωμή, η πρόσβαση συνεχίζεται για 7 ημέρες πριν κλειδώσει ο πίνακας ιδιοκτήτη. Η δημόσια σελίδα κρατήσεων δεν απενεργοποιείται ποτέ λόγω μη πληρωμής.",
        "Οι τιμές δεν περιλαμβάνουν ΦΠΑ όπου εφαρμόζεται. Τα παραστατικά εκδίδονται σύμφωνα με την ελληνική φορολογική νομοθεσία.",
        "Είστε υπεύθυνοι για τις φορολογικές σας υποχρεώσεις απέναντι στους Πελάτες σας (αποδείξεις, διασύνδεση POS/myDATA κ.λπ.).",
      ]},
      { h: "Για τις Επιχειρήσεις: αποδεκτή χρήση", p: [
        "Απαγορεύεται η χρήση της υπηρεσίας για παράνομους σκοπούς, η αποστολή μηνυμάτων που οι Πελάτες δεν έχουν αποδεχθεί και η ανάρτηση περιεχομένου για το οποίο δεν έχετε δικαιώματα. Μπορούμε να αναστείλουμε λογαριασμούς που παραβιάζουν τους όρους.",
      ]},
      { h: "Σύμβαση επεξεργασίας δεδομένων (άρθρο 28 ΓΚΠΔ)", p: [
        "Για τα δεδομένα των Πελατών, η Επιχείρηση είναι υπεύθυνος επεξεργασίας και εμείς εκτελούντες την επεξεργασία. Επεξεργαζόμαστε τα δεδομένα μόνο βάσει των εντολών της Επιχείρησης (δηλαδή για την παροχή της υπηρεσίας), τηρούμε εμπιστευτικότητα, εφαρμόζουμε κατάλληλα μέτρα ασφαλείας (κρυπτογράφηση κατά τη μεταφορά, έλεγχος πρόσβασης, διαχωρισμός δεδομένων ανά Επιχείρηση) και συνδράμουμε την Επιχείρηση στα αιτήματα υποκειμένων και στις γνωστοποιήσεις παραβιάσεων.",
        "Η Επιχείρηση εγκρίνει τους εκτελούντες που αναφέρονται στην Πολιτική απορρήτου. Θα ενημερώνουμε για νέους εκτελούντες και η Επιχείρηση μπορεί να αντιταχθεί καταγγέλλοντας τη σύμβαση.",
        "Θα ενημερώνουμε την Επιχείρηση χωρίς αδικαιολόγητη καθυστέρηση μόλις λάβουμε γνώση παραβίασης δεδομένων. Με τη λήξη της σύμβασης διαγράφουμε ή επιστρέφουμε τα δεδομένα των Πελατών, εκτός αν ο νόμος επιβάλλει τη διατήρησή τους.",
      ]},
      { h: "Ευθύνη", p: [
        "Η υπηρεσία παρέχεται «ως έχει». Στον βαθμό που επιτρέπει ο νόμος, η συνολική μας ευθύνη έναντι μιας Επιχείρησης περιορίζεται στις χρεώσεις που κατέβαλε τους τελευταίους 12 μήνες. Δεν περιορίζεται η ευθύνη για δόλο ή βαριά αμέλεια ούτε τα δικαιώματα των Πελατών ως καταναλωτών.",
      ]},
      { h: "Εφαρμοστέο δίκαιο", p: [
        "Εφαρμόζεται το ελληνικό δίκαιο. Αρμόδια είναι τα δικαστήρια [ΠΟΛΗ], με την επιφύλαξη του δικαιώματος των καταναλωτών να προσφύγουν στον τόπο κατοικίας τους. Οι καταναλωτές μπορούν επίσης να απευθυνθούν στον Συνήγορο του Καταναλωτή (www.synigoroskatanaloti.gr).",
        `Τελευταία ενημέρωση: ${C.updated}.`,
      ]},
    ],
  },
  cookies: {
    title: "Πολιτική cookies",
    sections: [
      { h: "Τι αποθηκεύουμε", p: [
        "Απολύτως απαραίτητα (χωρίς συγκατάθεση): συνεδρία σύνδεσης Supabase (sb-auth-token), η επιλογή σας για τα cookies (cookieConsent), γλώσσα (i18nextLng), θέμα (themeMode), πρόοδος κράτησης, κωδικός σύστασης (referralCode) και η προσωρινή μνήμη εκτός σύνδεσης της εφαρμογής (service worker).",
        "Στατιστικά (μόνο με συγκατάθεση): PostHog (cookie/τοπική αποθήκευση ph_*), με φιλοξενία στην ΕΕ, για να κατανοούμε πώς χρησιμοποιείται η εφαρμογή.",
        "Συνομιλία υποστήριξης (μόνο με συγκατάθεση): Crisp (cookies crisp-client/*) για να μπορείτε να μας μιλήσετε.",
        "Οι γραμματοσειρές φορτώνονται από τους δικούς μας διακομιστές, οπότε κανένας τρίτος δεν βλέπει τη διεύθυνση IP σας.",
        "Ο χάρτης Google Maps στη σελίδα πληροφοριών μιας επιχείρησης φορτώνεται μόνο αν πατήσετε «Show map».",
      ]},
      { h: "Η επιλογή σας", p: [
        "Τίποτα προαιρετικό δεν φορτώνεται πριν επιλέξετε. Η «Απόρριψη όλων» είναι εξίσου εύκολη με την «Αποδοχή όλων». Μπορείτε να αλλάξετε ή να ανακαλέσετε την επιλογή σας οποιαδήποτε στιγμή από τις «Ρυθμίσεις cookies» στο κάτω μέρος της σελίδας.",
        `Τελευταία ενημέρωση: ${C.updated}.`,
      ]},
    ],
  },
  imprint: {
    title: "Στοιχεία εταιρείας",
    sections: [
      { h: C.name, p: [
        `Διακριτικός τίτλος: ${C.brand}`, `Διεύθυνση: ${C.address}`, `ΑΦΜ: ${C.vat} · ΔΟΥ: ${C.taxOffice}`,
        `Αρ. ΓΕΜΗ: ${C.gemi}`, `Email: ${C.email} · Τηλέφωνο: ${C.phone}`,
      ]},
    ],
  },
};

export const LEGAL = { en, gr };
