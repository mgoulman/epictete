import { MenuItem, PASTA_OPTIONS, SAUCE_OPTIONS } from './menu-types';
import { dishStories } from './menu-stories';

// Helper to create menu items quickly with automatic story lookup
const item = (
  id: string,
  name: string,
  price: number,
  desc: string,
  ingredients: string[],
  category: MenuItem['category'],
  tags: MenuItem['tags'],
  opts?: Partial<MenuItem>
): MenuItem => ({
  id, 
  name, 
  nameFr: name, 
  price, 
  description: desc, 
  ingredients, 
  category, 
  tags, 
  story: dishStories[id],  // Auto-lookup story by ID
  ...opts
});

export const menuItems: MenuItem[] = [
  // ANTIPASTI
  item('cannelloni-verdi', 'Cannelloni Verdi', 55, 'Farcis à la Ricotta et aux épinards', ['Ricotta', 'Épinards'], 'antipasti', ['vegetarian', 'cheese']),
  item('gnocchi-sorrentina', 'Gnocchi alla Sorrentina', 45, 'Gnocchi de pommes de terre gratinés, sauce tomate et mozzarella', ['Gnocchi', 'Sauce tomate', 'Mozzarella'], 'antipasti', ['vegetarian', 'cheese']),
  item('arancini-quattro-formaggi', 'Arancini Quattro Formaggi', 50, 'Croquettes de risotto crémeux aux fromages', ['Risotto', 'Quatre fromages', 'Sauce parmesan'], 'antipasti', ['vegetarian', 'cheese']),
  item('arancini-gamberi', 'Arancini ai Gamberi', 55, 'Croquettes de risotto aux gambas', ['Risotto', 'Gambas', 'Sauce crevettes'], 'antipasti', ['seafood']),
  item('arancini-tartufo', 'Arancini al Tartufo', 60, 'Croquettes de risotto à la crème de truffe', ['Risotto', 'Crème de truffe'], 'antipasti', ['vegetarian', 'truffle']),
  item('arancini-pesto', 'Arancini al Pesto', 50, 'Croquettes au pesto et tomates séchées', ['Risotto', 'Pesto', 'Tomates séchées', 'Stracciatella'], 'antipasti', ['vegetarian', 'cheese']),
  item('assortimento-epictete', 'Assortimento Épictète', 70, 'Sélection de 4 arancini maison', ['4 Arancini', 'Sauce fromagère'], 'antipasti', ['signature', 'cheese'], { isSignature: true }),
  item('casseruola-gamberi', 'Casseruola di Gamberi', 75, 'Gambas sautées tomates, ail, basilic', ['Gambas', 'Tomates', 'Ail', 'Basilic'], 'antipasti', ['seafood']),
  item('casseruola-cozze', 'Casseruola di Cozze Pil-Pil', 60, 'Moules à l\'ail et piment fort', ['Moules', 'Ail', 'Piment fort', 'Persil'], 'antipasti', ['seafood', 'spicy']),
  item('casseruola-polpo', 'Casseruola di Polpo', 75, 'Poulpe tendre à l\'ail et persil', ['Poulpe', 'Ail', 'Persil', 'Pommes de terre'], 'antipasti', ['seafood']),

  // SALADES
  item('cesar-classica', 'César Classica', 70, 'Iceberg, poulet grillé, parmesan, sauce César', ['Iceberg', 'Poulet grillé', 'Parmesan', 'Œuf', 'Croûtons', 'Sauce César'], 'salades', ['meat', 'cheese']),
  item('insalata-greca', 'Insalata Greca', 60, 'Iceberg, poivrons, feta, olives noires', ['Iceberg', 'Poivrons', 'Concombre', 'Feta', 'Olives', 'Courgettes grillées'], 'salades', ['vegetarian', 'cheese']),
  item('insalata-freschezza', 'Insalata Freschezza', 80, 'Iceberg, gambas, avocat, mangue', ['Iceberg', 'Gambas', 'Avocat', 'Mangue', 'Mozzarella', 'Parmesan'], 'salades', ['seafood', 'cheese']),
  item('insalata-epictete', 'Insalata Épictète', 80, 'Mesclun, thon, chair de crabe, avocat', ['Mesclun', 'Thon', 'Crabe', 'Avocat', 'Vinaigrette miel balsamique'], 'salades', ['seafood', 'signature'], { isSignature: true }),
  item('burrata-cremosa', 'Burrata Cremosa', 115, 'Burrata crémeuse, légumes grillés, pesto', ['Burrata', 'Légumes grillés', 'Pesto'], 'salades', ['vegetarian', 'cheese']),
  item('stracciatella-rustica', 'Stracciatella Rustica', 55, 'Tomates, stracciatella, noix, parmesan', ['Tomates', 'Stracciatella', 'Légumes grillés', 'Noix', 'Parmesan'], 'salades', ['vegetarian', 'cheese']),
  item('carpaccio-manzo', 'Carpaccio di Manzo', 100, 'Filet de bœuf tranché, pesto, pignons', ['Filet de bœuf', 'Pesto', 'Pignons', 'Câpres', 'Roquette'], 'salades', ['meat', 'cheese']),
  item('vitello-tonnato', 'Vitello Tonnato', 85, 'Veau tendre, crème de thon, câpres', ['Veau', 'Crème de thon', 'Câpres', 'Roquette'], 'salades', ['meat', 'seafood']),
  item('bruschetta-bresaola', 'Bruschetta Brésaola', 75, 'Pain tartine, brésaola, roquette', ['Pain', 'Pesto', 'Mozzarella', 'Brésaola', 'Roquette'], 'salades', ['meat', 'cheese']),

  // PASTE
  item('profumo-di-mare', 'Al Profumo di Mare', 130, 'Gambas, calamars, moules, palourdes', ['Gambas', 'Calamars', 'Moules', 'Palourdes', 'Crème crevettes'], 'paste', ['seafood'], { customizations: [PASTA_OPTIONS] }),
  item('arrabbiata-piccante', 'Arrabbiata Piccante', 50, 'Sauce tomate épicée, ail, basilic', ['Sauce tomate épicée', 'Ail', 'Basilic', 'Parmesan'], 'paste', ['vegetarian', 'spicy'], { customizations: [PASTA_OPTIONS] }),
  item('boscaiola-porcini', 'Boscaiola ai Porcini', 140, 'Cèpes, sauce crémeuse, parmesan', ['Cèpes', 'Sauce crémeuse', 'Parmesan'], 'paste', ['vegetarian', 'truffle'], { customizations: [PASTA_OPTIONS] }),
  item('quattro-formaggi-oro', 'Quattro Formaggi d\'Oro', 105, 'Crème parmesan, gorgonzola, ricotta, scamorza', ['Parmesan', 'Gorgonzola', 'Ricotta', 'Scamorza fumée'], 'paste', ['vegetarian', 'cheese'], { customizations: [PASTA_OPTIONS] }),
  item('pesto-stracciatella', 'Pesto & Stracciatella', 90, 'Champignons, pesto crémeux, stracciatella', ['Champignons', 'Pesto', 'Stracciatella', 'Parmesan'], 'paste', ['vegetarian', 'cheese'], { customizations: [PASTA_OPTIONS] }),
  item('pollo-pesto-verde', 'Pollo al Pesto Verde', 105, 'Poulet mariné, champignons, pesto', ['Poulet', 'Champignons', 'Pesto', 'Parmesan'], 'paste', ['meat', 'cheese'], { customizations: [PASTA_OPTIONS] }),
  item('carbonara-vegetale', 'Carbonara Vegetale', 115, 'Épinards, champignons, crème, parmesan', ['Épinards', 'Champignons', 'Crème', 'Parmesan'], 'paste', ['vegetarian', 'cheese'], { customizations: [PASTA_OPTIONS] }),
  item('funghi-tartufo', 'Funghi al Tartufo', 130, 'Poulet, champignons, crème de truffe, burrata', ['Poulet', 'Champignons', 'Crème de truffe', 'Burrata'], 'paste', ['meat', 'truffle', 'cheese'], { customizations: [PASTA_OPTIONS] }),
  item('classica-bolognese', 'Classica alla Bolognese', 80, 'Viande hachée, sauce tomate, basilic', ['Viande hachée', 'Sauce tomate', 'Ail', 'Basilic'], 'paste', ['meat'], { customizations: [PASTA_OPTIONS] }),
  item('regina-salmone', 'Regina di Salmone', 130, 'Saumon fumé, sauce rosée à l\'aneth', ['Saumon fumé', 'Sauce rosée', 'Aneth'], 'paste', ['seafood'], { customizations: [PASTA_OPTIONS] }),
  item('gamberi-zucchine', 'Gamberi & Zucchine', 135, 'Gambas, courgettes, sauce bisque', ['Gambas', 'Courgettes', 'Tomates cerises', 'Sauce bisque'], 'paste', ['seafood'], { customizations: [PASTA_OPTIONS] }),

  // PIZZE
  item('margherita-classica', 'Margherita Classica', 50, 'Sauce tomate, mozzarella, basilic', ['Sauce tomate', 'Mozzarella', 'Basilic'], 'pizze', ['vegetarian', 'cheese']),
  item('bismarck', 'Bismarck', 105, 'Sauce tomate, viande hachée, champignons, œuf', ['Sauce tomate', 'Mozzarella', 'Viande hachée', 'Champignons', 'Œuf'], 'pizze', ['meat', 'cheese']),
  item('formia-mediterranea', 'Formia Mediterranea', 90, 'Crème parmesan, thon, câpres, olives', ['Crème parmesan', 'Thon', 'Câpres', 'Olives', 'Roquette'], 'pizze', ['seafood', 'cheese']),
  item('bresaola-parma', 'Brésaola di Parma', 120, 'Sauce tomate, brésaola, roquette', ['Sauce tomate', 'Mozzarella', 'Brésaola', 'Roquette', 'Parmesan'], 'pizze', ['meat', 'cheese']),
  item('tartufata-eleganza', 'Tartufata Eleganza', 130, 'Crème parmesan, crème de truffe, champignons', ['Crème parmesan', 'Crème de truffe', 'Champignons', 'Stracciatella'], 'pizze', ['vegetarian', 'truffle', 'cheese']),
  item('vegetariana-rustica', 'Vegetariana Rustica', 80, 'Légumes grillés, champignons, artichaut', ['Légumes grillés', 'Champignons', 'Artichaut', 'Roquette', 'Pesto'], 'pizze', ['vegetarian', 'cheese']),
  item('salmone-avocado', 'Salmone e Avocado', 140, 'Saumon fumé, stracciatella, avocat', ['Saumon fumé', 'Stracciatella', 'Avocat', 'Roquette'], 'pizze', ['seafood', 'cheese']),
  item('frutti-di-mare-pizza', 'Frutti di Mare', 130, 'Gambas, calamars, moules', ['Gambas', 'Calamars', 'Moules', 'Tomates cerises'], 'pizze', ['seafood', 'cheese']),
  item('pizza-epictete', 'Pizza Épictète', 120, 'Brésaola, stracciatella, huile de truffe', ['Brésaola', 'Stracciatella', 'Champignons', 'Huile de truffe', 'Roquette'], 'pizze', ['signature', 'meat', 'truffle', 'cheese'], { isSignature: true }),
  item('gamberi-siciliana', 'Gamberi alla Siciliana', 95, 'Crème de courgettes, gambas, olives', ['Crème de courgettes', 'Gambas', 'Champignons', 'Olives'], 'pizze', ['seafood', 'cheese']),
  item('burrata-reale', 'Burrata Reale', 150, 'Crème basilic, burrata, roquette', ['Crème basilic', 'Mozzarella', 'Burrata', 'Tomates cerises'], 'pizze', ['vegetarian', 'cheese']),
  item('regina-classica', 'Regina Classica', 110, 'Jambon de dinde, bœuf, champignons', ['Sauce tomate', 'Jambon de dinde', 'Bœuf', 'Champignons'], 'pizze', ['meat', 'cheese']),
  item('cinque-formaggi', 'Cinque Formaggi', 110, 'Cinq fromages, figues confites, noix', ['Parmesan', 'Mozzarella', 'Ricotta', 'Scamorza', 'Gorgonzola', 'Figues'], 'pizze', ['vegetarian', 'cheese']),
  item('carciofi-prosciutto', 'Carciofi e Prosciutto', 105, 'Artichaut mariné, jambon de dinde', ['Crème funghi', 'Artichaut', 'Jambon de dinde', 'Stracciatella'], 'pizze', ['meat', 'cheese']),
  item('pistacchio-stracciatella', 'Pistacchio & Stracciatella', 105, 'Jambon de bœuf, crème pistache', ['Jambon de bœuf', 'Crème pistache', 'Stracciatella', 'Basilic'], 'pizze', ['meat', 'cheese']),
  item('pollo-pesto-pizza', 'Pollo alla Pesto', 95, 'Poulet mariné, champignons, pesto', ['Poulet', 'Champignons', 'Stracciatella', 'Pesto'], 'pizze', ['meat', 'cheese']),
  item('carnivora', 'Carnivora', 115, 'Viande hachée, jambon de bœuf', ['Viande hachée', 'Jambon de bœuf', 'Champignons', 'Stracciatella'], 'pizze', ['meat', 'cheese']),
  item('pepperoni-piccante', 'Pepperoni Piccante', 85, 'Sauce tomate, champignons, pepperoni', ['Sauce tomate', 'Mozzarella', 'Champignons', 'Pepperoni'], 'pizze', ['meat', 'spicy', 'cheese']),

  // SECONDI PIATTI
  item('escalope-milanese', 'Escalope alla Milanese', 100, 'Veau pané, roquette, sauce fromagère', ['Veau pané', 'Roquette', 'Parmesan', 'Sauce fromagère'], 'secondi', ['meat', 'cheese']),
  item('escalope-parmigiana', 'Escalope alla Parmigiana', 80, 'Poulet pané gratiné, sauce tomate, pesto', ['Poulet pané', 'Sauce tomate', 'Pesto'], 'secondi', ['meat', 'cheese']),
  item('escalope-limone', 'Escalope al Limone', 75, 'Poulet tendre, sauce citronnée', ['Poulet', 'Sauce citronnée'], 'secondi', ['meat']),
  item('supremo-pollo-tartufo', 'Supremo di Pollo al Tartufo', 120, 'Blanc de poulet à la crème de truffe', ['Poulet', 'Crème de truffe'], 'secondi', ['signature', 'meat', 'truffle'], { isSignature: true, chefNote: 'Signature Chef Salami' }),
  item('filetto-manzo', 'Filetto di Manzo', 170, 'Filet de bœuf grillé, sauce au choix', ['Filet de bœuf grillé'], 'secondi', ['meat'], { customizations: [SAUCE_OPTIONS] }),
  item('entrecote-grigliata', 'Entrecôte Grigliata', 135, 'Entrecôte grillée, sauce au choix', ['Entrecôte grillée'], 'secondi', ['meat'], { customizations: [SAUCE_OPTIONS] }),
  item('pave-salmone', 'Pavé di Salmone alla Griglia', 155, 'Pavé de saumon grillé, sauce citronnée', ['Saumon grillé', 'Sauce aux herbes'], 'secondi', ['seafood']),
  item('lotte-porcini', 'Lotte ai Funghi Porcini', 170, 'Filet de lotte, sauce aux cèpes', ['Lotte', 'Sauce aux cèpes'], 'secondi', ['seafood', 'truffle']),
  item('lasagna-bolognese', 'Lasagna alla Bolognese', 95, 'Lasagne traditionnelle gratinée', ['Pâtes', 'Bolognese', 'Béchamel', 'Fromage'], 'secondi', ['meat', 'cheese']),
  item('lasagna-pollo-funghi', 'Lasagna Pollo e Funghi', 85, 'Poulet, crème aux champignons', ['Poulet', 'Crème champignons', 'Mozzarella'], 'secondi', ['meat', 'cheese']),
  item('polpo-forno', 'Polpo al Forno', 140, 'Poulpe grillé, purée truffe', ['Poulpe', 'Sauce vierge', 'Purée truffe'], 'secondi', ['seafood', 'truffle']),

  // RAVIOLI
  item('ravioli-ricotta-epinards', 'Ricotta & Épinards', 110, 'Farcis ricotta épinards, sauce 4 fromages', ['Ricotta', 'Épinards', 'Sauce quatre fromages'], 'ravioli', ['vegetarian', 'cheese']),
  item('ravioli-granchio', 'Ravioli di Granchio', 115, 'Farcis au crabe, crème de crevettes', ['Crabe', 'Crème de crevettes'], 'ravioli', ['seafood']),
  item('ravioli-tartufo', 'Ravioli al Tartufo', 125, 'Farcis champignons, crème truffe', ['Champignons', 'Crème de truffe'], 'ravioli', ['vegetarian', 'truffle']),
  item('ravioli-burrata-gamberi', 'Ravioli Burrata & Gamberi', 120, 'Farcis burrata gambas, sauce pesto', ['Burrata', 'Gambas', 'Pesto', 'Parmesan'], 'ravioli', ['seafood', 'cheese']),

  // RISOTTO
  item('risotto-funghi-burrata', 'Risotto Funghi & Burrata', 100, 'Champignons, poulet, cœur de burrata', ['Champignons', 'Poulet', 'Parmesan', 'Burrata'], 'risotto', ['meat', 'cheese']),
  item('risotto-tartufo', 'Risotto al Tartufo', 120, 'Champignons frais, sauce crémeuse truffe', ['Champignons', 'Sauce truffe'], 'risotto', ['vegetarian', 'truffle']),
  item('risotto-frutti-mare', 'Risotto Frutti di Mare', 140, 'Gambas, calamars, moules, palourdes', ['Gambas', 'Calamars', 'Moules', 'Palourdes'], 'risotto', ['seafood']),

  // BURGERS
  item('burger-americano', 'Burger Americano', 100, 'Steak de bœuf, bacon, cheddar, BBQ', ['Steak bœuf', 'Bacon', 'Cheddar', 'Sauce BBQ'], 'burger', ['meat', 'cheese']),
  item('burger-crispe', 'Burger Crispé', 75, 'Poulet croustillant, fromage fumé', ['Poulet pané', 'Fromage fumé', 'Oignons caramélisés'], 'burger', ['meat', 'cheese']),
  item('burger-epictete', 'Burger Épictète', 120, 'Steak haché, fromage pesto, asperges', ['Steak haché', 'Fromage pesto', 'Roquette', 'Asperges'], 'burger', ['signature', 'meat', 'cheese'], { isSignature: true }),

  // DOLCI
  item('tiramisu', 'Tiramisù Classico', 50, 'Tiramisù traditionnel italien', ['Mascarpone', 'Café', 'Cacao'], 'dolci', []),
  item('panna-cotta', 'Panna Cotta', 35, 'Crème onctueuse à la vanille', ['Crème', 'Vanille'], 'dolci', ['vegetarian']),
  item('cheesecake', 'Cheesecake', 50, 'Cheesecake crémeux', ['Fromage frais', 'Biscuit'], 'dolci', ['vegetarian']),
  item('mousse-chocolat', 'Mousse al Cioccolato', 45, 'Mousse légère au chocolat', ['Chocolat', 'Crème'], 'dolci', ['vegetarian']),
  item('profiteroles', 'Profiteroles', 55, 'Choux garnis, sauce chocolat', ['Pâte à choux', 'Crème', 'Chocolat'], 'dolci', ['vegetarian']),
  item('bananaamisu', 'Bananamisù', 50, 'Tiramisù revisité à la banane', ['Banane', 'Mascarpone', 'Cacao'], 'dolci', ['vegetarian']),
  item('fondant-chocolat', 'Fondant au Chocolat', 55, 'Cœur fondant au chocolat', ['Chocolat noir', 'Beurre'], 'dolci', ['vegetarian']),

  // BEVERAGES - Cafés
  item('espresso', 'Espresso / Allongé', 25, 'Café espresso ou allongé', ['Café'], 'beverages', []),
  item('cappuccino', 'Cappuccino', 30, 'Espresso, lait moussé', ['Café', 'Lait'], 'beverages', []),
  item('latte', 'Latte', 25, 'Café au lait', ['Café', 'Lait'], 'beverages', []),
  item('latte-macchiato', 'Latte Macchiato', 35, 'Lait avec touche d\'espresso', ['Lait', 'Café'], 'beverages', []),
  item('chocolat-chaud', 'Chocolat Chaud', 35, 'Chocolat chaud onctueux', ['Chocolat', 'Lait'], 'beverages', []),
  item('the-marocain', 'Thés Marocains', 25, 'Thé à la menthe traditionnel', ['Thé', 'Menthe'], 'beverages', []),

  // BEVERAGES - Mocktails
  item('bora-bora', 'Bora Bora', 65, 'Mocktail tropical signature', ['Fruits tropicaux'], 'beverages', []),
  item('pina-colada', 'Piña Colada', 75, 'Mocktail ananas coco', ['Ananas', 'Coco'], 'beverages', []),
  item('mary-berries', 'Mary\'s Berries', 60, 'Mocktail aux fruits rouges', ['Fruits rouges'], 'beverages', []),
  item('le-rio', 'Le Rio', 60, 'Mocktail rafraîchissant', ['Agrumes'], 'beverages', []),
  item('blue-hawaii', 'Blue Hawaii', 75, 'Mocktail bleu tropical', ['Curaçao bleu', 'Fruits'], 'beverages', []),

  // BEVERAGES - Mojitos
  item('mojito-classique', 'Mojito Classique', 60, 'Menthe et citron vert', ['Menthe', 'Citron vert'], 'beverages', []),
  item('mojito-fruits-rouges', 'Mojito Fruits Rouges', 60, 'Acidulé et gourmand', ['Fruits rouges', 'Menthe'], 'beverages', []),
  item('mojito-bleu', 'Mojito Bleu', 60, 'Originalité et éclat', ['Curaçao', 'Menthe'], 'beverages', []),

  // BEVERAGES - Jus
  item('orange-pressee', 'Orange Pressée', 30, 'Jus d\'orange frais pressé', ['Orange'], 'beverages', ['healthy']),
  item('jus-carotte', 'Jus de Carotte', 40, 'Jus de carotte pressé', ['Carotte'], 'beverages', ['healthy']),
  item('jus-mangue', 'Jus de Mangue', 50, 'Jus de mangue frais', ['Mangue'], 'beverages', ['healthy']),
  item('jus-ananas', 'Jus d\'Ananas', 50, 'Jus d\'ananas frais', ['Ananas'], 'beverages', ['healthy']),

  // BEVERAGES - Detox
  item('green-town', 'Green Town', 65, 'Boisson détox verte', ['Légumes verts', 'Fruits'], 'beverages', ['healthy', 'vegetarian']),
  item('detox-jaune', 'Détox Jaune', 65, 'Boisson détox énergisante', ['Agrumes', 'Gingembre'], 'beverages', ['healthy', 'vegetarian']),
  item('matcha', 'Matcha', 75, 'Thé vert matcha premium', ['Matcha'], 'beverages', ['healthy', 'vegetarian']),

  // BEVERAGES - Milkshakes
  item('milkshake-vanille', 'Vanille Délicate', 70, 'Milkshake vanille crémeux', ['Vanille', 'Lait', 'Glace'], 'beverages', []),
  item('milkshake-fruits-rouges', 'Fruits Rouges Intenses', 70, 'Milkshake fruits rouges', ['Fruits rouges', 'Lait'], 'beverages', []),
  item('milkshake-oreo', 'Oreo Croquant', 70, 'Milkshake Oreo', ['Oreo', 'Lait', 'Glace'], 'beverages', []),

  // BEVERAGES - Eaux
  item('sidi-ali-50', 'Sidi Ali 50cl', 20, 'Eau minérale', ['Eau'], 'beverages', []),
  item('sidi-ali-75', 'Sidi Ali 75cl', 35, 'Eau minérale', ['Eau'], 'beverages', []),
  item('san-pellegrino', 'San Pellegrino', 45, 'Eau gazeuse italienne', ['Eau gazeuse'], 'beverages', []),
  item('soda', 'Sodas', 30, 'Tous les sodas', ['Soda'], 'beverages', []),
];

// Helper functions
export const getMenuByCategory = (category: MenuItem['category']) => 
  menuItems.filter(item => item.category === category);

export const getSignatureItems = () => 
  menuItems.filter(item => item.isSignature);

export const searchMenu = (query: string) => {
  const q = query.toLowerCase();
  return menuItems.filter(item => 
    item.name.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.ingredients.some(ing => ing.toLowerCase().includes(q))
  );
};

export const filterByTags = (tags: MenuItem['tags']) => 
  menuItems.filter(item => tags.every(tag => item.tags.includes(tag)));

export const getPriceRange = (): [number, number] => {
  const prices = menuItems.map(item => item.price);
  return [Math.min(...prices), Math.max(...prices)];
};
