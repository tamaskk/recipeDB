/**
 * Example Recipe data demonstrating the Recipe model structure
 * This file shows how to create a recipe with multilingual support
 */

import { Recipe, Language } from './recipe';

export const exampleRecipe: Recipe = {
  // Identification
  id: 'recipe-001',
  slug: [
    { language: 'en', text: 'classic-chocolate-chip-cookies' },
    { language: 'de', text: 'klassische-schokoladenkekse' },
    { language: 'nl', text: 'klassieke-chocoladekoekjes' },
    { language: 'hu', text: 'klasszikus-csokolades-suti' },
    { language: 'fr', text: 'biscuits-aux-puces-de-chocolat-classiques' },
    { language: 'es', text: 'galletas-clasicas-de-chips-de-chocolate' },
    { language: 'pt', text: 'biscoitos-classicos-de-chocolate' },
  ],

  // Basic information
  name: [
    { language: 'en', text: 'Classic Chocolate Chip Cookies' },
    { language: 'de', text: 'Klassische Schokoladenkekse' },
    { language: 'nl', text: 'Klassieke Chocoladekoekjes' },
    { language: 'hu', text: 'Klasszikus Csokoládés Sütemény' },
    { language: 'fr', text: 'Biscuits aux Pépites de Chocolat Classiques' },
    { language: 'es', text: 'Galletas Clásicas de Chips de Chocolate' },
    { language: 'pt', text: 'Biscoitos Clássicos de Chocolate' },
  ],

  description: [
    {
      language: 'en',
      text: 'A timeless classic cookie recipe that yields soft, chewy cookies with perfect chocolate distribution.',
    },
    {
      language: 'de',
      text: 'Ein zeitloser klassischer Keksrezept, der weiche, zähe Kekse mit perfekter Schokoladenverteilung ergibt.',
    },
    {
      language: 'nl',
      text: 'Een tijdloos klassiek koekjesrecept dat zachte, taaie koekjes oplevert met perfecte chocoladeverdeling.',
    },
    {
      language: 'hu',
      text: 'Egy időtlen klasszikus süteményrecept, amely puha, rágós süteményeket ad tökéletes csokoládé elosztással.',
    },
    {
      language: 'fr',
      text: 'Une recette de biscuits classique intemporelle qui donne des biscuits moelleux et fondants avec une distribution parfaite du chocolat.',
    },
    {
      language: 'es',
      text: 'Una receta clásica de galletas atemporal que produce galletas suaves y masticables con una distribución perfecta de chocolate.',
    },
    {
      language: 'pt',
      text: 'Uma receita clássica de biscoitos atemporal que produz biscoitos macios e mastigáveis com distribuição perfeita de chocolate.',
    },
  ],

  info: [
    {
      language: 'en',
      text: 'Best served warm with a glass of cold milk. Store in an airtight container for up to 5 days.',
    },
    {
      language: 'de',
      text: 'Am besten warm mit einem Glas kalter Milch serviert. In einem luftdichten Behälter bis zu 5 Tage aufbewahren.',
    },
    {
      language: 'nl',
      text: 'Het beste warm geserveerd met een glas koude melk. Bewaar in een luchtdichte container tot 5 dagen.',
    },
    {
      language: 'hu',
      text: 'Legjobb melegen hideg tejjel. Légmentes tárolóban akár 5 napig is tárolható.',
    },
    {
      language: 'fr',
      text: 'Meilleur servi chaud avec un verre de lait froid. Conserver dans un récipient hermétique jusqu\'à 5 jours.',
    },
    {
      language: 'es',
      text: 'Mejor servido caliente con un vaso de leche fría. Almacenar en un recipiente hermético hasta 5 días.',
    },
    {
      language: 'pt',
      text: 'Melhor servido quente com um copo de leite frio. Armazene em um recipiente hermético por até 5 dias.',
    },
  ],

  // Ingredients
  ingredients: [
    {
      name: [
        { language: 'en', text: 'All-purpose flour' },
        { language: 'de', text: 'Mehl' },
        { language: 'nl', text: 'Bloem' },
        { language: 'hu', text: 'Liszt' },
        { language: 'fr', text: 'Farine tout usage' },
        { language: 'es', text: 'Harina para todo uso' },
        { language: 'pt', text: 'Farinha de trigo' },
      ],
      amount: 2.5,
      unit: [
        { language: 'en', text: 'cups' },
        { language: 'de', text: 'Tassen' },
        { language: 'nl', text: 'kopjes' },
        { language: 'hu', text: 'csésze' },
        { language: 'fr', text: 'tasses' },
        { language: 'es', text: 'tazas' },
        { language: 'pt', text: 'xícaras' },
      ],
      category: [
        { language: 'en', text: 'Grains' },
        { language: 'de', text: 'Getreide' },
        { language: 'nl', text: 'Granen' },
        { language: 'hu', text: 'Gabonafélék' },
        { language: 'fr', text: 'Céréales' },
        { language: 'es', text: 'Granos' },
        { language: 'pt', text: 'Grãos' },
      ],
    },
    {
      name: [
        { language: 'en', text: 'Chocolate chips' },
        { language: 'de', text: 'Schokoladenstückchen' },
        { language: 'nl', text: 'Chocoladeschilfers' },
        { language: 'hu', text: 'Csokoládé darabok' },
        { language: 'fr', text: 'Pépites de chocolat' },
        { language: 'es', text: 'Chips de chocolate' },
        { language: 'pt', text: 'Gotas de chocolate' },
      ],
      amount: 2,
      unit: [
        { language: 'en', text: 'cups' },
        { language: 'de', text: 'Tassen' },
        { language: 'nl', text: 'kopjes' },
        { language: 'hu', text: 'csésze' },
        { language: 'fr', text: 'tasses' },
        { language: 'es', text: 'tazas' },
        { language: 'pt', text: 'xícaras' },
      ],
      category: [
        { language: 'en', text: 'Sweets' },
        { language: 'de', text: 'Süßigkeiten' },
        { language: 'nl', text: 'Zoetigheden' },
        { language: 'hu', text: 'Édességek' },
        { language: 'fr', text: 'Sucreries' },
        { language: 'es', text: 'Dulces' },
        { language: 'pt', text: 'Doces' },
      ],
    },
    {
      name: [
        { language: 'en', text: 'Vanilla extract' },
        { language: 'de', text: 'Vanilleextrakt' },
        { language: 'nl', text: 'Vanille-extract' },
        { language: 'hu', text: 'Vanília kivonat' },
        { language: 'fr', text: 'Extrait de vanille' },
        { language: 'es', text: 'Extracto de vainilla' },
        { language: 'pt', text: 'Extrato de baunilha' },
      ],
      amount: 1,
      unit: [
        { language: 'en', text: 'teaspoon' },
        { language: 'de', text: 'Teelöffel' },
        { language: 'nl', text: 'theelepel' },
        { language: 'hu', text: 'teáskanál' },
        { language: 'fr', text: 'cuillère à café' },
        { language: 'es', text: 'cucharadita' },
        { language: 'pt', text: 'colher de chá' },
      ],
      isOptional: true,
      category: [
        { language: 'en', text: 'Spices' },
        { language: 'de', text: 'Gewürze' },
        { language: 'nl', text: 'Kruiden' },
        { language: 'hu', text: 'Fűszerek' },
        { language: 'fr', text: 'Épices' },
        { language: 'es', text: 'Especias' },
        { language: 'pt', text: 'Temperos' },
      ],
    },
  ],

  // Steps
  steps: [
    {
      stepNumber: 1,
      instructions: [
        {
          language: 'en',
          text: 'Preheat oven to 375°F (190°C). Line baking sheets with parchment paper.',
        },
        {
          language: 'de',
          text: 'Ofen auf 190°C vorheizen. Backbleche mit Backpapier auslegen.',
        },
        {
          language: 'nl',
          text: 'Verwarm de oven voor op 190°C. Bekleed bakplaten met bakpapier.',
        },
        {
          language: 'hu',
          text: 'Melegítsd elő a sütőt 190°C-ra. Béleld ki a tepsiket sütőpapírral.',
        },
        {
          language: 'fr',
          text: 'Préchauffer le four à 190°C. Tapisser les plaques à pâtisserie de papier sulfurisé.',
        },
        {
          language: 'es',
          text: 'Precalentar el horno a 190°C. Forrar las bandejas para hornear con papel pergamino.',
        },
        {
          language: 'pt',
          text: 'Pré-aqueça o forno a 190°C. Forre as assadeiras com papel manteiga.',
        },
      ],
      timeMinutes: 5,
    },
    {
      stepNumber: 2,
      instructions: [
        {
          language: 'en',
          text: 'In a large bowl, cream together butter and sugars until light and fluffy.',
        },
        {
          language: 'de',
          text: 'In einer großen Schüssel Butter und Zucker schaumig schlagen, bis hell und luftig.',
        },
        {
          language: 'nl',
          text: 'In een grote kom boter en suikers romig kloppen tot licht en luchtig.',
        },
        {
          language: 'hu',
          text: 'Egy nagy tálban keverd habosra a vajat és a cukrokat, amíg világos és habos nem lesz.',
        },
        {
          language: 'fr',
          text: 'Dans un grand bol, crémer le beurre et les sucres jusqu\'à ce qu\'ils soient légers et moelleux.',
        },
        {
          language: 'es',
          text: 'En un tazón grande, batir la mantequilla y los azúcares hasta que estén ligeros y esponjosos.',
        },
        {
          language: 'pt',
          text: 'Em uma tigela grande, bata a manteiga e os açúcares até ficarem leves e fofos.',
        },
      ],
      timeMinutes: 3,
    },
  ],

  // Metadata
  difficulty: 3,
  servings: 24,
  servingsUnit: [
    { language: 'en', text: 'cookies' },
    { language: 'de', text: 'Kekse' },
    { language: 'nl', text: 'koekjes' },
    { language: 'hu', text: 'sütemény' },
    { language: 'fr', text: 'biscuits' },
    { language: 'es', text: 'galletas' },
    { language: 'pt', text: 'biscoitos' },
  ],

  // Time
  time: {
    prepMinutes: 15,
    cookMinutes: 10,
    totalMinutes: 25,
  },

  // Nutritional information
  macros: {
    calories: 4800, // Total for recipe
    protein: 48,
    carbohydrates: 600,
    fat: 240,
    saturatedFat: 120,
    fiber: 24,
    sugar: 360,
    sodium: 1200,
  },
  macrosPerServing: {
    calories: 200, // Per cookie
    protein: 2,
    carbohydrates: 25,
    fat: 10,
    saturatedFat: 5,
    fiber: 1,
    sugar: 15,
    sodium: 50,
  },

  // Categorization
  mealType: 'dessert',
  cuisineType: 'american',
  tags: [
    [
      { language: 'en', text: 'sweet' },
      { language: 'de', text: 'süß' },
      { language: 'nl', text: 'zoet' },
      { language: 'hu', text: 'édes' },
      { language: 'fr', text: 'sucré' },
      { language: 'es', text: 'dulce' },
      { language: 'pt', text: 'doce' },
    ],
    [
      { language: 'en', text: 'baking' },
      { language: 'de', text: 'backen' },
      { language: 'nl', text: 'bakken' },
      { language: 'hu', text: 'sütés' },
      { language: 'fr', text: 'cuisson au four' },
      { language: 'es', text: 'horneado' },
      { language: 'pt', text: 'assar' },
    ],
  ],
  dietaryTags: [],
  cookingMethods: ['baking'],

  // Media
  imageUrl: 'https://example.com/chocolate-chip-cookies.jpg',
  imageUrls: [
    'https://example.com/chocolate-chip-cookies-1.jpg',
    'https://example.com/chocolate-chip-cookies-2.jpg',
  ],

  // Tips
  tips: [
    {
      language: 'en',
      text: 'Don\'t overmix the dough - mix until just combined for the best texture.',
    },
    {
      language: 'de',
      text: 'Den Teig nicht übermischen - nur so lange mischen, bis alles gerade kombiniert ist, für die beste Textur.',
    },
    {
      language: 'nl',
      text: 'Meng het deeg niet te veel - meng tot net gecombineerd voor de beste textuur.',
    },
    {
      language: 'hu',
      text: 'Ne keverd túl a tésztát - csak addig keverd, amíg össze nem keveredik a legjobb textúráért.',
    },
    {
      language: 'fr',
      text: 'Ne pas trop mélanger la pâte - mélanger jusqu\'à ce qu\'elle soit juste combinée pour la meilleure texture.',
    },
    {
      language: 'es',
      text: 'No mezclar demasiado la masa - mezclar hasta que esté combinada para la mejor textura.',
    },
    {
      language: 'pt',
      text: 'Não misture demais a massa - misture até ficar combinada para a melhor textura.',
    },
  ],

  // Storage
  storage: [
    {
      language: 'en',
      text: 'Store in an airtight container at room temperature for up to 5 days.',
    },
    {
      language: 'de',
      text: 'In einem luftdichten Behälter bei Raumtemperatur bis zu 5 Tage aufbewahren.',
    },
    {
      language: 'nl',
      text: 'Bewaar in een luchtdichte container bij kamertemperatuur tot 5 dagen.',
    },
    {
      language: 'hu',
      text: 'Légmentes tárolóban szobahőmérsékleten akár 5 napig tárolható.',
    },
    {
      language: 'fr',
      text: 'Conserver dans un récipient hermétique à température ambiante jusqu\'à 5 jours.',
    },
    {
      language: 'es',
      text: 'Almacenar en un recipiente hermético a temperatura ambiente hasta 5 días.',
    },
    {
      language: 'pt',
      text: 'Armazene em um recipiente hermético em temperatura ambiente por até 5 dias.',
    },
  ],

  // Timestamps
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  publishedAt: new Date('2024-01-15'),

  // Status
  isPublished: true,
  isFeatured: true,

  // Ratings
  rating: 4.8,
  ratingCount: 1250,
  favoriteCount: 3200,
};

