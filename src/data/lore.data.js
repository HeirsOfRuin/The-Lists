// The Book of Lothmere: what a knight comes to know of his kingdom, and the
// letters that follow him from home. Logic-free.
//
// An entry is known when its `known` condition holds:
//   'start'            — every knight knows it when he rides out
//   { town: id }       — once he has been there
//   { seen: kind }     — once he has seen it (melee, barriers, pas, greatpas,
//                        trial, helmshow, war, vow, popinjay, race, order)
//   { flag: f }        — once a story thread has reached it
//   { beat: key }      — once the realm's story has reached that beat
// `more` adds paragraphs as the story moves on, on the same conditions.

export const LORE_SECTIONS = [
  { id: 'kingdom', title: 'The kingdom', blurb: 'Its history, and the peace your master’s generation made.' },
  { id: 'powers', title: 'The powers', blurb: 'The people whose quarrels decide what happens to everybody else.' },
  { id: 'places', title: 'Places', blurb: 'The towns of the circuit. You learn a place by going there.' },
  { id: 'customs', title: 'Customs of the lists', blurb: 'What the heralds expect, and what the songs leave out. You learn them by seeing them.' },
];

export const LORE = [
  // -------------------------------------------------------------------------
  // The kingdom
  // -------------------------------------------------------------------------
  {
    id: 'lothmere', section: 'kingdom', title: 'Lothmere', known: 'start',
    text: 'A kingdom of three provinces between the Scarrow hills and the Narrow Sea: the Harrow March in the north, horse country and hard; Kingsmead, the crown’s province around the capital; and the Saltings, the merchant coast. Its name comes from the mere below the palace at Kingsmead, where, the song says, King Lothar the Founder threw his sword into the water on the day he made peace with the last of his enemies, and swore that no king of Lothmere would need another. His successors have needed a great many.',
  },
  {
    id: 'scarrowWar', section: 'kingdom', title: 'The Scarrow War', known: 'start',
    text: 'The war your master’s generation fought. For thirteen years the King of Scarrow’s men came down out of the northern hills into the March, burned it, were driven back, and came again. Castle Brede held a two-year siege. Hollin Moor was held through a winter by forty men. It ended at Wystan’s Ford twenty years ago, when King Aldric, then in his prime, met the King of Scarrow in the chapter house of St Wystan’s and they swore a peace on the saint’s own bones. The March has not forgotten, and neither has Scarrow.',
  },
  {
    id: 'kingsPeace', section: 'kingdom', title: 'The King’s Peace', known: 'start',
    text: 'After the treaty, Lothmere was full of armed men with nothing to do: household knights, captains of free companies, lords who had grown used to raising men. King Aldric’s answer was the circuit. He licensed tourneys, gave the College of Heralds charge of them, and let the lords spend on lances what they would otherwise have spent on each other. It has kept the peace for twenty years. The Church says it has also filled the churchyards.',
  },
  {
    id: 'circuit', section: 'kingdom', title: 'The circuit', known: 'start',
    text: 'Every Candlemas the heralds publish the year: the King’s Tourney at Midsummer, the two great houses’ tourneys, a handful of regional lords’ tourneys, and more local jousts than anyone could ride. A knight of the circuit lives on his prizes, his patron and his credit, and chooses where to ride as a merchant chooses a market. Most of them end poorer than they began. The songs are about the others.',
  },
  {
    id: 'ambryCrossTourney', section: 'kingdom', title: 'The tourney at Ambry Cross', known: 'start',
    text: 'To celebrate the peace, the Duke of Aumbry held a great tourney at Ambry Cross. On the third day a lance struck the horse of the Duke’s younger brother, Lord Ranulf, and the horse went down and crushed him. The heralds judged the lance to be Sir Osbert Grayle’s, and the king took his spurs with his own hands. The Duke has built a chapel over the place where his brother died. He has never said what he believes about that day.',
    more: [
      { known: { flag: 'culpritKnown' }, text: 'You know now that it was not Sir Osbert’s lance.' },
      { known: { flag: 'masterCleared' }, text: 'Sir Osbert has his spurs again, and the heralds have written into their rolls whose lance it was.' },
    ],
  },
  {
    id: 'princeEdmund', section: 'kingdom', title: 'The death of Prince Edmund', known: 'start',
    text: 'The king’s only son was a fine lance at nineteen. Eleven years ago, at the King’s Tourney, a splinter went through the sight of his helm, and he died in the pavilion before the heralds had cried the next course. The king has not watched a course since. The King’s Tourney is still held every Midsummer, by his order, and the Constable presides.',
  },
  {
    id: 'succession', section: 'kingdom', title: 'The succession', known: 'start',
    text: 'King Aldric is sixty-seven, and his only living child is a daughter. By blood the crown is the Princess Isabeau’s. By the old custom of the male line it is his cousin’s, Duke Robert of Aumbry. The king has not said which, and has sealed a will that nobody has read.',
    more: [
      { known: { beat: 'y5m6' }, text: 'Since the king fell at mass, a council of regency rules in his name: the Duke, the Earl of Stane, and the Archbishop between them.' },
      { known: { beat: 'y9m9' }, text: 'Both houses have demanded oaths of every knight in Lothmere. The Crown’s household has sworn to the sealed will.' },
      { known: { seen: 'war' }, text: 'The king died on Lady Day of the tenth year. His will was read, and the realm went to war over it the same night.' },
    ],
  },
  {
    id: 'scarrow', section: 'kingdom', title: 'Scarrow', known: 'start',
    text: 'The kingdom beyond the northern hills: stone towns, black cattle, and a king who signed the peace at Wystan’s Ford and a son who did not. Scarrow raiders still come over the March in lean years. The treaty calls them cattle-thieves, so that nobody need call it a war.',
  },
  {
    id: 'arle', section: 'kingdom', title: 'Arle, across the Narrow Sea', known: { seen: 'grand' },
    text: 'The Duchy of Arle holds the richest tourneys in Christendom, and sends knights to the King’s Tourney every Midsummer to show Lothmere how it is done. Its duke is said to have jousted in a coat of cloth of gold with bells on it. Lothmere sells Arle its wool, buys back its harness, and resents both.',
  },

  // -------------------------------------------------------------------------
  // The powers
  // -------------------------------------------------------------------------
  {
    id: 'king', section: 'powers', title: 'King Aldric the Second', known: 'start',
    text: 'Sixty-seven, and king for forty-one years. He won the Scarrow War, made the peace, and made the circuit to keep it. Since his son’s death he has grown hard to reach. He is said to spend his evenings with the treaty of Wystan’s Ford and an old hound that was the prince’s.',
    more: [
      { known: { beat: 'y5m6' }, text: 'He fell at mass on Whitsunday in the fifth year of your knighthood. He lives, but he does not rule.' },
      { known: { seen: 'war' }, text: 'He died on Lady Day of the tenth year.' },
    ],
  },
  {
    id: 'isabeau', section: 'powers', title: 'The Princess Isabeau', known: 'start',
    text: 'The king’s daughter, twenty-six. She reads Vegetius on the art of war, rides to hounds as hard as her father once did, and says nothing in council that she has not thought about first. The Earl of Stane has asked for her hand for his heir.',
    more: [{ known: { beat: 'y2m4' }, text: 'She married Lord Geoffrey of Stane at Kingsmead in the second year of your knighthood. The Duke of Aumbry sent a silver ewer, and did not come.' }],
  },
  {
    id: 'aumbry', section: 'powers', title: 'Duke Robert of Aumbry', known: 'start',
    text: 'The king’s cousin, and the richest man in Lothmere, lord of the western lands from Ambry Cross to the sea. He spends on tourneys what other lords spend on castles, and he has quietly paid a great many knights’ debts. His brother Lord Ranulf died in his own lists. His livery is blue and silver; his motto is “I Hold.”',
    more: [{ known: { beat: 'y3m5' }, text: 'His masons have built a new gatehouse at Ambry Cross, facing the Kingsmead road.' }],
  },
  {
    id: 'stane', section: 'powers', title: 'Godwin, Earl of Stane', known: 'start',
    text: 'Warden of the March, who held Castle Brede for two years against Scarrow and has not forgiven anyone who was not there. Black and gold, and the motto “Stand Fast.” His heir, Lord Geoffrey, is a better courtier than soldier, which his father says often, and in public.',
  },
  {
    id: 'constable', section: 'powers', title: 'The Constable of Lothmere', known: 'start',
    text: 'Sir Hugh Marwood, the king’s Constable, who wrote the Constable’s Ordinance by which every tilt in Lothmere is scored, and who has presided at the King’s Tourney since the prince died. He has never been seen to smile at a joust, and never been known to get a score wrong.',
  },
  {
    id: 'heralds', section: 'powers', title: 'The College of Heralds', known: 'start',
    text: 'The heralds proclaim the tourneys, keep the rolls, prove the arms of every knight who rides, and publish the Roll of Arms at Candlemas. They are led by Lothmere King of Arms, Master Piers Cantle, who has a memory for every quartering in the kingdom and every penny a knight owes a herald. A knight the heralds like is cried louder.',
  },
  {
    id: 'church', section: 'powers', title: 'The Church', known: 'start',
    text: 'Archbishop Anselm of Kingsmead holds that the tourney is a sin, says so every Lent, and blesses the lists at Midsummer because the king asks him to. The shrine of St Wystan at the ford is where a knight goes to mend a name. The priory at Fennick is where he goes to be forgotten.',
  },
  {
    id: 'guilds', section: 'powers', title: 'The guilds', known: 'start',
    text: 'Port Lessing, Saltings Quay and Kingsmead are chartered cities, run by their guilds. The Guild of St Barbara at Port Lessing, armourers and founders, pays for more tourneys than any lord, because every lance broken is a lance sold. The guilds lend the Crown money, and remember every penny of it.',
  },
  {
    id: 'swan', section: 'powers', title: 'The Company of the Swan', known: 'start',
    text: 'King Aldric founded the Company after the war: twenty-four companions, sworn never to flee a field, never to bear arms against one another, and to keep their names without reproach. Eight seats are held by the great lords of the realm; the other sixteen by knights. They keep their chapter at Kingsmead at Candlemas. A stall falls empty only by death or disgrace, and the companions choose who fills it: each names one knight, and the king breaks a tie. A companion put out for disgrace has his helm thrown into the ditch below the chapel.',
    more: [
      { known: { seen: 'order' }, text: 'You have stood before the chapter. Each companion names his man aloud, and the heralds keep the tally on a slate where everyone can see it. The lords vote for their houses. The knights vote for renown, for their friends, and against the men who have beaten them.' },
      { known: { beat: 'y6m3' }, text: 'Since the great houses forbade their men to ride against each other, the companions sit in chapter by house, and the king’s men sit between them.' },
      { known: { seen: 'war' }, text: 'When the war came, most of the knights of the Company kept their oath and would not take the field against a brother companion. Some called it honour. Both claimants called it something else.' },
    ],
  },

  // -------------------------------------------------------------------------
  // Places
  // -------------------------------------------------------------------------
  {
    id: 'wystansFord', section: 'places', title: 'Wystan’s Ford', known: { town: 'wystansFord' },
    text: 'A pilgrim town at the ford of the Harrow. The shrine keeps St Wystan’s bones, and the chapter house beside it the table where the peace was signed. Every inn is named for one of the saint’s miracles. A knight with a name to mend walks the last three miles barefoot, and the town sells him the shoes afterwards.',
  },
  {
    id: 'castleBrede', section: 'places', title: 'Castle Brede', known: { town: 'castleBrede' },
    text: 'The Earl of Stane’s seat on the March: a grey castle on a grey hill that held two years against Scarrow. The banners taken in the war still hang in the great hall, and the Earl seats his guests beneath them so that nobody forgets whose they were.',
  },
  {
    id: 'othery', section: 'places', title: 'Othery', known: { town: 'othery' },
    text: 'A market town on the downs, and the Othery horse fair every Michaelmas, where the March herds are sold and the horse-copers race on the downs for a purse. Half the destriers in Lothmere were foaled within a day’s ride. Everyone in Othery will tell you what your horse is worth, and it is always less than you paid.',
  },
  {
    id: 'hollinMoor', section: 'places', title: 'Hollin Moor', known: { town: 'hollinMoor' },
    text: 'High moorland where four roads cross. In the war Sir Warin Hollin held it through a winter with forty men. There is a spring there in a stone basin called the Weeping Fountain, after a lady who waited at it through that winter for a husband who did not come back.',
  },
  {
    id: 'ambryCross', section: 'places', title: 'Ambry Cross', known: { town: 'ambryCross' },
    text: 'The Duke of Aumbry’s seat: a market cross, a tiltyard of white stone built by his grandfather, and a castle that has lately grown a new gatehouse. The tilt runs beside the chapel the Duke built where his brother died, and the knights who ride there cross themselves as they pass it.',
  },
  {
    id: 'kingsmead', section: 'places', title: 'Kingsmead', known: { town: 'kingsmead' },
    text: 'The capital, on the mere that gave the kingdom its name: the palace, the cathedral, the College of Heralds, and the great lists in the Queen’s Meadow where the King’s Tourney is run at Midsummer. Everything in Kingsmead costs twice what it costs anywhere else, advice included.',
  },
  {
    id: 'sallowfield', section: 'places', title: 'Sallowfield', known: { town: 'sallowfield' },
    text: 'Willow country and water meadows on the king’s side of the river. Its bowyers are the best in Lothmere and its butts are full every Sunday. The road to the capital runs through it, so everyone who wants something from the king stops here first and practises asking.',
  },
  {
    id: 'queenshythe', section: 'places', title: 'Queenshythe', known: { town: 'queenshythe' },
    text: 'A river port where the late Queen Maud landed on the day she came to marry the king. There is a market on the quays every day and a fair at St James. The knights of Kingsmead ride out from here in the spring, and come back here in the autumn to count what is left.',
  },
  {
    id: 'fennick', section: 'places', title: 'Fennick', known: { town: 'fennick' },
    text: 'A fen town at the end of a long road: eel-traps, reed thatch, and a small priory of Austin canons on an island in the mere. Men go to Fennick when they do not want to be found. Sir Osbert Grayle went there.',
  },
  {
    id: 'merrow', section: 'places', title: 'Merrow', known: { town: 'merrow' },
    text: 'A wool town among the sheep downs, where the Saltings’ fleeces are weighed and sold. Its green holds a joust every spring for the wool merchants’ sons, and every man in Merrow can tell you the price of a sack of wool to the penny, and what it was last year.',
  },
  {
    id: 'saltingsQuay', section: 'places', title: 'Saltings Quay', known: { town: 'saltingsQuay' },
    text: 'Salt pans and fish sheds on the grey coast, and the crossbowmen’s guild of St Sebastian, whose popinjay shoot in May draws half the coast. The man who brings the wooden bird down from its pole is King of the Popinjay for a year, and drinks free in every tavern in the town.',
  },
  {
    id: 'portLessing', section: 'places', title: 'Port Lessing', known: { town: 'portLessing' },
    text: 'The great port of Lothmere, where the ships from Arle come in. The Guild of St Barbara has its hall on the quay, and the sound of its hammers carries across the harbour from dawn. The city pays for its own tourneys, keeps its own counsel, and lends to both sides of every quarrel at the same rate.',
  },

  // -------------------------------------------------------------------------
  // Customs of the lists
  // -------------------------------------------------------------------------
  {
    id: 'ordinance', section: 'customs', title: 'The Constable’s Ordinance', known: 'start',
    text: 'How a tilt is scored in Lothmere: a lance broken fair on the body or shield, one; on the helm, two; a man borne to the ground loses outright. A lance on the tilt costs a point, and a lance on the horse costs the bout and the rider’s name. Three courses, two more if level, and then the heralds decide. Sir Hugh Marwood wrote it after the prince died, to make a joust a thing a man could lose without dying.',
  },
  {
    id: 'largesse', section: 'customs', title: 'Largesse', known: 'start',
    text: 'A knight is expected to be generous: to the heralds who cry his name, the minstrels who sing it, and the poor at the gate of the lists. A knight who wins a prize and keeps all of it is remembered for that, and not kindly.',
  },
  {
    id: 'helmshow', section: 'customs', title: 'The helm-show', known: { seen: 'helmshow' },
    text: 'On the eve of a great tourney every knight’s helm and crest are set out in the cloister for the ladies to see. A lady may touch the helm of a knight who has wronged a lady, and the heralds must hear her. René of Anjou wrote that such a knight should be beaten. In Lothmere he is merely ruined.',
  },
  {
    id: 'recet', section: 'customs', title: 'The recet', known: { seen: 'melee' },
    text: 'The roped ground at each end of the tourney field, where a knight may rest and cannot be taken. Men have spent a whole mêlée in it. The heralds write their names down.',
  },
  {
    id: 'ransom', section: 'customs', title: 'Ransom', known: { seen: 'melee' },
    text: 'A knight taken in the mêlée owes his captor his horse and harness, and buys them back with money. The Marshal of the old songs took a hundred and three knights in ten months, and kept a kitchen clerk to count them. A knight who lets his prisoners go for nothing is sung about too, for a shorter time.',
  },
  {
    id: 'barriers', section: 'customs', title: 'The barriers', known: { seen: 'barriers' },
    text: 'Foot combat across a barrier at the waist, with pollaxes, under articles that set the number of strokes. A man driven to his knee or disarmed has lost. It came to Lothmere from Arle, with the fashion for fighting on foot, and the old knights of the March still call it dancing.',
  },
  {
    id: 'pas', section: 'customs', title: 'The pas d’armes', known: { seen: 'pas' },
    text: 'A knight who holds a passage against all comers, a bridge, a gate or a fountain, hangs his shields where comers can touch them, and a comer who touches one must fight him on its terms. Jacques de Lalaing held the Fountain of Tears at Chalon for a year. Lothmere’s knights hold bridges for an afternoon, and are known for it for a lifetime.',
  },
  {
    id: 'greatpas', section: 'customs', title: 'The Great Pas', known: { seen: 'greatpas' },
    text: 'Once in a generation the first lance of the realm holds a pas for a month, and every knight of name comes to touch his shields. The book of the pas lists every comer. Knights who were not there spend the rest of their lives explaining why.',
  },
  {
    id: 'trial', section: 'customs', title: 'Trial by combat', known: { seen: 'trial' },
    text: 'When a charge cannot be proved, the Court of Chivalry may leave it to God. The two men fight à outrance before the judges of the field, and the king may throw down his baton to end it. The loser, if he lives, is proved false; if he does not, the matter is settled all the same.',
  },
  {
    id: 'vows', section: 'customs', title: 'Vows', known: { seen: 'vow' },
    text: 'Knights take vows as merchants take wagers: to break so many lances before Michaelmas, to bear so many men to the ground, to wear a fetter on the leg every Thursday until some feat is done. Suero de Quiñones vowed to break three hundred lances at a bridge, and wore an iron collar for a lady until he had. In Lothmere the vows are made at the Candlemas feast, on two swans brought in on a silver dish, as King Aldric’s grandfather’s knights made them before the old war. A vow kept is renown. A vow broken is talked about longer.',
  },
  {
    id: 'popinjay', section: 'customs', title: 'The popinjay', known: { seen: 'popinjay' },
    text: 'A wooden bird on a tall pole, shot at with crossbows by the guild of St Sebastian and any gentleman they admit. Feathers count for little; the man who brings the whole bird down is King of the Popinjay. The March knights say it is no sport for a knight. The coast knights say the March knights cannot hit it.',
  },
  {
    id: 'race', section: 'customs', title: 'The Downs Race', known: { seen: 'race' },
    text: 'At the Othery horse fair the horse-copers race over two miles of down to show what their horses can do, and any gentleman may enter his own. The prize is a purse, and a better price for the horse. Nobody who has seen it thinks the copers’ horses are the ones they sell.',
  },
  {
    id: 'war', section: 'customs', title: 'Knights at war', known: { seen: 'war' },
    text: 'Every lance on the circuit was a lance a lord could call on. When the war came, the heralds put away the calendar and took out the muster rolls, and the men who had jousted against each other at Midsummer met in a valley with sharp lances and no ordinance at all.',
  },
];

