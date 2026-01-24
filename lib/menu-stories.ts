import { DishStory } from './menu-types';

export const dishStories: Record<string, DishStory> = {
  // ANTIPASTI
  'cannelloni-verdi': {
    region: 'emilia-romagna',
    narrative: "Au XIXe siècle, dans les cuisines parfumées de l'Émilie-Romagne, les cuisinières créèrent ces tubes de pâte délicats comme une évolution raffinée des lasagnes. Imaginez cette bouchée fondante : la ricotta crémeuse se marie aux épinards frais de notre ferme, le tout enveloppé d'une pâte fine gratinée jusqu'à devenir dorée et croustillante.",
    funFact: "Le mot 'cannelloni' vient de 'canna' (roseau) - les cuisinières voyaient dans ces tubes la forme élégante des roseaux bordant les rivières."
  },
  'gnocchi-sorrentina': {
    region: 'campania',
    narrative: "Sur les falaises de Sorrente face au Vésuve, ce plat raconte une rencontre : les pêcheurs avec leurs tomates San Marzano, les bergères avec la mozzarella encore tiède. De cette union naquirent ces coussins de pommes de terre moelleux, nappés de sauce tomate parfumée et couronnés de mozzarella filante.",
    funFact: "À Sorrente, 'Giovedì gnocchi' est une tradition sacrée - chaque jeudi, les familles se réunissent autour de ce plat."
  },
  'arancini-quattro-formaggi': {
    region: 'sicilia',
    narrative: "Au Xe siècle, quand les Arabes régnaient sur la Sicile, ils apportèrent le riz et le safran. Les Siciliens créèrent ces joyaux dorés en forme d'orange - 'arancia'. Croquez la croûte croustillante et découvrez un cœur où quatre fromages fondent ensemble dans une harmonie crémeuse qui capture l'essence de la gourmandise italienne.",
    funFact: "En Sicile orientale ils sont ronds, en occidentale pointus - cette rivalité culinaire dure depuis un millénaire !",
    familyId: 'arancini'
  },
  'assortimento-epictete': {
    region: 'sicilia',
    narrative: "Comme Épictète enseignait la sagesse par la diversité des expériences, notre assortiment vous invite à un voyage initiatique : du classique aux quatre fromages jusqu'au luxueux tartufo, du maritime aux gambas au verdoyant pesto. Chaque bouchée est une leçon de saveurs, une méditation gustative.",
    funFact: "Épictète prônait de 'savourer chaque instant, maîtriser chaque choix' - notre devise depuis l'ouverture."
  },
  'casseruola-gamberi': {
    region: 'campania',
    narrative: "Dans les ports de Naples, quand le soleil descend sur le Vésuve, les pêcheurs préparent ce plat avec leur prise du jour. Les gambas sautent dans l'huile d'olive avec l'ail doré et le basilic frais. Les tomates cerises éclatent, libérant leur jus qui enrobe chaque crustacé. C'est la Naples authentique à votre table.",
    funFact: "Les Napolitains disent : 'O' pesce se cocina cu' o' mare' - le poisson se cuisine avec la mer, jamais d'eau douce."
  },
  'casseruola-polpo': {
    region: 'puglia',
    narrative: "Dans les Pouilles, le poulpe se mérite. Autrefois, les pêcheurs le battaient contre les rochers pour l'attendrir. Notre cuisson lente de deux heures accomplit le même miracle : chaque tentacule devient d'une tendreté incroyable, fondant sur la langue comme du beurre, parfumé d'ail et de persil.",
    funFact: "Le poulpe possède 3 cœurs et du sang bleu - un vrai aristocrate des mers."
  },

  // SALADES
  'cesar-classica': {
    region: 'international',
    narrative: "En 1924 à Tijuana, le chef italien César Cardini fait face à une cuisine vide et un restaurant bondé. Il improvise avec laitue, parmesan, œuf, anchois, croûtons. Il assemble devant ses clients, créant un spectacle autant qu'un plat. Hollywood l'adopte aussitôt. Un siècle plus tard, notre version honore cette création légendaire.",
    funFact: "César Cardini détestait les anchois ! Ils furent ajoutés plus tard par son frère Alex."
  },
  'insalata-epictete': {
    region: 'mediterranee',
    narrative: "Notre salade signature incarne la philosophie d'Épictète : trouver l'harmonie entre les éléments. Le thon puissant dialogue avec la délicatesse du crabe. L'avocat apporte son onctuosité apaisante. La vinaigrette au miel balsamique lie le tout dans un équilibre où aucun ingrédient ne domine.",
    funFact: "Épictète enseignait qu'on ne contrôle pas les événements, mais notre réponse - comme un chef qui sublime les ingrédients qu'il reçoit."
  },
  'burrata-cremosa': {
    region: 'puglia',
    narrative: "Dans les Pouilles des années 1920, un fromager cherchait à ne pas gâcher ses restes de mozzarella. Il les enveloppa dans une poche avec de la crème fraîche. D'humble recyclage, la burrata devint le fromage le plus luxueux d'Italie. Percez la poche nacrée et regardez la stracciatella couler sur les légumes grillés.",
    funFact: "Une vraie burrata doit être consommée dans les 48 heures - après, elle perd sa magie."
  },
  'carpaccio-manzo': {
    region: 'veneto',
    narrative: "En 1950, au Harry's Bar de Venise, Giuseppe Cipriani reçoit une comtesse dont le médecin interdit la viande cuite. Inspiré, il tranche finement du filet cru et le dispose comme les tableaux de Carpaccio, célèbre pour ses rouges intenses. Le plat devient légende. Notre version : tranches fines comme du papier, pesto et pignons torréfiés.",
    funFact: "Le vrai carpaccio vénitien se servait avec sauce blanche - c'est à Rome qu'on ajouta la roquette."
  },

  // PASTE
  'profumo-di-mare': {
    region: 'napoli',
    narrative: "'Al Profumo di Mare' - le parfum de la mer. Ainsi les Napolitains nomment ce trésor préparé depuis des générations sur les quais. Gambas, calamars, moules, palourdes - tout rejoint la poêle où l'ail frémit. Les coquillages s'ouvrent, libérant leurs sucs qui enrobent les pâtes al dente. Fermez les yeux : vous êtes à Naples.",
    funFact: "Jamais de parmesan sur les fruits de mer - c'est un crime culinaire passible d'excommunication des trattorias napolitaines !"
  },
  'arrabbiata-piccante': {
    region: 'roma',
    narrative: "'Arrabbiata' signifie 'en colère' - et quelle colère délicieuse ! Née dans les trattorias romaines, cette sauce exprime le tempérament passionné des Romains. Du piment, de l'ail doré, des tomates écrasées. La chaleur monte progressivement, tempérée par la douceur de la tomate. Vos joues rougiront.",
    funFact: "À Rome, l'arrabbiata doit faire rougir les joues - mais jamais pleurer. Question d'honneur pour le chef."
  },
  'boscaiola-porcini': {
    region: 'toscana',
    narrative: "Ce plat raconte l'histoire des bûcherons toscans qui cueillaient les cèpes à l'aube dans les forêts de chênes. Le soir, autour du feu, ils les cuisinaient avec la crème des fermes voisines. Aujourd'hui, ces cèpes charnus aux arômes de sous-bois s'enveloppent d'une crème veloutée et de parmesan affiné 24 mois.",
    funFact: "Le cèpe 'porcino' vient du latin 'porcus' - les Romains trouvaient ces champignons aussi dodus que des petits cochons !"
  },
  'carbonara-vegetale': {
    region: 'roma',
    narrative: "La carbonara romaine utilise le guanciale. Notre version végétarienne le remplace par des champignons fumés pour la même profondeur umami, et des épinards pour la fraîcheur. Mais l'âme reste : l'œuf forme une crème soyeuse, le pecorino fond doucement, le poivre noir réveille chaque bouchée.",
    funFact: "La vraie carbonara n'a jamais de crème - c'est l'œuf émulsionné qui crée l'onctuosité. Ajouter de la crème est un sacrilège à Rome !"
  },
  'classica-bolognese': {
    region: 'emilia-romagna',
    narrative: "En 1982, l'Académie Italienne de la Cuisine déposa officiellement la recette du ragù. Chaque famille bolonaise a pourtant sa version secrète. La nôtre : viande mijotée des heures avec le soffritto, tomates, une pointe de lait. Chaque grain de viande a absorbé les arômes, créant une sauce profonde et réconfortante.",
    funFact: "À Bologne, on sert TOUJOURS le ragù avec des tagliatelle, jamais des spaghetti - c'est un affront à la tradition émilienne."
  },

  // PIZZE
  'margherita-classica': {
    region: 'napoli',
    narrative: "En 1889, le pizzaiolo Raffaele Esposito créa pour la reine Margherita une pizza aux couleurs du drapeau italien : rouge (tomate), blanc (mozzarella), vert (basilic). La Margherita était née. Notre version honore cette histoire : pâte soufflée au four à bois, tomate écrasée à la main, mozzarella filante, basilic frais.",
    funFact: "La vraie pizza napolitaine cuit 60-90 secondes à 485°C - une seconde de trop et elle brûle.",
    familyId: 'pizza'
  },
  'pizza-epictete': {
    region: 'napoli',
    narrative: "Notre pizza signature incarne la philosophie du restaurant. Comme Épictète enseignait l'équilibre, cette création harmonise luxe et humilité : bresaola intense, stracciatella apaisante, champignons terreux, huile de truffe sublime. Chaque ingrédient a sa place, comme chaque vertu dans la vie du sage.",
    funFact: "Épictète naquit esclave et devint grand philosophe - preuve que la sagesse n'a pas de classe sociale."
  },
  'burrata-reale': {
    region: 'puglia',
    narrative: "La 'Royale' porte bien son nom : une burrata entière trône au centre comme une reine. Cette poche nacrée des Pouilles repose sur un lit de crème au basilic. Quand vous la percez, la stracciatella coule lentement sur la pizza chaude, créant un spectacle de décadence pure.",
    funFact: "La burrata fut inventée par accident en 1920 - parfois les plus belles créations naissent de la nécessité."
  },

  // SECONDI
  'escalope-milanese': {
    region: 'lombardia',
    narrative: "Depuis le XIIe siècle, la 'cotoletta alla milanese' est la fierté de Milan. Les Autrichiens affirment avoir inventé le Wiener Schnitzel, les Milanais jurent le contraire. Ce qui est certain : notre escalope est panée dans une chapelure dorée et croustillante, révélant une viande d'une tendreté parfaite.",
    funFact: "La dispute Milan-Vienne sur l'origine de l'escalope panée a fait l'objet de débats parlementaires - question d'honneur national !"
  },
  'supremo-pollo-tartufo': {
    region: 'piemonte',
    narrative: "Cette création signature de notre Chef célèbre deux excellences piémontaises : le poulet fermier de nos collines et la truffe noire des forêts de chênes. Le suprême, doré et tendre, est nappé d'une crème de truffe dont le parfum vous enveloppe avant même la première bouchée. Le luxe à l'état pur.",
    funFact: "Un 'suprême' désigne le blanc avec son aile - la découpe la plus noble, réservée aux tables raffinées."
  },
  'lasagna-bolognese': {
    region: 'emilia-romagna',
    narrative: "Les lasagnes, c'est le plat du dimanche des familles émiliennes depuis des générations. Chaque nonna a sa recette secrète. La nôtre empile pâte fraîche, ragù mijoté des heures, béchamel onctueuse et parmesan qui gratine en croûte dorée. Quand vous coupez la première part, les couches se révèlent.",
    funFact: "Les lasagnes existaient dans la Rome antique - mais sans tomates, arrivées d'Amérique au XVIe siècle."
  },

  // RAVIOLI & RISOTTO
  'ravioli-ricotta-epinards': {
    region: 'toscana',
    narrative: "Quand l'Église imposait des jours sans viande, les cuisinières toscanes créèrent ces 'ravioli di magro' farcis de ricotta et épinards. La contrainte engendra la perfection : pâte fine comme soie, farce légère et parfumée, sauce aux quatre fromages. Cinq siècles plus tard, les Italiens les mangent encore chaque vendredi.",
    funFact: "Ces raviolis sont servis dans presque tous les foyers italiens le vendredi de carême - tradition de 500 ans.",
    familyId: 'ravioli'
  },
  'risotto-tartufo': {
    region: 'piemonte',
    narrative: "Dans les collines du Piémont, quand l'automne arrive, les trufficulteurs partent à l'aube avec leurs chiens. La truffe noire qu'ils déterrent parfume ce risotto de manière presque surnaturelle : chaque grain est imprégné de notes terreuses et boisées. C'est un plat de contemplation, à savourer les yeux fermés.",
    funFact: "Le riz Carnaroli absorbe le bouillon sans devenir collant grâce à son amidon unique - secret du risotto parfait.",
    familyId: 'risotto'
  },

  // BURGERS & DOLCI
  'burger-epictete': {
    region: 'international',
    narrative: "Notre burger signature applique la philosophie d'Épictète : équilibre entre gourmandise et légèreté. Le steak, saisi à la perfection, rencontre un fromage crémeux au pesto. La roquette apporte sa fraîcheur poivrée, les asperges grillées leur croquant élégant. Un burger qui satisfait sans alourdir l'esprit.",
    funFact: "Les asperges étaient si précieuses à Rome que l'empereur Auguste créa une 'flotte des asperges' pour les transporter rapidement."
  },
  'tiramisu': {
    region: 'veneto',
    narrative: "'Tiramisù' signifie 'remonte-moi' - et ce dessert porte bien son nom. Né dans les années 1960 en Vénétie, il aurait été créé pour redonner de l'énergie. Les biscuits savoiardi, imbibés d'espresso et de marsala, s'empilent avec une crème au mascarpone aérienne. Le cacao amer contraste avec la douceur. Un remontant délicieux.",
    funFact: "Trévise, Venise et Turin revendiquent toutes l'invention du tiramisù - cette guerre fait rage depuis des décennies !"
  },
  'panna-cotta': {
    region: 'piemonte',
    narrative: "La panna cotta incarne la philosophie culinaire italienne : peu d'ingrédients, qualité maximale. 'Crème cuite' ne contient que crème, sucre, vanille et une touche de gélatine. Mais quelle crème ! Onctueuse, tremblante à peine, elle fond sur la langue en libérant un parfum délicat. La simplicité parfaite.",
    funFact: "La vraie panna cotta doit trembler comme une 'danse' quand on secoue l'assiette - trop ferme, c'est raté."
  },

  // BEVERAGES
  'espresso': {
    region: 'napoli',
    narrative: "Naples a perfectionné l'art du café serré. L'espresso napolitain est un rituel : la crema dorée qui flotte, les arômes intenses qui s'élèvent, la finale persistante qui réchauffe l'âme. Chaque tasse raconte l'histoire d'une ville passionnée qui a fait du café une forme d'art.",
    funFact: "Les Napolitains boivent leur espresso debout au comptoir - jamais assis. C'est une question de tempo, de style de vie."
  },
  'cappuccino': {
    region: 'lombardia',
    narrative: "Le cappuccino doit son nom aux moines capucins - la couleur de la mousse rappelait leur robe brune. Ce mariage parfait d'espresso et de lait moussé est devenu symbole du petit-déjeuner italien. La mousse veloutée, l'équilibre entre l'amertume du café et la douceur du lait.",
    funFact: "En Italie, on ne boit JAMAIS de cappuccino après 11h du matin - c'est considéré comme un faux pas social majeur."
  }
};
