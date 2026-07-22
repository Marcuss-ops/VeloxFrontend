// Dictionary of common profanities and strong words in different languages
// to ensure text and thumbnail safety compliance.

export const PROFANITY_DICTIONARY: Record<string, string[]> = {
  en: [
    'shit', 'fuck', 'damn', 'hell', 'bitch', 'bastard', 'asshole', 'dick', 'piss',
    'crap', 'suck', 'whore', 'slut', 'cunt', 'cock', 'pussy', 'tits', 'boobs',
    'motherfucker', 'son of a bitch', 'fucker', 'shithead', 'dickhead', 'dumbass',
    'retard', 'idiot', 'moron', 'stupid', 'fucking', 'fucked', 'fucks', 'shits',
    'shitty', 'fucked up', 'bullshit', 'piece of shit'
  ],
  it: [
    'cazzo', 'merda', 'stronzo', 'stronza', 'fanculo', 'culo', 'puttana', 'troia',
    'bastardo', 'bastarda', 'coglione', 'coglioni', 'vaffanculo', 'idiota', 'cretino',
    'cretina', 'pazzo', 'pazza', 'scemo', 'scema', 'frocio', 'finocchio', 'stronzi',
    'leccaculo', 'porco', 'porca', 'troie', 'puttane', 'merdoso'
  ],
  es: [
    'mierda', 'cabron', 'cabrón', 'puta', 'puto', 'pendejo', 'pendeja', 'joder',
    'coño', 'gilipollas', 'maricon', 'maricón', 'hijo de puta', 'chingar', 'chingon',
    'pico', 'concha', 'boludo', 'boluda', 'culiado', 'pajera', 'pajero'
  ],
  fr: [
    'merde', 'putain', 'salope', 'connard', 'connasse', 'chier', 'cul', 'encule',
    'enculé', 'con', 'conne', 'bordel', 'fils de pute', 'bite', 'couille', 'couilles'
  ],
  de: [
    'scheisse', 'scheiße', 'arschloch', 'schlampe', 'hure', 'ficken', 'wichser',
    'miststück', 'scheiss', 'hurensohn', 'verpiss'
  ],
  ru: [
    'блять', 'блядь', 'хуй', 'пизда', 'ебать', 'сука', 'гондон', 'мудак',
    'пидорас', 'уебок', 'уебище', 'заебись', 'хуйня'
  ],
  pt: [
    'merda', 'puta', 'caralho', 'foder', 'filho da puta', 'cabrão', 'porra',
    'cuzão', 'cuzao', 'bicha', 'cagado', 'otario', 'otário'
  ],
  tr: [
    'siktir', 'sik', 'amk', 'amına', 'göt', 'piç', 'yavşak', 'oç',
    'orospu', 'kahpe', 'gerizekalı', 'salak'
  ],
  pl: [
    'kurwa', 'chuj', 'pizda', 'jebac', 'jebać', 'pierdolic', 'pierdolić',
    'suka', 'skurwysyn', 'dupa', 'gowno', 'gówno'
  ]
};

// Flattened list of all profanities across all languages for global checks
export const ALL_PROFANITIES: string[] = Object.values(PROFANITY_DICTIONARY).flat();
