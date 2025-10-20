// 30 verschiedene automotive Chat-Verläufe für realistische Kundenkommunikation

export const automotiveChats = [
  {
    id: 1,
    contactId: 1,
    contactName: 'Michael Weber',
    vehicle: 'BMW 320d (2019)',
    category: 'Service',
    messages: [
      {
        id: 1,
        content: 'Hallo! Ist mein BMW schon fertig mit der Inspektion?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Hallo Herr Weber! Ja, Ihr BMW 320d ist fertig. Alle Punkte wurden abgearbeitet. Sie können ihn heute ab 16:00 Uhr abholen.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 3000000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Super! Was kostet die Inspektion denn?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Die Inspektion kostet 285€. Wir haben auch noch die Bremsflüssigkeit gewechselt - das waren zusätzlich 45€.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 900000).toISOString(),
        message_type: 'text'
      },
      {
        id: 5,
        content: 'Alles klar, dann komme ich um 16:30 Uhr vorbei. Danke!',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 600000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 2,
    contactId: 2,
    contactName: 'Petra Schneider',
    vehicle: 'Audi A4 (2020)',
    category: 'Terminbuchung',
    messages: [
      {
        id: 1,
        content: 'Guten Tag! Ich bräuchte einen Termin für die 30.000 km Inspektion.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Hallo Frau Schneider! Gerne. Für welchen Zeitraum hätten Sie denn Zeit?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 6900000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Am liebsten nächste Woche, Dienstag oder Mittwoch vormittag.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 6600000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Dienstag 09:00 Uhr wäre frei. Die Inspektion dauert ca. 2-3 Stunden.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 6300000).toISOString(),
        message_type: 'text'
      },
      {
        id: 5,
        content: 'Perfekt! Können Sie mir noch den Kostenvoranschlag sagen?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 6000000).toISOString(),
        message_type: 'text'
      },
      {
        id: 6,
        content: 'Die 30.000 km Inspektion kostet 320€. Termin ist eingetragen: Dienstag 14.01., 9:00 Uhr.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 5700000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 3,
    contactId: 3,
    contactName: 'Frank Müller',
    vehicle: 'VW Golf 8 (2021)',
    category: 'Ersatzteile',
    messages: [
      {
        id: 1,
        content: 'Hallo! Ich brauche neue Winterreifen für meinen Golf. 225/45 R17.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Hallo Herr Müller! Welche Marke schwebt Ihnen vor? Continental, Michelin oder Bridgestone?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 10500000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Continental WinterContact wären mir am liebsten. Was kosten die?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 10200000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Continental WinterContact TS 870: 4 Stück 680€ inkl. Montage und Auswuchten.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 9900000).toISOString(),
        message_type: 'text'
      },
      {
        id: 5,
        content: 'Das ist ok. Wann könnte ich kommen?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 9600000).toISOString(),
        message_type: 'text'
      },
      {
        id: 6,
        content: 'Morgen ab 14:00 Uhr hätte ich Zeit. Dauert ca. 45 Minuten.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 9300000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 4,
    contactId: 4,
    contactName: 'Andrea Fischer',
    vehicle: 'Mercedes C-Klasse (2022)',
    category: 'Garantie',
    messages: [
      {
        id: 1,
        content: 'Die Klimaanlage meiner C-Klasse funktioniert nicht mehr. Das Auto ist erst 1 Jahr alt!',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Das tut mir leid zu hören, Frau Fischer. Das fällt definitiv unter die Garantie. Können Sie vorbeikommen?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 14100000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Ja, wann hätten Sie denn Zeit? Und was muss ich mitbringen?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 13800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Bringen Sie bitte Fahrzeugschein und Garantieheft mit. Morgen 10:00 Uhr wäre möglich.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 13500000).toISOString(),
        message_type: 'text'
      },
      {
        id: 5,
        content: 'Perfekt! Wie lange wird die Reparatur dauern?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 13200000).toISOString(),
        message_type: 'text'
      },
      {
        id: 6,
        content: 'Je nach Ursache 1-2 Tage. Wir haben aber Leihwagen verfügbar.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 12900000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 5,
    contactId: 5,
    contactName: 'Klaus Richter',
    vehicle: 'Opel Insignia (Interessent)',
    category: 'Verkauf',
    messages: [
      {
        id: 1,
        content: 'Hallo! Ich interessiere mich für den neuen Opel Insignia. Können wir eine Probefahrt vereinbaren?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 18000000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Hallo Herr Richter! Sehr gerne! Welche Ausstattung interessiert Sie denn?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 17700000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Der 2.0 Turbo mit Automatik und der GS Line Ausstattung.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 17400000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Excellent choice! Den haben wir da. Samstag 11:00 Uhr wäre frei für eine Probefahrt.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 17100000).toISOString(),
        message_type: 'text'
      },
      {
        id: 5,
        content: 'Super! Was kostet der denn etwa?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 16800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 6,
        content: 'Der Listenpreis liegt bei 38.990€. Je nach Finanzierung können wir da noch was machen. Besprechen wir am Samstag!',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 16500000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 6,
    contactId: 6,
    contactName: 'Sandra Wolf',
    vehicle: 'Ford Focus (2018)',
    category: 'Reparatur',
    messages: [
      {
        id: 1,
        content: 'Mein Focus macht komische Geräusche beim Bremsen. Können Sie mal schauen?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 21600000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Das klingt nach den Bremsbelägen. Wann können Sie vorbeikommen?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 21300000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Am besten heute noch, ist das gefährlich?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 21000000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Fahren Sie vorsichtig. Heute 15:00 Uhr schauen wir uns das an.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 20700000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 7,
    contactId: 7,
    contactName: 'Thomas Bauer',
    vehicle: 'Skoda Octavia (2019)',
    category: 'Service',
    messages: [
      {
        id: 1,
        content: 'Ich brauche einen 60.000 km Service für meinen Octavia.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 25200000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Gerne! Der große Service. Nächste Woche Donnerstag wäre frei.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 24900000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Was ist denn alles dabei und was kostet das?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 24600000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Ölwechsel, Filter, Zündkerzen, Zahnriemen-Check, etc. Ca. 450€.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 24300000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 8,
    contactId: 8,
    contactName: 'Julia Hoffmann',
    vehicle: 'Mercedes A-Klasse (Interessent)',
    category: 'Verkauf',
    messages: [
      {
        id: 1,
        content: 'Hallo! Ich überlege mir eine A-Klasse zu kaufen. Haben Sie gerade welche da?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 28800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Hallo! Ja, wir haben mehrere A-Klassen vorrätig. Welche Motorisierung interessiert Sie?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 28500000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Den A 200 mit Automatik. Gerne in weiß oder grau.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 28200000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Den haben wir in polarweiß da! Möchten Sie ihn sich ansehen?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 27900000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 9,
    contactId: 9,
    contactName: 'Stefan Zimmermann',
    vehicle: 'Audi Q5 (2020)',
    category: 'Terminbuchung',
    messages: [
      {
        id: 1,
        content: 'Mein Q5 braucht neue Sommerreifen. Haben Sie Termine frei?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 32400000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Ja! Welche Dimension brauchen Sie denn?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 32100000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: '255/45 R20. Am liebsten Michelin oder Continental.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 31800000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 10,
    contactId: 10,
    contactName: 'Melanie Koch',
    vehicle: 'BMW X3 (2021)',
    category: 'Service',
    messages: [
      {
        id: 1,
        content: 'Die Motorwarnleuchte meines X3 leuchtet. Was soll ich tun?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 36000000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Fahren Sie vorsichtig und kommen Sie so schnell wie möglich vorbei. Wir schauen sofort nach.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 35700000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Okay, ich bin in 20 Minuten da.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 35400000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 11,
    contactId: 11,
    contactName: 'Markus Wagner',
    vehicle: 'VW Passat (2018)',
    category: 'Ersatzteile',
    messages: [
      {
        id: 1,
        content: 'Ich brauche eine neue Stoßstange vorne für meinen Passat. Lieferbar?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 39600000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Muss ich bestellen. Brauchen Sie sie lackiert oder unlackiert?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 39300000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Lackiert in Reflexsilber. Was kostet das und wie lange dauert es?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 39000000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Ca. 850€ inkl. Lackierung und Montage. Lieferzeit 5-7 Werktage.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 38700000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 12,
    contactId: 12,
    contactName: 'Lisa Neumann',
    vehicle: 'Mini Cooper (2020)',
    category: 'Garantie',
    messages: [
      {
        id: 1,
        content: 'Das Schiebedach meines Mini klemmt. Garantiefall?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 43200000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Ja, das fällt unter die Garantie. Bringen Sie das Auto vorbei.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 42900000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Super! Wann haben Sie Zeit?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 42600000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 13,
    contactId: 13,
    contactName: 'Robert Schulz',
    vehicle: 'Toyota Camry (2019)',
    category: 'Service',
    messages: [
      {
        id: 1,
        content: 'Brauche einen Ölwechsel für meinen Camry. Welches Öl nehmen Sie?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 46800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Wir verwenden Toyota Original 0W-20 Öl. Termin morgen 9:00 Uhr frei.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 46500000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Perfekt! Was kostet der Ölwechsel?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 46200000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: '89€ inkl. Filter und Entsorgung.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 45900000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 14,
    contactId: 14,
    contactName: 'Anna Richter',
    vehicle: 'Hyundai i30 (2021)',
    category: 'Terminbuchung',
    messages: [
      {
        id: 1,
        content: 'Ich möchte einen Termin für die erste Inspektion meines i30.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 50400000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Gerne! Wann wurde das Auto zugelassen?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 50100000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Im März 2021. Sind jetzt 15.000 km drauf.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 49800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Dann ist die erste Inspektion fällig. Mittwoch 14:00 Uhr möglich?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 49500000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 15,
    contactId: 15,
    contactName: 'Carsten Müller',
    vehicle: 'Ford Mondeo (2017)',
    category: 'Reparatur',
    messages: [
      {
        id: 1,
        content: 'Mein Mondeo springt schlecht an. Besonders morgens.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 54000000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Das könnte die Batterie oder Zündkerzen sein. Können Sie vorbeikommen?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 53700000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Ja, heute nachmittag. Was würde eine Diagnose kosten?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 53400000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Diagnose kostet 65€, wird aber bei Reparatur angerechnet.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 53100000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 16,
    contactId: 16,
    contactName: 'Sabine Weber',
    vehicle: 'Peugeot 308 (2019)',
    category: 'Ersatzteile',
    messages: [
      {
        id: 1,
        content: 'Meine Rückfahrkamera ist defekt. Können Sie die reparieren?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 57600000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Meistens muss die Kamera getauscht werden. Kann ich mal schauen?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 57300000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Ja gerne. Was würde eine neue Kamera kosten?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 57000000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 17,
    contactId: 17,
    contactName: 'Jochen Kraus',
    vehicle: 'Seat Leon (2020)',
    category: 'Service',
    messages: [
      {
        id: 1,
        content: 'Wann ist die nächste Inspektion fällig für meinen Leon?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 61200000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Bei welchem Kilometerstand sind Sie denn momentan?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 60900000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: '28.500 km. Gekauft im Juni 2020.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 60600000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Dann ist bald die 30.000 km Inspektion fällig. Termin vereinbaren?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 60300000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 18,
    contactId: 18,
    contactName: 'Tanja Hoffmann',
    vehicle: 'Renault Clio (2018)',
    category: 'Reparatur',
    messages: [
      {
        id: 1,
        content: 'Die Heizung in meinem Clio wird nicht warm. Können Sie helfen?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 64800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Das ist im Winter ärgerlich! Kann das Thermostat oder der Kühler sein.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 64500000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Können Sie heute noch schauen? Mir ist so kalt im Auto!',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 64200000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 19,
    contactId: 19,
    contactName: 'Daniel Schmidt',
    vehicle: 'Mazda CX-5 (2019)',
    category: 'Verkauf',
    messages: [
      {
        id: 1,
        content: 'Ich überlege, meinen CX-5 gegen ein neueres Modell zu tauschen.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 68400000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Gerne! Welchen Kilometerstand hat Ihr CX-5 denn?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 68100000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: '45.000 km, gepflegt, alle Services bei Ihnen gemacht.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 67800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Das ist ein guter Inzahlungnahme-Kandidat! Welches neue Modell interessiert Sie?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 67500000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 20,
    contactId: 20,
    contactName: 'Christina Lange',
    vehicle: 'Kia Sportage (2020)',
    category: 'Garantie',
    messages: [
      {
        id: 1,
        content: 'Das Infotainment-System meines Sportage hängt sich ständig auf.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 72000000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Das ist ein bekanntes Problem. Software-Update verfügbar. Termin?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 71700000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Wie lange dauert das Update?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 71400000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 21,
    contactId: 21,
    contactName: 'Martin Schneider',
    vehicle: 'Volvo V60 (2018)',
    category: 'Service',
    messages: [
      {
        id: 1,
        content: 'Mein V60 braucht neue Bremsscheiben. Haben Sie Original-Teile?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 75600000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Ja, Volvo Original-Bremsscheiben haben wir. Vorne, hinten oder alle?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 75300000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Nur vorne. Was kostet das mit Belägen?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 75000000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 22,
    contactId: 22,
    contactName: 'Silke Fischer',
    vehicle: 'Nissan Qashqai (2019)',
    category: 'Terminbuchung',
    messages: [
      {
        id: 1,
        content: 'Ich brauche einen TÜV-Termin für meinen Qashqai.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 79200000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Gerne! Wann läuft der TÜV ab?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 78900000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Ende dieses Monats. Können Sie das direkt bei sich machen?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 78600000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 23,
    contactId: 23,
    contactName: 'Patrick Braun',
    vehicle: 'Honda Civic (2020)',
    category: 'Ersatzteile',
    messages: [
      {
        id: 1,
        content: 'Brauche einen neuen Außenspiegel für meinen Civic. Links.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 82800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Komplett oder nur das Spiegelglas?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 82500000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Komplett. Das Gehäuse ist auch beschädigt.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 82200000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 24,
    contactId: 24,
    contactName: 'Yvonne Klein',
    vehicle: 'Suzuki Swift (2021)',
    category: 'Service',
    messages: [
      {
        id: 1,
        content: 'Wann sollte ich das erste Mal zur Inspektion mit meinem Swift?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Nach einem Jahr oder 15.000 km, je nachdem was zuerst erreicht wird.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 86100000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Bin jetzt bei 12.000 km. Wie viel kostet die erste Inspektion?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 85800000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 25,
    contactId: 25,
    contactName: 'Ralf Zimmermann',
    vehicle: 'Alfa Romeo Giulia (2019)',
    category: 'Reparatur',
    messages: [
      {
        id: 1,
        content: 'Meine Giulia verliert Kühlflüssigkeit. Das ist nicht normal, oder?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 90000000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Nein, definitiv nicht! Fahren Sie nicht weiter und kommen Sie sofort vorbei.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 89700000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Oh je... ist das schlimm? Motor kaputt?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 89400000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 26,
    contactId: 26,
    contactName: 'Birgit Schneider',
    vehicle: 'Citroen C3 (2020)',
    category: 'Verkauf',
    messages: [
      {
        id: 1,
        content: 'Ich überlege, von meinem C3 auf ein größeres Auto umzusteigen.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 93600000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Welche Größe schwebt Ihnen vor? SUV oder Kombi?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 93300000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Ein kleiner SUV wäre schön. Was haben Sie da?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 93000000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 27,
    contactId: 27,
    contactName: 'Jürgen Weber',
    vehicle: 'Dacia Duster (2018)',
    category: 'Service',
    messages: [
      {
        id: 1,
        content: 'Mein Duster ruckelt beim Beschleunigen. Was kann das sein?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 97200000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Das können die Zündkerzen oder der Luftfilter sein. Können Sie vorbeikommen?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 96900000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Ja, morgen früh. Was würde das kosten?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 96600000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 28,
    contactId: 28,
    contactName: 'Monika Krause',
    vehicle: 'Fiat 500 (2019)',
    category: 'Garantie',
    messages: [
      {
        id: 1,
        content: 'Die Servolenkung meines 500er ist sehr schwergängig geworden.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 100800000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Das klingt nach einem Garantiefall. Können Sie das Auto bringen?',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 100500000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Ist das gefährlich zu fahren?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 100200000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 29,
    contactId: 29,
    contactName: 'Bernd Hoffmann',
    vehicle: 'Jeep Cherokee (2017)',
    category: 'Ersatzteile',
    messages: [
      {
        id: 1,
        content: 'Brauche neue Scheinwerfer für meinen Cherokee. LED-Version.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 104400000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Original Jeep LED-Scheinwerfer? Die sind leider recht teuer.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 104100000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Was kosten die denn etwa?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 103800000).toISOString(),
        message_type: 'text'
      }
    ]
  },
  {
    id: 30,
    contactId: 30,
    contactName: 'Petra Schulz',
    vehicle: 'Mitsubishi Outlander (2020)',
    category: 'Terminbuchung',
    messages: [
      {
        id: 1,
        content: 'Ich brauche einen Termin für den Klimaservice bei meinem Outlander.',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 108000000).toISOString(),
        message_type: 'text'
      },
      {
        id: 2,
        content: 'Gerne! Der Klimaservice sollte alle 2 Jahre gemacht werden.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 107700000).toISOString(),
        message_type: 'text'
      },
      {
        id: 3,
        content: 'Was ist da alles enthalten und was kostet das?',
        is_outgoing: false,
        timestamp: new Date(Date.now() - 107400000).toISOString(),
        message_type: 'text'
      },
      {
        id: 4,
        content: 'Desinfektion, Filter-Wechsel, Dichtigkeitsprüfung. 120€ inkl.',
        is_outgoing: true,
        timestamp: new Date(Date.now() - 107100000).toISOString(),
        message_type: 'text'
      }
    ]
  }
]

// Hilfsfunktion um Chat nach ID zu finden
export function getChatById(chatId: number) {
  return automotiveChats.find(chat => chat.id === chatId)
}

// Hilfsfunktion um Chats nach Kategorie zu filtern
export function getChatsByCategory(category: string) {
  return automotiveChats.filter(chat => chat.category === category)
}

// Hilfsfunktion um alle verfügbaren Kategorien zu bekommen
export function getAvailableCategories() {
  const categories = automotiveChats.map(chat => chat.category)
  const uniqueCategories = Array.from(new Set(categories))
  return uniqueCategories
}