// What happened in the kingdom this year, besides the tourneys. Two a year,
// drawn without repeating. `when`: peace (before the king dies), war, after
// (the new reign); `minTension` for the ones that are signs of what is coming.
export const WORLD_EVENTS = [
  { text: 'A comet hung over the March for nine nights. The Earl of Stane’s astrologer said it meant nothing, which nobody believed.' },
  { text: 'The harvest failed in the Saltings, and bread doubled in price at Merrow before Martinmas.' },
  { text: 'Fire took the bowyers’ street at Sallowfield. The king sent timber; the bowyers sent him a bow.' },
  { text: 'The Guild of St Barbara cast a great bell for Port Lessing, named it Barbara, and hung it where every ship in the harbour could hear it.' },
  { text: 'Twelve knights of Arle crossed the Narrow Sea for the King’s Tourney. Eight of them went home with their horses.' },
  { text: 'Scarrow raiders burned three farms above Othery. The Earl’s men followed them to the hills and no farther, as the treaty requires.' },
  { text: 'The Archbishop preached against tourneys all through Lent, and blessed the lists at Kingsmead at Midsummer.' },
  { text: 'A whale came ashore at Fennick. The canons of the priory claimed it, and so did the town, and the Crown took it.' },
  { text: 'A destrier sold at the Othery fair for sixty pounds, a price men will be talking about for years.' },
  { text: 'Master Piers Cantle, King of Arms, finished a new roll of every coat of arms in Lothmere, and found three knights bearing arms they had no right to.' },
  { text: 'A wet summer. The lists at Queenshythe were under water at St James, and the joust was run in the market place.' },
  { text: 'Wool fetched a good price at Merrow, and every merchant on the coast bought his wife a new gown.' },
  { text: 'The heralds of Kingsmead quarrelled with the heralds of Ambry Cross over whose roll was the true one. The King of Arms settled it by burning both.' },
  { text: 'A stone bridge was finished over the Harrow at Wystan’s Ford, paid for with pilgrims’ pennies.' },
  { text: 'A ship of Port Lessing came home from Arle with a cargo of harness, a unicorn’s horn, and a sick crew. Only the harness was genuine.' },
  { text: 'The canons of Fennick priory were given a relic of St Wystan’s finger, and the shrine at the ford denied he had ever lost one.' },
  { text: 'A hard winter. Wolves were seen on Hollin Moor for the first time since the war.' },
  { text: 'The king did not ride to hounds this year, for the first time anyone can remember.', minTension: 30, when: 'peace' },
  { text: 'The Duke of Aumbry bought the wardship of three orphaned heirs of the March, and with it the use of their lands.', minTension: 30, when: 'peace' },
  { text: 'Stane and Aumbry both sent gifts to the Archbishop at Easter. The Archbishop sent both back.', minTension: 45, when: 'peace' },
  { text: 'The Company of the Swan kept its feast at Candlemas. The king did not come, and the companions sat on either side of the hall by house.', minTension: 55, when: 'peace' },
  { text: 'The Guild of St Barbara sold more harness this year than in any year since the war, and would not say to whom.', minTension: 65, when: 'peace' },
  { text: 'Scarrow sent an embassy to Kingsmead to ask after the king’s health, which nobody at court had asked it to do.', minTension: 70, when: 'peace' },
  { text: 'Both armies foraged the March bare. There will be no horse fair at Othery this year.', when: 'war' },
  { text: 'The guilds of Port Lessing shut the city gates and would open them to neither side.', when: 'war' },
  { text: 'The Archbishop ordered the bells of every church rung for peace on the Sunday after the battle. Most of them rang for the dead instead.', when: 'war' },
  { text: 'The Scarrow sent envoys to the new crown, to ask whether the peace of Wystan’s Ford still held. They were told it did.', when: 'after' },
  { text: 'The heralds published the calendar again at Candlemas, for the first time since the war, and every inn in Kingsmead was full for a week.', when: 'after' },
  { text: 'The new crown’s treasurer counted what the war had cost, and every lord who owed the Crown money became very polite.', when: 'after' },
];

