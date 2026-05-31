// Generate a Word .docx file for the collaboration contract
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, TableLayoutType } from 'docx';
import { writeFileSync } from 'fs';

const ACCENT = '606338';
const BLACK = '000000';
const GRAY = '6B7280';

const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, color: opts.color, size: opts.size || 22 })],
  alignment: opts.align || AlignmentType.LEFT,
  spacing: { before: opts.before ?? 100, after: opts.after ?? 100, line: 320 },
});

const heading = (text, level = HeadingLevel.HEADING_1) => new Paragraph({
  heading: level,
  alignment: AlignmentType.LEFT,
  spacing: { before: 280, after: 160 },
  children: [new TextRun({ text, bold: true, color: ACCENT, size: level === HeadingLevel.HEADING_1 ? 32 : 26 })],
});

const center = (text, opts = {}) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: opts.before ?? 100, after: opts.after ?? 100 },
  children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, color: opts.color, size: opts.size || 22 })],
});

const empty = () => new Paragraph({ children: [new TextRun('')] });

const divider = () => new Paragraph({
  border: { bottom: { color: ACCENT, space: 1, style: BorderStyle.SINGLE, size: 8 } },
  spacing: { before: 100, after: 200 },
});

const bullet = (text) => new Paragraph({
  children: [new TextRun({ text, size: 22 })],
  bullet: { level: 0 },
  spacing: { before: 60, after: 60 },
});

const articleTitle = (num, title) => new Paragraph({
  spacing: { before: 280, after: 140 },
  children: [
    new TextRun({ text: `ARTICLE ${num} — `, bold: true, color: ACCENT, size: 26 }),
    new TextRun({ text: title, bold: true, color: BLACK, size: 26 }),
  ],
});

const subTitle = (text) => new Paragraph({
  spacing: { before: 180, after: 100 },
  children: [new TextRun({ text, bold: true, color: ACCENT, size: 22 })],
});

// Stacked signature block — avoids fragile table column widths.
const signBlock = (label) => [
  new Paragraph({
    children: [new TextRun({ text: label, bold: true, size: 24, color: ACCENT })],
    spacing: { before: 280, after: 120 },
    border: { bottom: { color: ACCENT, space: 4, style: BorderStyle.SINGLE, size: 6 } },
  }),
  new Paragraph({ children: [new TextRun({ text: 'Lu et approuvé', italics: true, size: 20, color: GRAY })], spacing: { before: 80, after: 140 } }),
  new Paragraph({ children: [new TextRun({ text: 'Nom : ____________________________________________', size: 22 })], spacing: { before: 100, after: 140 } }),
  new Paragraph({ children: [new TextRun({ text: 'Qualité : __________________________________________', size: 22 })], spacing: { before: 100, after: 140 } }),
  new Paragraph({ children: [new TextRun({ text: 'Signature & Cachet :', size: 22 })], spacing: { before: 100, after: 100 } }),
  empty(), empty(), empty(),
];

const doc = new Document({
  creator: 'Epictete Restaurant',
  title: 'Contrat de Collaboration Commerciale',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22 } } },
  },
  sections: [{
    properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
    children: [
      // Header
      center('Royaume du Maroc', { bold: true, size: 22, color: GRAY }),
      center('بسم الله الرحمن الرحيم', { size: 28, color: ACCENT }),
      empty(),
      center('CONTRAT DE COLLABORATION COMMERCIALE', { bold: true, size: 36, color: ACCENT }),
      empty(),
      divider(),

      // Parties
      heading('ENTRE LES SOUSSIGNÉS', HeadingLevel.HEADING_2),
      p('EPICTETE RESTAURANT', { bold: true, size: 24 }),
      p('Raison sociale : EPICTETE RESTAURANT'),
      p('Adresse : COMMUNE OULED SALEH, lot 62E3, Lotissement AL KHAIR, Bouskoura 27184, Casablanca'),
      p('ICE / RC / CIN : ____________________________'),
      p('Téléphone : 06 70 69 93 93'),
      p('Email : contact@epictetelerestaurant.ma'),
      p('Représenté par : ____________________________ (Qualité : Gérant)'),
      empty(),
      p('Ci-après désigné « LE RESTAURANT »,', { italics: true }),
      p('D\'UNE PART,', { bold: true }),
      empty(),
      p('ET', { bold: true, align: AlignmentType.CENTER }),
      empty(),
      p('LE PARTENAIRE / HÔTE / COLLABORATEUR', { bold: true, size: 24 }),
      p('Raison sociale / Nom : ____________________________'),
      p('Adresse : ____________________________'),
      p('ICE / RC / CIN : ____________________________'),
      p('Téléphone : ____________________________'),
      p('Email : ____________________________'),
      p('Représenté par : ____________________________ (Qualité : __________)'),
      empty(),
      p('Ci-après désigné « LE PARTENAIRE »,', { italics: true }),
      p('D\'AUTRE PART.', { bold: true }),
      empty(),
      p('Ensemble dénommés « LES PARTIES ».', { italics: true }),
      divider(),

      // Préambule
      heading('PRÉAMBULE'),
      p('Le présent contrat a pour objet de formaliser une collaboration commerciale simple, équitable et transparente entre LE RESTAURANT et LE PARTENAIRE, dans le cadre de la fourniture de prestations de restauration par EPICTETE RESTAURANT à la clientèle apportée ou hébergée par LE PARTENAIRE.'),
      p('Le présent contrat est régi par le Dahir formant Code des Obligations et Contrats (DOC) du 12 août 1913, ainsi que par toute disposition légale et réglementaire applicable au Royaume du Maroc.'),
      divider(),

      // Article 1
      articleTitle(1, 'OBJET'),
      p('LE RESTAURANT s\'engage à fournir au PARTENAIRE et à sa clientèle des prestations de restauration strictement limitées à la carte du restaurant (menu Epictete en vigueur). Aucune prestation hors-carte ne pourra être exigée ni fournie dans le cadre de ce contrat.'),
      p('LE PARTENAIRE s\'engage à respecter les modalités de commande, de paiement et de fonctionnement décrites ci-après.'),

      // Article 2
      articleTitle(2, 'MODALITÉS DE COMMANDE'),
      subTitle('2.1 Commande standard'),
      p('Toute commande est passée auprès du RESTAURANT par téléphone, WhatsApp ou tout moyen écrit convenu entre LES PARTIES.'),
      subTitle('2.2 Retrait des commandes'),
      p('Les commandes ne sont pas livrables par défaut. LE PARTENAIRE ou son client final s\'engage à venir retirer la commande au RESTAURANT à l\'adresse indiquée ci-dessus.'),
      subTitle('2.3 Livraison conditionnelle'),
      p('Une livraison peut être assurée par LE RESTAURANT dans les conditions suivantes :'),
      bullet('Le montant total de la commande dépasse 2 000 MAD (deux mille dirhams) ;'),
      bullet('La zone de livraison se situe dans un périmètre raisonnable autour de Bouskoura, à apprécier au cas par cas ;'),
      bullet('Des frais de livraison peuvent s\'appliquer selon la distance.'),
      subTitle('2.4 Commandes de groupe (≥ 15 personnes)'),
      p('Pour toute commande destinée à 15 personnes ou plus, LE PARTENAIRE s\'engage à informer LE RESTAURANT au minimum 24 heures à l\'avance afin que la production puisse être organisée. À défaut, LE RESTAURANT se réserve le droit de refuser ou de réduire la commande.'),
      subTitle('2.5 Service sur place chez LE PARTENAIRE'),
      p('Si LE PARTENAIRE souhaite un service complet dans son propre local (cuisine sur place, service à table, mise en place, etc.), il s\'engage à informer LE RESTAURANT au minimum 48 heures à l\'avance. Ce type de prestation entraîne des frais supplémentaires dont le montant sera défini en fonction :'),
      bullet('Du nombre de personnes ;'),
      bullet('De la durée du service ;'),
      bullet('Du personnel et du matériel mobilisés ;'),
      bullet('De la distance et de la logistique requise.'),
      p('Un devis écrit sera systématiquement remis et devra être validé avant intervention.'),
      subTitle('2.6 Annonce préalable de clients ou groupes'),
      p('LE PARTENAIRE s\'engage à informer LE RESTAURANT à chaque fois qu\'il envoie un client ou un groupe, afin de garantir un accueil et un service de qualité optimale.'),

      // Article 3
      articleTitle(3, 'VALIDATION DES COMMANDES'),
      p('Chaque commande livrée ou retirée doit être signée par le client final (le bénéficiaire réel de la prestation), en plus du PARTENAIRE le cas échéant. Cette signature vaut bon de réception et accord sur la prestation servie. Aucune réclamation ultérieure relative à la conformité ne sera recevable en l\'absence de cette signature.'),
      p('Le bon de livraison ou ticket de retrait fourni par LE RESTAURANT comportera au minimum :'),
      bullet('La date et l\'heure ;'),
      bullet('Le détail des articles commandés ;'),
      bullet('Le montant total TTC ;'),
      bullet('L\'identité et la signature du client final.'),

      // Article 4
      articleTitle(4, 'TARIFS ET FACTURATION'),
      p('Les tarifs appliqués sont ceux en vigueur sur la carte officielle du restaurant au jour de la commande.'),
      p('LE RESTAURANT établira une facture mensuelle récapitulant l\'ensemble des commandes du mois écoulé, accompagnée des bons signés correspondants.'),

      // Article 5
      articleTitle(5, 'CONDITIONS DE PAIEMENT'),
      p('LE PARTENAIRE s\'engage à régler chaque facture dans un délai de trente (30) jours à compter de la date d\'émission de la facture (paiement à un mois).'),
      p('Modes de paiement acceptés :', { bold: true }),
      bullet('Virement bancaire ;'),
      bullet('Chèque barré ;'),
      bullet('Espèces (dans la limite des plafonds légaux marocains).'),
      p('En cas de retard de paiement, et conformément aux usages commerciaux marocains, des pénalités de retard pourront être appliquées au taux légal en vigueur, sans préjudice du droit du RESTAURANT de suspendre toute prestation future jusqu\'à régularisation.'),

      // Article 6
      articleTitle(6, 'LIMITATION DE PRESTATION'),
      p('LE RESTAURANT ne peut fournir aucune prestation au-delà de ce qui figure sur la carte du restaurant. Aucune demande spéciale, plat hors-carte, ingrédient particulier, ou service annexe non expressément prévu au présent contrat ne pourra être exigé.'),
      p('Toute demande spécifique fera l\'objet d\'un accord séparé écrit et chiffré.'),

      // Article 7
      articleTitle(7, 'OBLIGATIONS DES PARTIES'),
      subTitle('7.1 Obligations du RESTAURANT'),
      bullet('Fournir des prestations conformes à la carte et aux normes d\'hygiène en vigueur ;'),
      bullet('Respecter les délais convenus ;'),
      bullet('Établir les factures dans les délais ;'),
      bullet('Préserver la confidentialité des informations communiquées par LE PARTENAIRE.'),
      subTitle('7.2 Obligations du PARTENAIRE'),
      bullet('Informer le RESTAURANT à l\'avance de tout client, groupe ou commande spéciale ;'),
      bullet('Respecter les délais de prévenance (24h pour groupes ≥ 15 personnes, 48h pour service sur place) ;'),
      bullet('Faire signer chaque bon par le client final ;'),
      bullet('Régler les factures dans le délai convenu ;'),
      bullet('Ne pas dévaloriser l\'image du RESTAURANT.'),

      // Article 8
      articleTitle(8, 'DURÉE — RÉSILIATION'),
      p('Le présent contrat est conclu pour une durée de douze (12) mois à compter de sa signature, renouvelable tacitement par périodes équivalentes, sauf dénonciation par l\'une des parties par lettre recommandée avec accusé de réception, moyennant un préavis de trente (30) jours.'),
      p('En cas de manquement grave d\'une partie à ses obligations, l\'autre partie peut résilier le contrat de plein droit, après mise en demeure restée infructueuse pendant quinze (15) jours.'),

      // Article 9
      articleTitle(9, 'CONFIDENTIALITÉ'),
      p('LES PARTIES s\'engagent à préserver la confidentialité des informations échangées dans le cadre de la présente collaboration (tarifs négociés, données clients, informations commerciales).'),

      // Article 10
      articleTitle(10, 'RESPONSABILITÉ'),
      p('LE RESTAURANT est responsable de la qualité et de l\'hygiène des prestations livrées au moment de la remise au client final ou au PARTENAIRE.'),
      p('LE PARTENAIRE est responsable de la conservation, du transport et du service des prestations après remise.'),

      // Article 11
      articleTitle(11, 'FORCE MAJEURE'),
      p('Aucune des parties ne pourra être tenue responsable d\'un manquement à ses obligations résultant d\'un cas de force majeure tel que défini par l\'article 269 du DOC (catastrophe naturelle, troubles, mesures gouvernementales, etc.).'),

      // Article 12
      articleTitle(12, 'LITIGES — DROIT APPLICABLE'),
      p('Le présent contrat est soumis au droit marocain.'),
      p('En cas de litige, LES PARTIES s\'efforceront de trouver une solution amiable. À défaut d\'accord dans un délai de trente (30) jours, le litige sera porté devant les tribunaux compétents de Casablanca, lesquels seront seuls compétents nonobstant pluralité de défendeurs ou appel en garantie.'),

      // Article 13
      articleTitle(13, 'DISPOSITIONS DIVERSES'),
      bullet('Toute modification du présent contrat devra faire l\'objet d\'un avenant écrit signé par les deux parties.'),
      bullet('Le présent contrat annule et remplace tout accord antérieur entre les parties relatif au même objet.'),
      bullet('Si une clause du présent contrat venait à être déclarée nulle, les autres clauses resteraient pleinement applicables.'),
      divider(),

      // Signatures
      heading('SIGNATURES'),
      p('Fait à Casablanca, le ____________________________'),
      p('En deux (2) exemplaires originaux, dont un pour chaque partie.'),
      empty(),
      ...signBlock('POUR LE RESTAURANT'),
      ...signBlock('POUR LE PARTENAIRE'),
      empty(),
      center('Ce contrat est rédigé en langue française et conforme au droit marocain.', { italics: true, color: GRAY, size: 18 }),
      center('Les parties reconnaissent en avoir reçu un exemplaire et en avoir compris la portée.', { italics: true, color: GRAY, size: 18 }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
const outPath = '/Users/macbook/Desktop/epictelerestaurant/contracts/CONTRAT_COLLABORATION.docx';
writeFileSync(outPath, buffer);
console.log('Generated:', outPath);