// Letters that come in winter. Who writes depends on who you are; what they
// write depends on how the year went. {you} {lady} {master} are filled in.
export const WRITERS = {
  eldest: { who: 'Your father', sign: 'Your father' },
  younger: { who: 'Your eldest brother', sign: 'Your brother, who holds the hall' },
  bastard: { who: 'Your father', sign: 'Your father, who owned you' },
  fallen: { who: 'Old Hamo, your family’s last steward', sign: 'Hamo, at the hall' },
};
// Moods, in the order they are tried: the first whose test holds is the one written.
export const LETTERS = {
  home: {
    disgraced: [
      'We have heard what they are saying about you in Kingsmead. I will not repeat it. I will only say that your name is also mine.',
      'Men who owe me nothing have written to tell me what you did. Mend it. I do not care how.',
    ],
    champion: [
      'A herald stopped at our gate on his way north and told the whole hall about you. Your mother cried. I did not, but I gave the herald a good dinner.',
      'They are singing your name in taverns I would not let you enter. Well done. Come home at Christmas and let me hear it from you.',
    ],
    rising: [
      'Your name was on the Roll at Candlemas, higher than last year. Keep on. Keep your horse sound and your purse shut.',
      'The steward says you are being talked of. I told him that is what happens to knights who win, and that you would not let it go to your head.',
    ],
    poor: [
      'You write that the purse is thin. It was thin when I was your age too, and I did not write to my father about it. There is a little enclosed. Do not tell your brothers.',
      'Money is short everywhere this year. Take service if you must; there is no shame in it, only in debt.',
    ],
    quiet: [
      'A quiet year, from what we hear. There is no harm in a quiet year. There is harm in two.',
      'The roof on the east range leaks again, the harvest was middling, and the dog had puppies. Write more often.',
    ],
    war: [
      'We pray for you every night, and for the side you chose, though I will not write here which side that is.',
      'The March is full of soldiers of both sides and I cannot tell you which are worse. Come home alive. That is all.',
    ],
  },
  master: {
    proud: ['I watched you ride at {town}. You held your seat better than I ever did, and I will deny I said so.', 'They tell me you are winning. Remember that every man you beat has a squire who is watching you as you watched me.'],
    worried: ['They tell me you are doing badly. So did I, my first years. Keep your horse fresh and your lance low, and come and see me if you need to.'],
    fennick: ['The canons feed me well and ask me nothing. I hear your name sometimes from travellers, and I light a candle for you, which you may laugh at.', 'The fens are quiet. I think about Ambry Cross less than I did. I think about you more.'],
  },
  lady: {
    promised: ['My father asks when you will have a hall to bring me to. I tell him soon. Do not make me a liar.', 'I have your letter by me as I write. The ladies here say a knight who writes so well cannot joust. Prove them wrong.'],
    married: ['The manor is in good order and the steward is a thief, which I have told him. Come home for the winter. I have a great deal to say to you.'],
    secret: ['No name, no seal. You know my hand. I watched you at the tourney from the gallery and could not say a word to you, and did not need to.'],
  },
};
