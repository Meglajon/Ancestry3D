// Story mode ("A Battle in Time"): turns a GEDCOM tree into the cast, towns, chapters and missions of the story.
// The plot is the same for every family; the people, places, years, jobs and events come from the file.
// Pure data in, pure data out (no drawing), so it can be tested with node.
import { dateYear, datePhrase } from './gedcom.js';
import { displayName, firstName, findEvent, birthYear, deathYear, relationship, parentsOf, collectAncestors, hashString, seededRandom, lifespan } from './ancestry.js';
import { resolvePlace } from './places.js';

// ---------------- Eras ----------------
export const ERA_NAMES = { modern: 'Present day', retro: 'Post-war', vintage: 'Early 1900s', victorian: 'Victorian', georgian: 'Georgian', early: 'Stuart and before' };
export function eraOf(year) {
  return year >= 1990 ? 'modern' : year >= 1950 ? 'retro' : year >= 1900 ? 'vintage' : year >= 1837 ? 'victorian' : year >= 1714 ? 'georgian' : 'early';
}
const ERA_ARRIVAL = {
  modern: ['Traffic, takeaways and a phone signal.', 'Roadworks, a queue for coffee, and a parking warden already taking an interest.', 'Home. Everything costs more than you remember, and you only left this morning.'],
  retro: ['Coal smoke, corner shops and somebody\'s wireless through an open window.', 'Washing on every line, a football against every wall, and one car on the whole street. Yours.', 'Doorsteps scrubbed white and net curtains twitching. The Heirloom has been noticed.'],
  vintage: ['Trams, flat caps and motor cars that still frighten the horses.', 'A brass band somewhere, a tram bell, and a policeman who has never seen a car this colour.', 'Hats. Everybody has a hat. You feel underdressed from the neck up.'],
  victorian: ['Gas lamps, horse muck and a hundred chimneys.', 'Soot on everything, a hymn from somewhere, and a small boy offering to mind your engine for a penny.', 'Fog, clogs on cobbles, and a smell you decide not to identify.'],
  georgian: ['Mud to the axles, a coach horn somewhere, and not one pavement.', 'A pig in the road. It has right of way and it knows it.', 'Wigs on the gentry, mud on everybody else, and a coachman staring hard at your wheels.'],
  early: ['Thatch, woodsmoke and a church bell. The road is mostly a suggestion.', 'Geese, mud and a great deal of sky. Somebody crosses themselves as you go by.', 'No lamps, no signs, and no glass in half the windows. A dog barks at the Heirloom, then thinks better of it.'],
};

/** What a year looks like as you arrive in it: one of that era's lines, dealt so no two arrivals read the same. */
export function eraArrival(year, deal) {
  const list = ERA_ARRIVAL[eraOf(year)];
  return deal ? deal('era-' + eraOf(year), list) : list[0];
}

// ---------------- Lines that come round more than once ----------------
// Anything said in every chapter is a pack of alternatives (the script's ALT 1, ALT 2...), dealt like shuffled cards:
// one pack per line for the whole story, and nothing comes round again until its pack is empty. The shuffle is seeded
// by the family, so the same story always reads the same way. (IDs in brackets are the script's line IDs.)
function dealer(seed) {
  const rnd = seededRandom(seed), packs = new Map();
  return (id, list) => {
    let p = packs.get(id);
    if (!p || !p.left.length) {
      const left = list.map((_, i) => i);
      for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
      // a fresh pack never opens with the card that closed the last one
      if (p && left.length > 1 && left[left.length - 1] === p.last) [left[0], left[left.length - 1]] = [left[left.length - 1], left[0]];
      p = { left, last: p ? p.last : -1 };
      packs.set(id, p);
    }
    p.last = p.left.pop();
    return list[p.last];
  };
}
const LINES = {
  // [A-02] the narrator at the grey door, every chapter after the first
  door: ['Another century, the same grey door.', 'The brass plate is newer here. The grey is exactly the same.', 'A different roof, a different street, and Mr Lowe\'s same worried face at the window.',
    'You can always find the office. It\'s the one building in town nobody has ever looked at twice.', 'The clerks change with the centuries. The filing does not.', 'Somewhere in this town is a grey room with a lamp burning late. There always is.'],
  // [A-02a] Silas's lead-in to the scheme. x = { name, job, he, him, is, page }
  leadIn: [
    x => `${x.name}. ${x.page}.`,
    x => `Next on the list: ${x.name}. And the page that props ${x.him} up: ${x.page}.`,
    x => `${x.page}. One page, and ${x.name} hangs from it by a thread.`,
    x => `The name is ${x.name}. The record is ${x.page}. Write it down, while there is still something to write.`,
    x => `${x.name}${x.job ? ', ' + x.job : ''}. Nobody of the slightest importance, and yet here ${x.he} ${x.is} in ink. ${x.page}.`,
    x => `Tonight's page: ${x.page}. Tonight's inconvenience: ${x.name}.`,
    x => `${x.name}. Yet another one. They breed like footnotes. ${x.page}.`,
  ],
  // [A-03] Dorothy names the page and the scheme. x = { hero, page, scheme, rel, he, does }
  target: [
    x => `That's the page he's after, ${x.hero}: ${x.page}. And this time it's ${x.scheme}. Get to your ${x.rel} before his men do.`,
    x => `${x.page}, dear. That's the page he wants, and his plan this time is ${x.scheme}. Your ${x.rel} hasn't the faintest idea. Go and be the faintest idea.`,
    x => `I've found his next target: ${x.page}. I'd file this one under ${x.scheme}. Find your ${x.rel}, quickly, before somebody greyer does.`,
    x => `He's after ${x.page} now, and the trick is ${x.scheme}. Nasty little man. Your ${x.rel} needs you, ${x.hero}, though ${x.he} ${x.does}n't know it yet.`,
    x => `Now then. The page is ${x.page}. The plan is ${x.scheme}. The person is your ${x.rel}, and you want to get there first.`,
    x => `It's ${x.page} this time, and it's ${x.scheme}. Honestly, the effort he goes to. Off you go, dear: your ${x.rel} is expecting nobody, so do knock.`,
  ],
  // [B-01] where Dorothy's note turns up, and [B-01a] how it introduces the quiz clue
  noteAt: ['A note in Dorothy\'s hand, pinned where you would see it:', 'A note taped to the steering wheel, in Dorothy\'s small square writing:', 'On the dashboard, a page torn from an archive request form. Dorothy has written on the back:',
    'Tucked behind the sun visor, a note that smells faintly of register ink:', 'A note on the passenger seat, held down with a boiled sweet:', 'Folded into the door pocket, a note with a tea ring on it:',
    'Clipped to the brass dial with a clothes peg, a note in pencil:', 'In the glove box, on the back of an old parking ticket, in Dorothy\'s hand:'],
  remember: ['Something to remember:', 'Keep this in your head:', 'One fact for your pocket:', 'You will be asked, so learn this:', 'Don\'t forget, whatever else you forget:', 'Worth knowing before you knock:', 'And a word to the wise:'],
  // [B-02] [B-03] [B-04] what the ancestor knows of you. x = { He, he, him, his, has, is, does, knows, hero, kid, age }
  stranger: [
    x => `${x.He} ${x.has} never heard of you.`,
    x => `To ${x.him} you are a stranger in odd shoes. Start from there.`,
    x => `${x.He} ${x.does}n't know you from Adam, and Adam at least dressed for the period.`,
    x => `You are nobody to ${x.him} yet. Be a polite nobody.`,
    x => `${x.He} won't know your face, your name or your business. Lead with the name.`,
    x => `As far as ${x.he} ${x.is} concerned you won't be born for a very long time. Don't bring it up.`,
  ],
  knowsChild: [
    x => `Mind: ${x.he} ${x.has} a ${x.kid} called ${x.hero} already, ${x.age}, and as far as ${x.he} ${x.knows} that is not you. Do not try to explain.`,
    x => `Careful: there is already a ${x.hero} in that house, ${x.age}, and it's ${x.his} ${x.kid}. You are a coincidence. Stay a coincidence.`,
    x => `One thing: ${x.his} ${x.kid} ${x.hero} is ${x.age} this year. If you meet a child with your face, do not shake hands. I don't know what happens and I don't want to.`,
  ],
  knowsGrown: [
    x => `Mind: ${x.he} ${x.knows} ${x.hero} perfectly well, and ${x.hero} is ${x.age}. You are a good deal older than that. Say you're a cousin and leave it there.`,
    x => `Awkward: ${x.he} already ${x.knows} a ${x.hero}, ${x.age} and living locally. You are the same person with more miles on. Smile and change the subject.`,
    x => `Take care: the ${x.hero} ${x.he} ${x.knows} is ${x.age}. You look like that ${x.hero} after a hard winter. Don't explain, dear. I explained once, and a man fainted.`,
  ],
  // [B-09] [B-10] [B-11] the ancestor's wary opening. x = { hero, age, doing, hHe, hHim }
  wary: ['Family, you say.', 'Kin of mine? You?', 'A relation. I see. I\'ve a great many relations and I\'ve met them all.', 'One of us, are you? You don\'t dress like one of us.',
    'Family is what they all say when they want something.', 'You\'ll forgive me if I don\'t ask you in just yet.'],
  waryChild: [
    x => `${x.hero}? My ${x.hero} is ${x.age}, and ${x.doing}. You've a look of ${x.hHim}, I'll give you that.`,
    x => `${x.hero}, is it? I've a ${x.hero} of my own, ${x.age}, and ${x.doing}. Same name, same nose. That's a lot of coincidence for one doorstep.`,
    x => `That's my little ${x.hero}'s name, and my little ${x.hero} is ${x.age} and ${x.doing}. You're the spit of the child, only taller and worse dressed.`,
  ],
  waryGrown: [
    x => `You've the very look of my ${x.hero}, only ${x.hHe} is ${x.age} and you are not. A cousin, is it?`,
    x => `Well, you're not my ${x.hero}, because my ${x.hero} is ${x.age} and owes me money. But you've the same face. A cousin?`,
    x => `For a moment I took you for our ${x.hero}. But our ${x.hero} is ${x.age}, and stands up straighter. Some sort of cousin, I suppose.`,
  ],
  // [B-11a] the challenge that leads into the quiz
  challenge: ['Tell me something only family would know.', 'So prove it. Something no stranger could tell me.', 'If you\'re kin, you\'ll know a thing or two about us. Let\'s hear one.', 'One question, then. Get it right and I\'ll listen.',
    'Blood knows blood. Answer me this.', 'I\'ll ask you what I\'d ask any long-lost cousin who turned up at dinner time.', 'Go on, then. Convince me.'],
  // [B-12] [B-13] [B-14] the quiz replies
  right: ['Right first time. Nobody but family would know that.', 'Well, I\'ll be. Straight off, and without counting on your fingers.', 'Correct. And you didn\'t even look at the ceiling first.', 'Now how would a stranger know that? They wouldn\'t. Go on, then, you\'re in.',
    'That\'s it exactly. You\'ve either the blood or a very good spy.', 'Quick as that! You know us better than some who come to dinner every Sunday.', 'Yes. That\'s the truth of it, and there\'s not many living could say so.'],
  rightAtLast: ['There. Now you sound like one of us.', 'Got there in the end. That\'s the family way: wrong first, then loud about being right.', 'That\'s the one. I was starting to wonder about you.', 'Better. We\'ll say no more about the other answers.',
    'There it is. Slow, but sound. We\'ve a few like that.', 'Right at last. My patience isn\'t what it was, and it was never much.', 'Finally. You may be family after all. None of us listens the first time.'],
  wrong: ['No. Any stranger off the road would say that. Think on, and try again.', 'Wrong. And you said it with such confidence, too.', 'No. Not even close, and I was being generous with the question.', 'That\'s not it. Family would know. Have another go before I shut this door.',
    'Ha! No. Whoever told you that was having you on.', 'Guessing, are you? I can always tell. You\'ve gone pink.', 'No, and I\'ll thank you not to guess at my family as if it were a raffle.', 'Not that. I\'ve all day, mind. You\'re the one who looks in a hurry.'],
  // [B-15] [B-16] "come home with me". x = { kid, hero }
  welcome: ['Then you\'re one of ours, though I can\'t think how. Come home with me. You look half starved and wholly lost.', 'Kin, then. Don\'t ask me which branch. Come in and eat something before you fall over.',
    'So you are family. That explains the nose. You\'d best come back with me, there\'s a pot on.', 'Well, I can\'t leave a relation standing in the road. Come along. You can explain yourself over supper, or not at all.',
    'One of us, then, from some far corner of the family that nobody mentions. Come home. We\'ll find you a chair.', 'That settles it. You\'re ours, and we look after our own, even the peculiar ones. This way.'],
  welcomeKnown: [
    x => `Then you're family, right enough, though I can't work out where you fit. You've even the name of my ${x.kid}. Come back with me and we'll puzzle it out.`,
    x => `Family, then. Two of you called ${x.hero}: you and my ${x.kid}. We never did have much imagination with names. Come on, there's supper.`,
    x => `So you're one of ours, and you share a name with my ${x.kid}. I shall call you the Other ${x.hero}, to save confusion. Come and be fed.`,
  ],
  // [C-00] the day's-work opener. x = { a, A, job }  (a / A = "a" or "an")
  trade: [
    x => `I'm ${x.a} ${x.job}, and it's no life for the idle.`,
    x => `You've caught me at work. ${x.A} ${x.job} is always at work.`,
    x => `Since you're family, you can be useful. I'm ${x.a} ${x.job}, and I'm a pair of hands short.`,
    x => `Being ${x.a} ${x.job} looks easy from where you're standing. Everything does, from standing.`,
    x => `Nobody ever got rich as ${x.a} ${x.job}, but nobody ever got bored either.`,
    x => `My father said ${x.a} ${x.job} never starves. He said nothing about ever sitting down.`,
    x => `You want to know your family? Then know the work. I'm ${x.a} ${x.job}.`,
    x => `There's no such thing as a guest in this house. I'm ${x.a} ${x.job}, and today so are you.`,
  ],
  // [C-01] the day's work is done
  paid: ['Not bad. Not bad at all, for somebody who talks like you do. Here, you\'ve earned it.', 'Well, nothing\'s broken and nobody\'s dead. I\'ve paid for worse. Here.', 'You\'ve done a day\'s work in half a day. Don\'t tell anybody, or they\'ll all want you. Take this.',
    'I\'d not have believed it of somebody with hands that soft. There\'s your money.', 'That\'ll do. That is high praise in this family, by the way. Here\'s what you\'re owed.', 'You work like one of us: no fuss, no thanks, and done before dark. Go on, take it.',
    'Fair\'s fair, and you did the job. Count it if you like. I would.', 'I\'ve had hired hands twenty years who never shifted like that. Mind, they had no contraption. Your pay.'],
  // [C-02] to [C-06] the job goes wrong at the end
  twistCatch: ['My pay! He\'s had my pay! Don\'t just sit there!', 'Stop him! That\'s a week\'s wages running off on somebody else\'s legs!'],
  twistChase: ['That was no accident. Go on, give it some of its own back.', 'He did that on purpose! Well? You\'ve wheels of your own. Use them.'],
  twistGoto: ['See that fellow? He wants my trade. Get there before him and put my name down.', 'That weasel is after tomorrow\'s work. Beat him to it, and don\'t be polite about it.'],
  twistCollect: ['You\'ve left half of it in the road. Back you go.', 'Well, that\'s the load all over the lane. It won\'t pick itself up. I\'ve waited to see.'],
  twistEscape: [w => `Now you've done it. Don't stop, and don't give them my name.`, w => `That's ${w.law} looking this way. Drive on. If anybody asks, we've never met, which is very nearly true.`],
  // [D-99] the running total, and where next. Each is [tally, lead-in to the next ancestor]. x = { n, total }
  tally: [
    [x => `Proof ${x.n} of ${x.total}.`, 'Next:'],
    [x => `That's ${x.n} of ${x.total} in the folder.`, 'Now for'],
    [x => `${cap(x.word)} down, out of ${x.total}.`, 'Don\'t get comfortable:'],
    [x => `Proof number ${x.n}. I've put a ribbon round it.`, 'Onwards, dear:'],
    [x => `${cap(x.word)} proven of ${x.total}, and I've stopped biting my nails. Nearly.`, 'Next stop:'],
    [x => `I make that ${x.n} out of ${x.total}.`, 'Have a biscuit, then'],
    [x => `${cap(x.word)} of ${x.total}, and he'll be spitting feathers.`, 'Further back we go:'],
  ],
  // [E-01] [E-02] [E-03] [E-04] the chapter closes. x = { n, next, hero }
  fume: ['Lodged? LODGED? One page, and they have it in a folder with a ribbon round it.', 'Again! That ridiculous car, and that ridiculous old woman.', 'How do they always know where to look? They must be family. They must actually care.',
    'Do you know what it costs to keep a van in four centuries, Mr Lowe? Do you?', 'Beaten. By an estate car. With WOOD on the sides, Mr Lowe.', 'I had it in my hand. One page. And then that dreadful mustard colour in the mirror.', 'Don\'t say it, Mr Lowe. Don\'t count. I can see you counting.'],
  count: [
    x => `That's ${x.n} link${x.n === 1 ? '' : 's'} of the chain proven, sir. If they reach the top of the tree...`,
    x => `I've done the sum, sir. It's ${x.n} now. I did it twice, hoping for a smaller number.`,
    x => `${cap(x.word)} proven, sir. I've had to start a second page in the losses ledger.`,
    x => `That makes ${x.n}, sir. And the hire company has written again about the vans.`,
    x => `${cap(x.word)}, sir. I don't wish to alarm you. I only wish to be alarmed in company.`,
    x => `They have ${x.n} link${x.n === 1 ? '' : 's'} now, sir. At this rate they will have a whole family, and we shall have a great deal of grey paint.`,
    x => `${cap(x.word)}, sir. I only mention it because you asked me not to.`,
  ],
  further: [
    x => `They won't reach the top. We go further back. ${x.next}. Before they've even worked out where.`,
    x => `Then we stop being clever and start being early. ${x.next}. Fetch my coat.`,
    x => `Further back, Mr Lowe. The ink is older there, and old ink lifts beautifully. ${x.next}.`,
    x => `One page is nothing. A family is a chain, and I need only one link. ${x.next}.`,
    x => `Let them have it. They cannot be in two centuries at once, and we have an office in every one. ${x.next}.`,
    x => `Stop quivering and wind the Engine. ${x.next}. And tell the men to look less grey. No. More grey.`,
  ],
  farewell: [
    x => `Mind how you go, ${x.hero}. Whoever you are, you've the family look about you.`,
    x => `Go careful, ${x.hero}. And come again, when you can tell me whose you are.`,
    x => `I still don't know where you fit, ${x.hero}. But there's a chair here for you whenever you want one.`,
    x => `Off you go, then. You drive like a mad thing, ${x.hero}, but you're our mad thing.`,
    x => `Safe home, ${x.hero}, wherever that is. I've a feeling it's a long way off.`,
    x => `I'll tell the children about you, ${x.hero}. They'll not believe a word, but I'll tell them.`,
    x => `Look after yourself, ${x.hero}. And that machine. I've grown almost fond of the smell.`,
  ],
  // [V-01] [V-02] Family favours, heard up to a dozen times. x = { c, name, rel, job, whose, poss, He, he }
  favourAsk: [
    x => `You're the one ${x.c} has been telling everybody about. I'm ${x.name}, ${x.poss} ${x.rel}${x.job}. Since you're stopping: `,
    x => `So you're the stranger with the contraption. I'm ${x.name}, ${x.whose} ${x.rel}${x.job}. ${x.c} says you're handy. Prove it. `,
    x => `${x.c} says you're family. I'm ${x.name}, ${x.poss} ${x.rel}${x.job}, and in this family that means work. `,
    x => `I'm ${x.name}${x.job}: ${x.whose} ${x.rel}. You'll have heard about me. None of it's true. Now, while you're here: `,
    x => `Ah, the famous cousin. ${x.name}, ${x.whose} ${x.rel}${x.job}. I've a job that wants doing, and you've wheels. `,
    x => `You'll be the one who turned up from nowhere. I'm ${x.name}, ${x.whose} ${x.rel}${x.job}. Nowhere must be short of work, so: `,
    x => `${x.name}. ${cap(x.poss)} ${x.rel}${x.job}. ${x.c} never mentioned you, which in this family is a compliment. Could you do a thing for me? `,
    x => `Is that the machine everybody's talking about? I'm ${x.name}, ${x.whose} ${x.rel}${x.job}. Don't tell me how it works. Tell me if it carries. `,
    x => `I'm ${x.name}, ${x.poss} ${x.rel}${x.job}. They say you'll help anybody who asks. I'm asking. `,
    x => `You must be the relation nobody can place. ${x.name}, ${x.whose} ${x.rel}${x.job}. We'll place you later. First: `,
    x => `${x.c} sent you? No? Well, you're here now. I'm ${x.name}, ${x.poss} ${x.rel}${x.job}, and I'm in a fix. `,
    x => `Any kin of ${x.c} is kin of mine, I suppose. ${x.name}, ${x.poss} ${x.rel}${x.job}. Kin help each other, or so I'm always being told. `,
    x => `I'm ${x.name}${x.job}. ${x.whose} ${x.rel}, for my sins. You look like somebody with time on their hands. `,
    x => `You've the family ears, so I'll not ask who you are. ${x.name}, ${x.whose} ${x.rel}${x.job}. I will ask a favour. `,
  ],
  favourDone: [
    x => `That's a kindness I'll not forget. Mind, I couldn't tell you what you are to me. Something with a deal of greats in it, I'd say.`,
    x => `Well, that's done, and done well. Whatever branch you fell off, it's a good one.`,
    x => `I'm obliged to you. If you're ever back this way, there's a seat at our table. You'll have to fight for it, mind.`,
    x => `You've a useful pair of hands. That'll be our side of the family coming out.`,
    x => `Thank you. I'll tell ${x.c} you're all right. ${x.He}'ll say ${x.he} knew it first.`,
    x => `Done already? I shall have to think of something harder next time. Go on, with my thanks.`,
    x => `There. I knew ${x.c} kept good company. Don't tell ${x.him} I said so.`,
    x => `You've saved me a day and a sore back. I'd offer you a bed, but there are six in it as it is.`,
    x => `Much obliged. I still say that machine's unnatural. Handy, though.`,
    x => `Well, I never. And not a scratch on anything. You're wasted on whatever it is you do.`,
    x => `That's a weight off. Come by at Christmas. We need somebody the children haven't heard all the stories from.`,
    x => `Good. Now go before somebody else finds you a job. They will, you know. Word gets round.`,
    x => `Bless you. I'd say you take after ${x.c}, but you were quicker about it.`,
    x => `All done? Then you've earned this, and my good opinion, which is the rarer of the two.`,
  ],
};
export function eraWords(year) {
  return {
    modern: { van: 'grey van', law: 'the police', ride: 'car', hub: 'airport', boat: 'flight', phone: 'phone box' },
    retro: { van: 'grey van', law: 'the police', ride: 'motor', hub: 'airport', boat: 'flight', phone: 'phone box' },
    vintage: { van: 'grey motor-van', law: 'the bobbies', ride: 'motor', hub: 'station quay', boat: 'steamer', phone: 'telegraph office' },
    victorian: { van: 'grey carriage', law: 'the constables', ride: 'cart', hub: 'station quay', boat: 'steamer', phone: 'telegraph office' },
    georgian: { van: 'grey coach', law: 'the watch', ride: 'cart', hub: 'packet quay', boat: 'packet ship', phone: 'parish notice board' },
    early: { van: 'grey wagon', law: 'the watch', ride: 'cart', hub: 'packet quay', boat: 'ship', phone: 'parish notice board' },
  }[eraOf(year)];
}

// ---------------- Places ----------------
const LEFT_SIDE = new Set(['England', 'Wales', 'Scotland', 'Ireland', 'Isle of Man', 'Channel Islands', 'Australia', 'New Zealand', 'South Africa', 'India', 'the Caribbean', 'South East Asia', 'Africa']);
const CONTINENT = {
  usa: 'am', canada: 'am', latinamerica: 'am', caribbean: 'am', australia: 'oc', newzealand: 'oc', southafrica: 'af', westafrica: 'af', africa: 'af', northafrica: 'af',
  mena: 'as', southasia: 'as', eastasia: 'as', seasia: 'as',
};
const NOT_TOWN = /\b(church|chapel|cathedral|abbey|minster|cemetery|churchyard|crematorium|hospital|infirmary|workhouse|district|street|road|lane|avenue|terrace|farm|house|cottage|cottages|hall|row|square|parish|barracks)\b/i;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A GEDCOM place as a town the game can build: { id, name, key, country, nation, house, label, left }. */
export function placeTown(plac) {
  if (!plac) return null;
  const parts = plac.split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  const r = resolvePlace(plac);
  const name = parts.find(p => !/\d/.test(p) && !NOT_TOWN.test(p) && !/^(st|saint|ss)\.? /i.test(p)) || parts[parts.length - 1];
  const last = parts[parts.length - 1];
  const nation = r.country && ['England', 'Wales', 'Scotland', 'Ireland'].includes(r.country) ? r.country
    : parts.length > 1 && last.length > 3 && last !== name ? last : (r.country || '').replace(/^the /, '') || last;
  return { id: slug(name + ' ' + (r.country || nation)), name, key: r.key, country: r.country || nation, nation, house: r.house, label: r.label, left: LEFT_SIDE.has(r.country) || r.key === 'unknown' };
}
const DEFAULT_TOWN = { id: 'hometown-england', name: 'Hometown', key: 'england', country: 'England', nation: 'England', house: 'midbrick', label: 'England', left: true };
const NEW_YORK = { id: 'new-york-the-united-states', name: 'New York', key: 'usa', country: 'the United States', nation: 'United States', house: 'cityterrace', label: 'America', left: false };

/** Ticket price between two towns: a coach or train at home, a crossing abroad. */
export function fareBetween(a, b) {
  if (!a || !b || a.id === b.id) return 0;
  if (a.country === b.country) return 40;
  const ca = CONTINENT[a.key] || 'eu', cb = CONTINENT[b.key] || 'eu';
  return ca === cb ? 160 : 320;
}
/** Ink for the Parish Engine: dearer the further you turn the pages back. */
export const inkCost = (y1, y2) => y1 === y2 ? 0 : Math.round(15 + Math.abs(y1 - y2) / 6);

const PUBS = ['The Red Lion', 'The Crown', 'The Plough', 'The Kings Arms', 'The White Hart', 'The Bull', 'The Swan', 'The Bell', 'The George', 'The Black Horse', 'The Rose and Crown', 'The Wheatsheaf'];
const FARMS = ['Hollin', 'Top o\'th\' Hill', 'Brook', 'Nether', 'High Ash', 'Lane End', 'Church', 'Moor Side', 'Bank', 'Green'];
/** What each landmark is called in a given town and year. */
export function lotName(kind, town, year) {
  const e = eraOf(year), h = hashString(town.id) >>> 0;
  const works = { mill: 'the mill', colliery: 'the pit', pennine: 'the mill', valleys: 'the pit', cityterrace: 'the docks', london: 'the works', tenement: 'the shipyard' }[town.house] || 'the works';
  switch (kind) {
    case 'church': return 'the parish church';
    case 'hall': return year >= 1930 ? 'the Records Office' : year >= 1837 ? 'the Register Office' : 'the vestry hall';
    case 'pub': return PUBS[h % PUBS.length];
    case 'works': return year < 1760 ? 'the forge' : works;
    case 'farm': return FARMS[(h >>> 3) % FARMS.length] + ' Farm';
    case 'school': return year >= 1870 ? 'the school' : 'the dame school';
    case 'hub': return eraWords(year).hub.replace(/^/, 'the ');
    case 'garage': return year >= 1950 ? 'Dorothy\'s lock-up' : year >= 1900 ? 'the motor shed' : 'the tithe barn';
    case 'market': return 'the market place';
    case 'infirmary': return year >= 1948 ? 'the hospital' : year >= 1750 ? 'the infirmary' : 'the apothecary';
    case 'police': return year >= 1900 ? 'the police station' : year >= 1829 ? 'the constabulary' : 'the watch-house';
    case 'post': return year >= 1840 ? 'the post office' : 'the posting house';
    case 'office': return e === 'modern' ? 'Hargreaves & Lowe' : 'the counting house';
    case 'phone': return 'the ' + eraWords(year).phone;
    case 'home': return 'the house';
    default: return 'the ' + kind;
  }
}

// ---------------- People ----------------
const JOB_GROUPS = [
  [/coal|collier|miner|hewer|pit|quarr|iron|steel|forge|puddler|foundry|potter|kiln|navvy|brick|labourer|laborer/, 'haul'],
  [/weav|spinn|piecer|doffer|carder|mill|cotton|wool|worsted|silk|textile|loom|tailor|dressmak|seamstress|millin|draper|hatter/, 'cloth'],
  [/farm|agric|ag lab|shepherd|crofter|plough|husbandman|yeoman|cowman|drover|gardener|grazier/, 'farm'],
  [/servant|maid|cook|housekeeper|butler|footman|laundress|char|domestic|scullery|groom/, 'serve'],
  [/fisher|trawler|sailor|seaman|mariner|docker|stevedore|boatman|waterman|bargee|ship/, 'sea'],
  [/railway|engine driver|signalman|porter|platelayer|postman|post ?mistress|carter|carrier|coachman|driver|chauffeur|conductor/, 'rail'],
  [/grocer|baker|butcher|publican|innkeeper|shop|hawker|dealer|merchant|brewer|miller|victualler|chemist|confectioner|stationer/, 'shop'],
  [/smith|carpenter|joiner|mason|builder|wheelwright|cooper|shoemaker|cordwainer|clogger|plumber|electrician|mechanic|fitter|turner|engineer|painter|saddler|thatcher|welder|machinist|chain|nailer|tool/, 'craft'],
  [/nurse|midwife|doctor|surgeon|physician|apothecary|dentist/, 'care'],
  [/teacher|schoolm|governess|tutor|lecturer|vicar|rector|curate|minister|priest|clergy|reverend/, 'school'],
  [/soldier|private|corporal|sergeant|gunner|sapper|trooper|army|regiment|militia|navy|marine|officer|captain|constable|police/, 'arms'],
  [/clerk|book.?keeper|typist|secretary|accountant|agent|solicitor|attorney|lawyer|manager|software|developer|analyst|consultant|designer|civil servant|cashier|insurance/, 'desk'],
  [/gentleman|gentlewoman|esquire|landowner|proprietor|own means|baronet|lady|manufacturer|banker/, 'gentry'],
];
export function jobGroup(title) {
  const t = (title || '').toLowerCase();
  for (const [re, g] of JOB_GROUPS) if (re.test(t)) return g;
  return 'odd';
}
const PRON = { M: ['he', 'him', 'his'], F: ['she', 'her', 'her'], U: ['they', 'them', 'their'] };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const q = s => '«' + s + '»'; // protected from dialect rules (names, places, dates)
const evPlace = (indi, ...tags) => { for (const t of tags) for (const e of indi.events) if (e.tag === t && e.place) return e.place; return ''; };

function describe(p, data, hints) {
  const indi = p.indi;
  const jobs = indi.events.filter(e => e.tag === 'OCCU' && e.value).map(e => e.value.trim());
  const [he, him, his] = PRON[indi.sex] || PRON.U;
  const town = placeTown(evPlace(indi, 'BIRT', 'CHR', 'BAPM') || evPlace(indi, 'RESI', 'CENS') || evPlace(indi, 'DEAT', 'BURI'));
  const by = birthYear(indi) ?? hints.by ?? null;
  return {
    id: p.id, indi, gen: p.gen, ahnen: p.ahnen, name: displayName(indi), first: firstName(indi), surname: indi.surname || '', sex: indi.sex,
    by, byKnown: birthYear(indi) != null, dy: deathYear(indi), life: lifespan(indi), town, jobs, job: jobs[0] || '', group: jobGroup(jobs.join(' ')),
    rel: p.gen === 0 ? 'self' : relationship(p.gen, indi.sex), he, him, his,
  };
}

// The family in which `childId` was born, seen from parent `id`: spouse, marriage, siblings.
function familyThrough(data, id, childId) {
  const child = childId && data.individuals.get(childId);
  const fam = child?.famc && data.families.get(child.famc);
  if (!fam) return { fam: null, spouse: null, marriage: null, kids: [] };
  const sid = fam.husb === id ? fam.wife : fam.husb;
  return { fam, spouse: sid ? data.individuals.get(sid) || null : null, marriage: fam.events.find(e => e.tag === 'MARR') || null, kids: fam.children.map(c => data.individuals.get(c)).filter(Boolean) };
}

// ---------------- Choosing the cast ----------------
function chooseChapters(tree, data, now) {
  const people = tree.people, root = people.get(tree.rootId);
  // how far each line goes back
  const depth = new Map();
  const dep = id => {
    if (depth.has(id)) return depth.get(id);
    depth.set(id, 0);
    const p = people.get(id);
    const d = Math.max(0, ...[p.father, p.mother].filter(Boolean).map(x => 1 + dep(x)));
    depth.set(id, d);
    return d;
  };
  const known = p => (evPlace(p.indi, 'BIRT', 'CHR', 'BAPM', 'RESI', 'CENS', 'DEAT', 'BURI') ? 2 : 0) + (birthYear(p.indi) != null ? 1 : 0) + (p.indi.events.some(e => e.tag === 'OCCU') ? 1 : 0);
  // The spine: follow the best-documented line as far as it goes.
  const spine = [];
  let cur = root;
  while (cur) {
    const ps = [cur.father, cur.mother].filter(Boolean).map(id => people.get(id));
    if (!ps.length) break;
    ps.sort((a, b) => (dep(b.id) * 3 + known(b)) - (dep(a.id) * 3 + known(a)) || a.ahnen - b.ahnen);
    spine.push(ps[0]);
    cur = ps[0];
  }
  // Estimated birth years so everyone can be placed in time.
  const est = new Map();
  const rootBy = birthYear(root.indi) ?? now - 30;
  est.set(root.id, rootBy);
  const order = [...people.values()].sort((a, b) => a.gen - b.gen);
  for (const p of order) {
    if (est.has(p.id)) continue;
    const childBy = p.primaryChild ? est.get(p.primaryChild) : rootBy;
    est.set(p.id, birthYear(p.indi) ?? (childBy ?? rootBy) - 28);
  }
  // Which spine people get a chapter: the nearest three, a couple on the way, and the very top.
  let picks = spine.map((p, i) => i);
  if (spine.length > 6) {
    const last = spine.length - 1;
    picks = [...new Set([0, 1, 2, Math.round(2 + (last - 2) / 3), Math.round(2 + 2 * (last - 2) / 3), last])];
  }
  const chosen = picks.map(i => ({ p: spine[i], spine: true }));
  // Detours off the spine: somebody born in another country, somebody who emigrated, somebody who served.
  const homeCountry = placeTown(evPlace(root.indi, 'BIRT', 'RESI', 'CENS') || (spine[0] && evPlace(spine[0].indi, 'BIRT', 'RESI', 'CENS')))?.country || 'England';
  const onSpine = new Set(chosen.map(c => c.p.id));
  const countries = new Set([homeCountry, ...chosen.map(c => placeTown(evPlace(c.p.indi, 'BIRT', 'CHR', 'BAPM', 'RESI', 'CENS'))?.country).filter(Boolean)]);
  const others = order.filter(p => p.gen > 0 && !onSpine.has(p.id) && birthYear(p.indi) != null);
  const abroad = others.find(p => { const t = placeTown(evPlace(p.indi, 'BIRT', 'CHR', 'BAPM')); return t && t.key !== 'unknown' && !countries.has(t.country); });
  const emigrant = others.find(p => p !== abroad && (p.indi.events.some(e => e.tag === 'EMIG' || e.tag === 'IMMI')));
  const served = others.find(p => p !== abroad && p !== emigrant && (p.indi.events.some(e => /MIL/.test(e.tag)) || jobGroup(p.indi.events.filter(e => e.tag === 'OCCU').map(e => e.value).join(' ')) === 'arms'));
  const detours = [abroad, emigrant, served].filter(Boolean).slice(0, 2);
  for (const p of detours) chosen.push({ p, spine: false });
  // Go back in time in order, but the top of the spine is always the finale.
  const top = spine.length ? spine[spine.length - 1] : null;
  chosen.sort((a, b) => (a.p === top) - (b.p === top) || est.get(b.p.id) - est.get(a.p.id));
  return { chosen, est, spine, homeCountry, foreign: chosen.some(c => { const t = placeTown(evPlace(c.p.indi, 'BIRT', 'CHR', 'BAPM', 'RESI', 'CENS')); return t && t.country !== homeCountry; }) };
}

// ---------------- Mission text ----------------
const DAY_JOBS = {
  haul: c => ({ title: 'Three Loads', ask: `Three loads from ${c.works} down to ${c.hub} before the hooter goes. Every one that's late is a day's pay docked, and I've none to spare. That contraption of yours looks strong enough, if ugly.`,
    steps: [{ t: 'carry', from: 'works', to: 'hub', n: 3, label: /potter|kiln/.test(c.jobL) ? 'crates of pots' : /iron|steel|forge|puddl|foundry/.test(c.jobL) ? 'loads of pig iron' : /quarr|brick/.test(c.jobL) ? 'loads of stone' : 'loads of coal', timed: 1.25, text: `Haul three loads from ${c.works} to ${c.hub}` }] }),
  cloth: c => ({ title: 'Cut From the Same Cloth', ask: `Two pieces of finished cloth to go to the draper in ${c.market}. Finished, mind. One splash of muck and it comes out of my wages, so drive it like it was a christening gown.`,
    steps: [{ t: 'carry', from: 'works', to: 'market', n: 2, label: 'pieces of cloth', gentle: true, timed: 1.5, text: `Take the cloth from ${c.works} to ${c.market} without a bump` }] }),
  haulB: c => ({ title: 'Runaway Tubs', ask: `A string of tubs has broken loose from ${c.works} and gone rattling off down the town. Six of them, loaded. Catch every one before something catches them, and the gaffer need never know.`,
    steps: [{ t: 'collect', around: 'works', radius: 17, n: 6, label: 'runaway tubs', timed: 1.5, text: `Catch the runaway tubs near ${c.works}` }] }),
  clothB: c => ({ title: 'The Knocker-Up', ask: `Half the street is still abed and the gates shut on the stroke. Anybody locked out loses the day. Go round and rattle every window, then be at ${c.works} before they close. They'll curse you. Take it as thanks.`,
    steps: [{ t: 'race', stops: ['pub', 'school', 'post', 'farm', 'works'], timed: 1.15, text: `Wake the street and reach ${c.works} before the hooter` }] }),
  farmB: c => ({ title: 'Market Day', ask: `Two churns for ${c.market}, and they'll not keep in this heat. Mind the ruts, mind the dog, and mind you get a fair price. If it's butter when you get there, you went too fast.`,
    steps: [{ t: 'carry', from: 'farm', to: 'market', n: 2, label: 'milk churns', timed: 1.2, text: `Take the churns from ${c.farm} to ${c.market}` }] }),
  serveB: c => ({ title: 'The Mistress Is Out', ask: `The mistress is to be driven to church and the coachman's nowhere. A grey stranger stood him a drink, and then several more. She notices every bump, mind. Every one.`,
    steps: [{ t: 'carry', from: 'home', to: 'church', n: 1, label: 'passenger', passenger: 'the mistress', gentle: true, timed: 1.5, text: 'Drive the mistress to church without a bump' }] }),
  armsB: c => ({ title: 'Absent Without Leave', ask: `One of my lads has taken the shilling and then taken to his heels, in a borrowed grey coat. He was last seen by ${c.pub}. Bring him back on his own feet, if you please.`,
    steps: [{ t: 'catch', from: 'pub', label: 'the deserter', drop: 'the deserter by the collar', text: `Catch the deserter near ${c.pub}, on foot` }] }),
  shopB: c => ({ title: 'Five-Finger Discount', ask: `That grey article has just walked out of here with a week's takings under his hat. He went towards ${c.market}. I'd go myself, but who'd mind the shop?`,
    steps: [{ t: 'catch', from: 'market', label: 'the thief', drop: 'the takings', text: 'Catch the thief on foot' }, { t: 'goto', at: 'home', text: 'Bring the takings back' }] }),
  railB: c => ({ title: 'The Night Mail', ask: `The mail goes out to ${c.hub} tonight by way of ${c.farm}, and three grey ${c.year < 1900 ? 'carriages' : 'vans'} have sat outside all afternoon doing nothing. I don't care for ${c.year < 1900 ? 'carriages' : 'vans'} that do nothing.`,
    steps: [{ t: 'defend', from: 'post', via: ['farm'], to: 'hub', hp: 9, waves: 6, text: `See the mail safe to ${c.hub}` }] }),
  deskB: c => ({ title: 'Due Process', ask: `A grey gentleman has been in three times this week asking for a copy of every will in the district. Follow him when he leaves. I should like to know where a man like that keeps his paperwork.`,
    steps: [{ t: 'tail', from: 'hall', via: ['market'], to: 'office', text: 'Follow the grey gentleman without being noticed' }] }),
  careB: c => ({ title: 'The Rounds', ask: `Four calls to make before dark, and my feet gave out at dinner time. You have wheels. Physic to each door, and no dawdling at ${c.pub}.`,
    steps: [{ t: 'race', stops: ['farm', 'school', 'pub', 'church', 'infirmary'], timed: 1.2, text: 'Do the rounds before dark' }] }),
  schoolB: c => ({ title: 'The Treat', ask: `It is the Sunday school treat and the waggonette has not come. Take the little ones up to ${c.farm} for me. If one of them is sick, you will hear about it.`,
    steps: [{ t: 'carry', from: 'school', to: 'farm', n: 2, label: 'children', passenger: 'the children', gentle: true, timed: 1.6, text: `Take the children to ${c.farm}, smoothly` }] }),
  craftB: c => ({ title: 'Tools of the Trade', ask: `Some comedian in a grey apron has had my tool bag and scattered the lot between here and ${c.market}. Every one of those cost me a week's wage. Find them.`,
    steps: [{ t: 'collect', around: 'works', radius: 15, n: 7, label: 'crates of tools', timed: 1.5, text: 'Find the scattered tools' }] }),
  seaB: c => ({ title: 'Pots and Lines', ask: `The pots came adrift on the tide and they're strewn the length of the quay road. Fetch them in before somebody else does. Anything still inside them is supper.`,
    steps: [{ t: 'collect', around: 'hub', radius: 15, n: 6, label: 'crates of pots', timed: 1.5, text: `Gather the pots near ${c.hub}` }] }),
  gentryB: c => ({ title: 'Leaving Cards', ask: `One calls, one leaves a card, one goes. Five houses before luncheon. You will hand in the cards. I shall remain in the vehicle and be seen.`,
    steps: [{ t: 'race', stops: ['church', 'hall', 'school', 'infirmary', 'home'], timed: 1.3, text: 'Leave cards at five houses before luncheon' }] }),
  farm: c => ({ title: 'Gone Astray', ask: `Somebody in a grey coat left the gate open and every beast I own is out on the lane. Round them up, then take the cart to ${c.market} before the dealers go home. The brown one bites.`,
    steps: [{ t: 'collect', around: 'farm', radius: 15, n: 6, label: c.year < 1800 ? 'pigs' : 'sheep', timed: 1.6, text: `Round up the strays near ${c.farm}` }, { t: 'carry', from: 'farm', to: 'market', n: 1, label: 'cart of produce', timed: 1.3, text: `Get the cart to ${c.market}` }] }),
  serve: c => ({ title: 'Below Stairs', ask: `The mistress wants the whole list fetched before she rings for tea, and she rings early when she's vexed. I can't be in four places at once. Can you?`,
    steps: [{ t: 'race', stops: ['market', 'post', 'pub', 'infirmary', 'home'], timed: 1.2, text: 'Fetch everything on the list and get back before the bell' }] }),
  sea: c => ({ title: 'Fresh Today', ask: `Two boxes off the boat and they want to be in ${c.market} while they still smell of the sea and not of Friday. Go on, shift.`,
    steps: [{ t: 'carry', from: 'hub', to: 'market', n: 2, label: 'boxes of fish', timed: 1.1, text: `Rush the catch from ${c.hub} to ${c.market}` }] }),
  rail: c => ({ title: 'The Round', ask: `Bags for ${c.post}, ${c.hall}, the school and ${c.pub}, and the timetable waits for nobody. I'll ride along and shout if you're late. I'll shout if you're early, too. It's expected.`,
    steps: [{ t: 'race', stops: ['hub', 'post', 'hall', 'school', 'pub'], timed: 1.15, text: 'Do the round before the timetable catches you' }] }),
  shop: c => ({ title: 'Orders Out', ask: `Five orders, five doors, and every one of them expects it before dinner. A shop lives on its name. Don't lose me mine.`,
    steps: [{ t: 'race', stops: ['pub', 'school', 'infirmary', 'church', 'farm'], timed: 1.2, text: 'Deliver all five orders' }] }),
  craft: c => { const thing = c.year < 1930 ? 'mended wheel' : 'mended generator'; return { title: 'Made to Last', ask: `That's a week of my work on the bench, wanted at the church, and a ${thing} wanted at ${c.farm}. Set it down gently. I'll know if you didn't.`,
    steps: [{ t: 'carry', from: 'works', to: 'church', n: 1, label: c.year < 1900 ? 'new bell frame' : 'new church gate', gentle: true, timed: 1.6, text: 'Deliver the finished work to the church in one piece' }, { t: 'carry', from: 'works', to: 'farm', n: 1, label: thing, timed: 1.4, text: `Take the ${thing} to ${c.farm}` }] }; },
  care: c => ({ title: 'On Call', ask: `There's a man hurt up at ${c.farm} and nothing with wheels to fetch him. Bring him to ${c.infirmary}, quick but smooth. He has enough broken already.`,
    steps: [{ t: 'carry', from: 'farm', to: 'infirmary', n: 1, label: 'patient', passenger: 'the patient', gentle: true, timed: 1.3, text: `Bring the patient from ${c.farm} to ${c.infirmary}` }] }),
  school: c => ({ title: 'Truants', ask: `Half my flock has bolted. Somebody told them there was a grey man giving out toffee. Round them up before the inspector arrives and finds me teaching the furniture.`,
    steps: [{ t: 'collect', around: 'school', radius: 17, n: 6, label: 'truants', timed: 1.5, text: 'Round up the truants' }] }),
  arms: c => ({ title: 'Dispatches', ask: `Orders for the constabulary, the quay, the hall and the church tower, and back to me. At the double. Consider it a test of character.`,
    steps: [{ t: 'race', stops: ['police', 'hub', 'hall', 'church', 'home'], timed: 1.1, text: 'Carry the dispatches at the double' }] }),
  desk: c => ({ title: 'In Triplicate', ask: `Stamped at ${c.hall}, countersigned at ${c.post}, witnessed at ${c.police} and back on my desk before the office shuts. That's how things get done properly.`,
    steps: [{ t: 'race', stops: ['hall', 'post', 'police', 'home'], timed: 1.15, text: 'Get the papers stamped, signed and witnessed' }] }),
  gentry: c => ({ title: 'Driving the Quality', ask: `You may drive me to ${c.hall} and then to church. You will not jolt me, you will not splash me, and you will not speak unless the vehicle is on fire.`,
    steps: [{ t: 'carry', from: 'home', to: 'hall', n: 1, label: 'passenger', passenger: c.first, gentle: true, text: `Drive ${c.first} to ${c.hall}. Gently.` }, { t: 'carry', from: 'hall', to: 'church', n: 1, label: 'passenger', passenger: c.first, gentle: true, text: `Now to the church. Still gently.` }] }),
  odd: c => ({ title: 'Earning Your Keep', ask: `If you're stopping, you can make yourself useful. Two loads from ${c.market} to ${c.pub}, and there's a drink in it if nothing gets broken.`,
    steps: [{ t: 'carry', from: 'market', to: 'pub', n: 2, label: c.year < 1900 ? 'barrels' : 'crates', timed: 1.4, text: `Carry two loads from ${c.market} to ${c.pub}` }] }),
};

// Hargreaves never tries the same trick twice. Each chapter gets its own scheme: the story of what he is doing to
// this ancestor's record, how you find them (a different job every time), and what he and Lowe say about it.
// p = { c, N, w, workLot, spots } for the chapter. Each returns the meeting's acts before the talk, where the talk
// happens, the ancestor's suspicion, Dorothy's note, and the lines for the cut scene.
const SCHEME_MECH = { search: 'search', bribe: 'goto', lure: 'chase', letters: 'collect', gossip: 'race', forgery: 'tail', siege: 'defend' };   // how each meeting opens
const SCHEMES = {
  search: p => { const { c, N, spots } = p; return {
    mech: 'search', name: 'the false alarm',
    note: `Hargreaves's people have been at the house with a story about a fire at ${N[spots[1]]}, and ${c.first} has gone running. Try the house first, then ${N[spots[1]]}, then ${N[spots[2]]}. There is no fire. There is never a fire. There is only ever Silas.`,
    steps: [{ t: 'search', spots, miss: { 0: `Nobody in. A neighbour says a man in grey shouted "Fire!" and ${c.first} ran off towards ${N[spots[1]]}. "He didn't run himself, I noticed," she adds.`, 1: `No fire here, no smoke, and no ${c.first}. "Try ${N[spots[2]]}," says somebody, without looking up from a pie.`, 2: `No sign of ${c.him}. "Went by with a bucket," says a child. "Towards ${N[spots[1]]}. I'd have gone too, but I'm not allowed."` }, text: `Find ${c.first}` }],
    talkAt: '@found',
    wary: `Some joker in grey sent me running across town for a fire that never was. I took a bucket. I'll not be made a fool of twice in one day.`,
    cut: [`A false alarm, Mr Lowe. Shout "fire" and ${c.first} runs, and an empty house has no witnesses.`, `Should I bring an actual fire, sir? For authenticity?`, `Bring a loud voice. While ${c.he}'s away, the page goes.`],
  }; },
  bribe: p => { const { c, N } = p; return {
    mech: 'catch', name: 'the bought clerk',
    note: `Hargreaves has bought the parish clerk. The minute ${N.hall} is empty he means to cut ${c.first}'s entry out with a penknife. Get there first, and if he runs, run faster. He's a clerk. It shouldn't be hard.`,
    steps: [{ t: 'goto', at: 'hall', timed: 1.15, text: `Get to ${N.hall} before the clerk does his work` },
      { t: 'catch', from: 'hall', label: 'the bought clerk', drop: `${c.first}'s page, folded in his hat`, time: 55, speed: 4.6, text: 'The clerk is away with the page. Catch him on foot' },
      { t: 'goto', at: 'home', text: `Take the page back to ${c.first}` }],
    talkAt: 'home',
    wary: `The parish clerk, of all people. Thirty years I've known that man, and he'd sell my name for a sovereign and a hat. It wasn't even a good hat.`,
    cut: [`Every man has his price, Mr Lowe. The parish clerk's is a sovereign and a new hat.`, `A hat, sir? Shall I get a receipt for the hat?`, `No receipts. He'll cut the page out with his own penknife. Nobody suspects the clerk.`],
  }; },
  lure: p => { const { c, N, w, workLot } = p; return {
    mech: 'chase', name: 'the lift',
    note: `An hour ago a ${w.van} stopped beside ${c.first} and offered ${c.him} a lift. Nobody has seen ${c.him} since. Find that ${w.van.replace(/^grey /, '')} and stop it. I don't mind how. I'd rather not know how.`,
    steps: [{ t: 'chase', from: workLot, hp: 3, slow: true, label: `the ${w.van}`, drop: `${c.first} out of the back of it, cross and dizzy`, text: `Stop the ${w.van} with ${c.first} in the back` },
      { t: 'carry', from: workLot, to: 'home', n: 1, label: 'passenger', passenger: c.first, who: c.id, gentle: true, text: `${c.first} has walked back to ${N[workLot]} for ${c.his} things. Drive ${c.him} home, gently`, bark: { who: c.id, text: `I've been carried off once today already. Go steady in this one, and warn me before you turn.` } }],
    talkAt: 'home',
    wary: `A nice man offered me a lift, and the next thing I know I'm halfway to nowhere in the back of a box. That's the last time I'm civil to a stranger.`,
    cut: [`No book, no page, no ink. We simply take ${c.first} for a little drive.`, `A drive, sir? Where to? I only ask because of the mileage.`, `Somewhere nobody thinks to write anything down. Out of the record, out of the world.`],
  }; },
  letters: p => { const { c, N, workLot } = p; return {
    mech: 'collect', name: 'the scattered letters',
    note: `Hargreaves's men broke into ${c.first}'s house in the night and threw every family letter out of the window. Gather them up: one of them will say where ${c.he} ${c.he === 'they' ? 'have' : 'has'} gone. Don't read the love letters. Well. Skim.`,
    steps: [{ t: 'collect', around: 'home', radius: 14, n: 6, label: 'family letters', timed: 1.45, text: `Gather the family letters blowing round ${c.first}'s house` },
      { t: 'goto', at: workLot, text: `The last letter says ${c.first} is at ${N[workLot]}` }],
    talkAt: workLot,
    wary: `They had every letter I own out of the drawer and into the street. My mother's hand, my sweetheart's. Half the road has read things I'd not have told my own pillow.`,
    cut: [`Letters, Mr Lowe. People keep letters. Letters prove who is whose.`, `So we burn them, sir? I've brought matches. I've also brought a bucket, in case.`, `Burning is for amateurs. We scatter them. Nobody believes a letter found in the gutter.`],
  }; },
  gossip: p => { const { c, N, workLot } = p; const stops = [...new Set(['pub', 'market', 'church', 'post'])].filter(k => k !== workLot).slice(0, 3); return {
    mech: 'race', name: 'the rumour',
    note: `Hargreaves has put it about that ${c.first} died last week. By tonight somebody will write it down, and then it's true. Get round ${N[stops[0]]}, ${N[stops[1]]} and ${N[stops[2]]} and tell everybody otherwise. Then find ${c.first}, who I imagine is livid.`,
    steps: [{ t: 'race', stops, timed: 1.2, text: `Stop the rumour: ${N[stops[0]]}, ${N[stops[1]]} and ${N[stops[2]]}, quickly` },
      { t: 'goto', at: workLot, text: `Find ${c.first} at ${N[workLot]}, alive and well` }],
    talkAt: workLot,
    wary: `Half the town's been round with flowers. Apparently I'm dead. I've never felt better, and somebody has already asked about my boots.`,
    cut: [`Why erase a life when you can simply end it on paper? A word in the right ear, Mr Lowe.`, `That ${c.first} is dead, sir? Should we send flowers? It seems only polite.`, `Send them. It adds conviction. Dead and buried by teatime, and nobody looks for a dead woman's birth.`.replace('woman', c.sex === 'F' ? 'woman' : c.sex === 'M' ? 'man' : 'person')],
  }; },
  forgery: p => { const { c, N } = p; return {
    mech: 'tail', name: 'the forger',
    note: `Hargreaves has had the register copied out with ${c.first} left out of it, and his forger is in town to swap the books. He's just left ${N.hall} with a parcel. Follow him and he'll lead you to the real one. Don't let him see you. Think inconspicuous thoughts.`,
    steps: [{ t: 'tail', from: 'hall', via: ['market'], to: 'church', text: `Follow the forger to wherever he is swapping the books` },
      { t: 'catch', from: 'church', label: 'the forger', drop: 'the forged register', time: 50, text: 'He has seen you. Catch him before he burns the evidence' }],
    talkAt: 'church',
    wary: `A man swapped our parish book for one with my name missing. I watched him do it and thought he was the verger. I held the door for him.`,
    cut: [`My forger has made a lovely copy of the register, Mr Lowe. Every page exactly the same.`, `Every page, sir? Even the blots?`, `Even the blots. Every page but one. According to the new book, ${c.first} was never born.`],
  }; },
  siege: p => { const { c, N, w } = p; const cart = c.year < 1900 ? 'cart' : c.year < 1950 ? 'lorry' : 'van'; return {
    mech: 'defend', name: 'the siege',
    note: `The ${w.van}s have been circling ${c.first}'s house since dawn. ${cap(c.he)}'s loading the family's papers onto a ${cart} to take to ${N.church} for safe keeping. Ride alongside and keep them off. You have my permission to be rude.`,
    steps: [{ t: 'defend', from: 'home', to: 'church', hp: 9, waves: 4, text: `Keep the ${w.van}s off ${c.first}'s ${cart} all the way to ${N.church}` }],
    talkAt: 'church',
    wary: `${cap(w.van)}s round my door since first light, and now a stranger who drives like a lunatic. Thank you for that, by the way. It doesn't mean I trust you.`,
    cut: [`If the archivist's driver wants the page so badly, Mr Lowe, we shall take the house.`, `The whole house, sir? We've only the one form for that.`, `Every ${w.van} we have, round every door. Nothing leaves without our say.`],
  }; },
};
// A day's work that is over in one act gets a second, and never the same kind as the work or the meeting.
const DAY_TWISTS = {
  catch: (end, c, w, deal) => ({ t: 'catch', from: end, label: 'a pickpocket in a grey cap', drop: 'the day\'s pay', time: 45, text: 'A pickpocket in a grey cap has the day\'s pay. After him', bark: { who: c.id, text: deal('twistCatch', LINES.twistCatch) } }),
  chase: (end, c, w, deal) => ({ t: 'chase', from: end, hp: 2, slow: true, label: `the ${w.van}`, drop: 'seen it off', text: `A ${w.van} rammed the last load on purpose. Run it off the road`, bark: { who: c.id, text: deal('twistChase', LINES.twistChase) } }),
  goto: (end, c, w, deal) => ({ t: 'goto', at: end === 'pub' ? 'post' : 'pub', rival: true, text: `A rival is after tomorrow's work. Beat him to the ${end === 'pub' ? 'post office' : 'pub'} to put in your name first`, bark: { who: c.id, text: deal('twistGoto', LINES.twistGoto) } }),
  collect: (end, c, w, deal) => ({ t: 'collect', around: end, radius: 9, n: 4, label: 'spilled crates', timed: 1.5, text: 'The tailboard came down at the last corner. Pick up what fell off', bark: { who: c.id, text: deal('twistCollect', LINES.twistCollect) } }),
  escape: (end, c, w, deal) => ({ t: 'escape', heat: 1.1, text: 'You were seen driving like that. Lose the law before they take your name', bark: { who: c.id, text: deal('twistEscape', LINES.twistEscape)(w) } }),
};

// Loads that are not fragile can fall off; anything against the clock has spare seconds lying about.
function spice(job) {
  for (const st of job.steps) {
    if (st.t === 'carry' && !st.gentle && !st.passenger) st.spill = true;
    if (st.timed && (st.t === 'carry' || st.t === 'race')) st.tokens = 2;
  }
  return job;
}
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
// The clue is dropped twice before the question is asked: the ancestor says it ([A-Q]) and Dorothy's note repeats it ([B-Q]).
function quizFor(c, cast, rnd, deal, asked = {}) {
  const they = c.he === 'they', He = cap(c.he), His = cap(c.his), be = they ? "'re" : "'s";
  const pick = (id, list) => deal('quiz-' + id, list);
  const opts = (right, pool) => {
    const wrong = [...new Set(pool.filter(x => x && x !== right))];
    for (let i = wrong.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [wrong[i], wrong[j]] = [wrong[j], wrong[i]]; }
    const options = [right, ...wrong.slice(0, 3)];
    for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
    return options.length >= 3 ? { options, answer: options.indexOf(right) } : null;
  };
  const qs = [], ask = (kind, f) => qs.push([kind, f]);
  const mother = c.mother, father = c.father;
  const wed = c.year >= (c.marriageYear || 0);
  if (mother?.surname && mother.surname !== c.surname) ask('mother', () => ({ kind: 'mother', q: 'What was my mother\'s name before she wed?', ...opts(mother.surname, cast.surnames),
    said: pick('mother-said', [`My mother was a «${mother.surname}» before she wed, and she never let my father forget it.`, `Stubborn? I'm half «${mother.surname}», on my mother's side. We don't call it stubborn. We call it being right.`]),
    told: pick('mother-told', [`${His} mother was a ${mother.surname} before she married. ${He}${be} prouder of that side than ${c.he} ${they ? 'let' : 'lets'} on.`, `The mother's maiden name was ${mother.surname}. It's in the register and, by all accounts, in ${c.his} temper.`]) }));
  if (father) ask('father', () => ({ kind: 'father', q: 'What is my father\'s Christian name?', ...opts(firstName(father), cast.maleNames),
    said: pick('father-said', [`My father, «${firstName(father)}», always said a good name is worth more than a full purse.`, `My father «${firstName(father)}» had a saying for everything. Most of them were wrong, but he said them with great confidence.`]),
    told: pick('father-told', [`${His} father was ${firstName(father)}, and ${c.he} ${they ? 'quote' : 'quotes'} him at every turn.`, `Father: ${firstName(father)}. Remember it. ${He} certainly ${they ? 'do' : 'does'}.`]) }));
  if (c.spouse) ask('spouse', () => { const sp = displayName(c.spouse); return { kind: 'spouse', q: `Who ${wed ? 'did I marry' : 'am I walking out with'}?`, ...opts(sp, cast.names),
    said: wed ? pick('wed-said', [`«${sp}» will want ${c.sex === 'F' ? 'his' : c.sex === 'M' ? 'her' : 'their'} tea, and I've not set foot in the kitchen.`, `If «${sp}» asks, I was home an hour ago. That's marriage for you: a long argument about what time it is.`])
      : pick('court-said', [`I'm walking out with «${sp}», if you must know, and the whole street does know.`, `«${sp}» is calling for me Sunday. I haven't told a soul, so I expect the town crier has it by now.`]),
    told: wed ? pick('wed-told', [`${He}${be} married to ${sp}, who is by all accounts the brains of the outfit.`, `Married to ${sp}. Happily, or near enough for the register.`])
      : pick('court-told', [`${He}${be} walking out with ${sp}. It's meant to be a secret, so everybody has heard.`, `${He}${be} courting ${sp}. It isn't in any register yet, but the neighbours keep better records than I do.`]) }; });
  if (c.byKnown) ask('year', () => ({ kind: 'year', q: 'What year was I born?', ...opts(String(c.by), [c.by - 11, c.by + 7, c.by - 4, c.by + 13, c.by - 19].map(String)),
    said: pick('year-said', [`Born in «${c.by}», I was, and my mother said it was the longest night of her life.`, `I've been on this earth since «${c.by}», and tired since about a week after.`]),
    told: pick('year-told', [`Born in ${c.by}, by the register. ${He} may knock a year or two off if asked. Don't be fooled.`, `Year of birth: ${c.by}. I found the entry myself, and it took a wet Thursday.`]) }));
  if (c.job) ask('job', () => { const job = c.job.toLowerCase(), a = /^[aeiou]/.test(job) ? 'an' : 'a'; return { kind: 'job', q: 'What do I do for my living?', ...opts(c.job, cast.jobs),
    said: pick('job-said', [`${cap(a)} «${job}» gets no days off, whatever the solicitors are doing.`, `I've been ${a} «${job}» since I was old enough to be shouted at. It's honest work, which is why it pays so badly.`]),
    told: pick('job-told', [`${He} ${they ? 'work' : 'works'} as ${a} ${job}, and will tell you so at length.`, `Occupation: ${job}. A good one, too. I've looked for complaints and found hardly any.`]) }; });
  if (c.town) ask('town', () => ({ kind: 'town', q: 'Where was I born?', ...opts(c.town.name, cast.towns),
    said: pick('town-said', [`I was born in «${c.town.name}», and they'll carry me out of «${c.town.name}» when the time comes.`, `«${c.town.name}» born and «${c.town.name}» bred. I went somewhere else once. I didn't care for it.`]),
    told: pick('town-told', [`${He} ${they ? 'were' : 'was'} born here in ${c.town.name} and ${they ? 'have' : 'has'} never left it for long.`, `Born in ${c.town.name}. ${He} ${they ? 'think' : 'thinks'} the rest of the world is a rumour.`]) }));
  // shuffled, then the kinds of question this story has asked least come first
  const order = qs.map(([kind, f]) => [rnd(), f, kind]).sort((a, b) => a[0] - b[0]);
  order.sort((a, b) => (asked[a[2]] || 0) - (asked[b[2]] || 0));
  for (const [, f] of order) { const z = f(); if (z.options) { asked[z.kind] = (asked[z.kind] || 0) + 1; return z; } }
  return null;
}

/**
 * Build the whole story for one root person.
 * Returns { title, hero, villain, benefactor, towns, home, now, chapters, missions, proofs }.
 */
export function buildStory(data, rootId, opts = {}) {
  const now = opts.now || new Date().getFullYear();
  const tree = opts.tree || collectAncestors(data, rootId, opts.maxGen || 12);
  const rootP = tree.people.get(rootId);
  const rnd = seededRandom(hashString('story' + rootId + data.individuals.size));
  const deal = dealer(hashString('lines' + rootId + data.individuals.size));   // its own shuffle, so the plot's dice are left alone
  const { chosen, est, spine, homeCountry, foreign } = chooseChapters(tree, data, now);

  const towns = new Map();
  const town = t => { if (!t) return null; if (!towns.has(t.id)) towns.set(t.id, t); return towns.get(t.id); };
  const hero = describe(rootP, data, { by: est.get(rootId) });
  const rootDeath = deathYear(rootP.indi);
  const present = Math.min(now, rootDeath ?? now, hero.byKnown && hero.by + 95 < now ? hero.by + 35 : now);
  const home = town(hero.town || (spine[0] && placeTown(evPlace(spine[0].indi, 'BIRT', 'RESI', 'CENS', 'DEAT'))) || DEFAULT_TOWN);

  // Things to make quiz wrong answers from.
  const all = [...tree.people.values()].map(p => p.indi);
  const cast = {
    surnames: [...new Set(all.map(i => i.surname).filter(Boolean))], names: all.map(displayName),
    maleNames: [...new Set(all.filter(i => i.sex === 'M').map(firstName))],
    jobs: [...new Set(all.flatMap(i => i.events.filter(e => e.tag === 'OCCU' && e.value).map(e => e.value.trim())))],
    towns: [...new Set(all.map(i => placeTown(evPlace(i, 'BIRT', 'CHR', 'BAPM'))?.name).filter(Boolean))],
  };
  for (const pad of [['surnames', ['Hargreaves', 'Pickles', 'Entwistle', 'Dobson']], ['maleNames', ['Josiah', 'Ezra', 'Abel', 'Enoch']], ['jobs', ['Rat catcher', 'Lamplighter', 'Knocker-up', 'Tripe dresser']], ['towns', ['Ormskirk', 'Todmorden', 'Wick', 'Skibbereen']], ['names', ['Josiah Pickles', 'Hannah Entwistle', 'Abel Dobson']]]) {
    if (cast[pad[0]].length < 5) cast[pad[0]].push(...pad[1]);
  }

  // ---- Chapters ----
  let lastTown = home;
  const usedSets = {}, usedJobs = {}, proven = new Set(['birth' + rootId]);
  const chapters = chosen.map(({ p, spine: onSpine }, i) => {
    const c = describe(p, data, { by: est.get(p.id) });
    const fam = familyThrough(data, p.id, p.primaryChild);
    const par = parentsOf(data, p.id);
    c.spine = onSpine;
    c.child = p.primaryChild ? data.individuals.get(p.primaryChild) : null;
    c.spouse = fam.spouse; c.marriage = fam.marriage; c.kids = fam.kids;
    c.father = par.father ? data.individuals.get(par.father) : null;
    c.mother = par.mother ? data.individuals.get(par.mother) : null;
    c.marriageYear = dateYear(fam.marriage?.date);
    const childBy = c.child ? birthYear(c.child) : null;
    const childBirth = c.child && findEvent(c.child, 'BIRT');
    const isTop = i === chosen.length - 1;
    // Which real event the chapter's big mission is built on: the least-used kind this person has.
    c.emig = c.indi.events.find(e => e.tag === 'EMIG' || e.tag === 'IMMI') || null;
    c.census = c.indi.events.find(e => (e.tag === 'CENS' || e.tag === 'RESI') && e.date && dateYear(e.date) >= c.by + 16) || null;
    const kidYears = fam.kids.map(birthYear).filter(y => y != null).sort((a, b) => a - b);
    const portraitYear = kidYears.length >= 3 ? kidYears[Math.min(kidYears.length - 1, 5)] + 3 : null;
    c.bapt = findEvent(c.indi, 'CHR', 'BAPM');
    const laterTown = placeTown(childBirth?.place) || placeTown(evPlace(c.indi, 'DEAT', 'BURI'));
    c.movedTo = c.town && laterTown && laterTown.country !== c.town.country ? laterTown : null;
    // somebody close who died while this person was grown: a parent, or the husband or wife
    c.late = null;
    for (const x of [c.father, c.mother, c.spouse]) {
      const ev = x && findEvent(x, 'BURI', 'DEAT', 'CREM'), yy = ev && dateYear(ev.date);
      if (yy != null && yy >= c.by + 16 && yy < (c.dy ?? 9999) && !proven.has('bur' + x.id)) { c.late = { indi: x, ev, year: yy }; break; }
    }
    const avail = [];
    if (c.emig || c.movedTo) avail.push('emig');
    if (c.group === 'arms' || c.indi.events.some(e => /MIL/.test(e.tag))) avail.push('arms');
    // (a birth or a wedding is only proved once, however many of the family get a chapter)
    if (c.spouse && !proven.has('wed' + fam.fam.id)) avail.push('wedding');
    if (c.child && !proven.has('birth' + c.child.id)) avail.push('birth');
    if (portraitYear != null && portraitYear >= 1850 && portraitYear < (c.dy ?? 9999)) avail.push('portrait');
    if (c.census) avail.push('census');
    if (c.bapt) avail.push('baptism');
    if (c.late) avail.push('burial');
    avail.push('chase');
    c.set = isTop ? 'finale' : avail.slice().sort((a, b) => (usedSets[a] || 0) - (usedSets[b] || 0))[0];
    usedSets[c.set] = (usedSets[c.set] || 0) + 1;
    if (c.set === 'wedding') proven.add('wed' + fam.fam.id);
    if (c.set === 'birth') proven.add('birth' + c.child.id);
    if (c.set === 'burial') proven.add('bur' + c.late.indi.id);
    // The chapter happens where and when that event did.
    const evTown = c.set === 'burial' ? placeTown(c.late.ev.place) : c.set === 'wedding' ? placeTown(fam.marriage?.place) : c.set === 'birth' ? placeTown(childBirth?.place) : c.set === 'census' ? placeTown(c.census.place) : null;
    c.town = town(evTown && evTown.key !== 'unknown' ? evTown : c.town || lastTown);
    lastTown = c.town;
    let year = c.set === 'burial' ? c.late.year : c.set === 'portrait' ? portraitYear : c.set === 'birth' && childBy != null ? childBy
      : c.set === 'emig' ? dateYear(c.emig?.date) ?? Math.min(c.by + 22, (childBy ?? 9999) - 1)
        : c.set === 'census' ? dateYear(c.census.date)
          : c.set === 'arms' ? c.by + 21
            : c.set === 'finale' ? c.by + 24
              : c.marriageYear ?? (childBy != null ? childBy - 1 : c.by + 25);
    year = Math.max(c.by + 16, Math.min(year, (c.dy ?? c.by + 70) - (c.set === 'birth' ? 0 : 1), present - 1));
    c.year = year;
    c.index = i;
    return c;
  });
  const finale = chapters.length ? chapters[chapters.length - 1] : null;
  const benefactor = chapters.filter(c => c.spine)[Math.min(2, Math.max(0, chapters.filter(c => c.spine).length - 1))] || hero;
  const surname = hero.surname || benefactor.surname || 'family';

  const missions = [];
  const proofs = [];
  const add = m => { m.index = missions.length; missions.push(m); return m; };
  const proof = (kind, who, title, detail) => { const pr = { id: kind + ':' + who.id, kind, person: who.id, title, detail }; proofs.push(pr); return pr; };
  const names = (t, y) => ({ church: lotName('church', t, y), hall: lotName('hall', t, y), pub: lotName('pub', t, y), works: lotName('works', t, y), farm: lotName('farm', t, y), hub: lotName('hub', t, y), market: lotName('market', t, y), infirmary: lotName('infirmary', t, y), police: lotName('police', t, y), post: lotName('post', t, y), garage: lotName('garage', t, y), phone: lotName('phone', t, y), school: lotName('school', t, y), office: lotName('office', t, y), home: 'the house' });
  const H = names(home, present);
  const heroBirth = findEvent(rootP.indi, 'BIRT');
  const relOfB = benefactor === hero ? 'own' : benefactor.rel;
  const estateOf = benefactor === hero ? `the ${surname} family` : `${benefactor.name}${benefactor.life ? ' (' + benefactor.life + ')' : ''}`;
  const next = chapters[0];

  // ---- Prologue (present day, home town) ----
  add({
    id: 'final-notice', act: 'Prologue', title: 'Final Notice', town: home.id, year: present, giver: { who: 'auto' }, hour: 9,
    brief: 'A solicitor\'s letter, a ringing phone box and a car that should not exist.',
    intro: [
      { who: 'letter', text: `FINAL NOTICE. Re: the dormant estate of ${estateOf}${benefactor.town && benefactor !== hero ? ', late of ' + benefactor.town.name : ''}. Unless a proven line of descent is lodged by the last day of the month, the estate passes to our client.` },
      { who: 'letter', text: `No reply is necessary. No reply will be read. Yours faithfully, S. Hargreaves, Hargreaves & Lowe, Probate Genealogists.` },
      { who: 'note', text: `You have never heard of Hargreaves & Lowe. You have barely heard of ${benefactor === hero ? 'any estate' : benefactor.first}. ` + (present >= 1925 ? `Outside, ${H.phone} on the corner is ringing. Nobody has rung it in twenty years, and it sounds surprised.` : `Outside, somebody has pinned a note to ${H.phone}, and it has your name on it. Spelled correctly, which is the worrying part.`) },
    ],
    steps: [
      { t: 'goto', at: 'phone', foot: true, text: present >= 1925 ? `Answer ${H.phone}` : `Read the note on ${H.phone}` },
      { t: 'talk', who: 'dot', at: 'phone', text: present >= 1925 ? `Answer ${H.phone}` : `Read the note on ${H.phone}`, lines: [
        `Is that ${hero.first}? ${benefactor === hero ? 'The ' + surname + ' heir' : cap(benefactor.first) + '\'s ' + (benefactor.gen ? 'great-'.repeat(Math.max(0, benefactor.gen - 2)) + (benefactor.gen > 1 ? 'grandchild' : 'child') : 'heir')}? Thank heavens. ${present >= 1925 ? 'I\'ve been ringing every phone box in the district.' : 'I\'ve pinned one of these to every board in the district.'}`,
        `Dorothy Pickering: County Archivist, retired. And family, though not from any year you would know. I'll explain later. It won't help.`,
        `Don't sign anything. Silas Hargreaves doesn't find heirs. He removes them. Names are going out of the registers like chalk off a slate, and yours is next in the queue.`,
        `Come to my lock-up behind ${H.pub}. Tell nobody. Oh, and I do hope you can drive.`] },
      { t: 'goto', at: 'garage', text: `Go to ${H.garage}` },
      { t: 'talk', who: 'dot', at: 'garage', text: 'Talk to Dorothy', lines: [
        `There she is. My late husband's estate car. We call her the Heirloom. He called her other things, mostly on hills.`,
        `I fitted the Parish Engine myself. It runs on register ink and it reads the road like a page. She turns the years back.`,
        `Or she will, once she is mended. The time engine is dead, and it wants three parts before it will go. I was a very bored archivist. Other people take up bowls.`,
        `But first, ${H.hall}. I want the ${surname} file out of there before Hargreaves's people shred it. Get in. The door sticks. Everything sticks.`,
        `Not so fast, mind. Nobody takes my husband's car anywhere until I've seen them handle her. Round the streets, dear. I'll shout. I'm good at it.`] },
      { t: 'drill', drills: ['speed', 'stop', 'reverse', 'slide', 'spin'], text: 'Driving lesson with Dorothy' },
      { t: 'goto', at: 'hall', need: 'heirloom', text: `Drive the Heirloom to ${H.hall}`, bark: { who: 'dot', text: `You'll do. Now: ${H.hall}, and don't spare her.` } },
      { t: 'chase', from: 'hall', hp: 4, slow: true, label: 'the grey van', drop: `the ${surname} file`, text: 'Ram the grey van until it drops the file. Any knock counts', bark: { who: 'dot', text: `Don't be gentle with it, dear. It's a hire van. Let him lose the deposit.` } },
    ],
    outro: [{ who: 'dot', text: `One birth certificate: ${hero.name}${heroBirth?.date ? ', born ' + datePhrase(heroBirth.date) : ''}${hero.town ? ' in ' + hero.town.name : ''}. That's proof number one. It proves you exist, which is a start.` },
      { who: 'dot', text: `Now we go backwards, one generation at a time, faster than he can rub them out.` }],
    reward: { cash: 150, proof: proof('birth', hero, `Birth of ${hero.name}`, [heroBirth?.date && cap(datePhrase(heroBirth.date)), hero.town?.name].filter(Boolean).join(', ') || 'Certified copy') },
  });
  add({
    id: 'ink-money', act: 'Prologue', title: 'Spare Parts', town: home.id, year: present, giver: { who: 'dot', at: 'garage' },
    brief: 'The time engine will not work until it has three parts: a valve, a clock spring and a bottle of register ink.',
    intro: [{ who: 'dot', text: `Before the Heirloom can travel in time she needs three things. A valve, from ${H.works}. A clock spring, from ${H.market}. And a bottle of proper register ink, from ${H.hall}.` },
      { who: 'dot', text: `Until she has all three, the time dial stays locked. And Hargreaves will have heard we're shopping, so expect company.` },
      { who: 'dot', text: `The ink costs money, and so will every ticket after it. So while you are at ${H.market}, earn some: ${H.pub} wants two crates fetched.` },
      { who: 'dot', text: `After today, look for the £ signs in any town in any year. There is always somebody who needs something shifted. It's the one constant of history.` }],
    // Every part is a different skill: pick-ups, a race, a careful load and a chase on foot.
    steps: [
      { t: 'collect', around: 'works', n: 4, radius: 7, label: 'valve parts', got: 'the valve', text: `Part 1 of 3: the valve came apart in ${H.works}'s yard. Pick up all four pieces`, bark: { who: 'dot', text: `The valve's in bits and the bits have rolled. Drive over each piece and it's yours. The white dots on the little map show where they've got to.` } },
      { t: 'goto', at: 'market', rival: true, got: 'the clock spring', text: `Part 2 of 3: one clock spring left at ${H.market}, and a grey van wants it. Get there first`, bark: { who: 'dot', text: `That grey van is after the same spring. Beat it there, dear. Cut corners. Use the handbrake. Forget what I said about hedges.` } },
      { t: 'carry', from: 'market', to: 'pub', n: 2, label: 'crates', gentle: true, timed: 1.8, text: `Earn the ink money: two crates of bottles from ${H.market} to ${H.pub}. Mind the glass`, bark: { who: 'dot', text: `Stop on the yellow ring to load, and on the next to unload. Those are bottles: three knocks and they're broken. Drive as if I were holding a full cup of tea. I am.` } },
      { t: 'catch', from: 'hall', label: 'the man in grey', drop: 'the bottle of register ink', speed: 4.3, time: 70, got: 'the register ink', text: `Part 3 of 3: a man in grey has run off with the ink from ${H.hall}. Catch him`, bark: { who: 'dot', text: `He's on foot, and he's quick. Get out and run after him, or catch him with the car if he's daft enough to stay on the road. I'd chase him myself, but, well. Hip.` } },
      { t: 'goto', at: 'garage', text: `Take all three parts back to Dorothy at ${H.garage}` },
    ],
    outro: [{ who: 'dot', text: `Valve. Spring. Ink. Hold the lamp, dear. No, higher. There. Hear that ticking?` },
      { who: 'dot', text: `The time dial is working. From now on you can set a year and drive there. I have waited forty years to say that to somebody.` }],
    reward: { cash: 180 }, unlock: 'TIME TRAVEL UNLOCKED',
  });
  if (next) add({
    id: 'first-jump', act: 'Prologue', title: 'Relative Speed', town: home.id, year: present, giver: { who: 'dot', at: 'garage' },
    brief: `Take the Heirloom back to ${next.year}.`,
    intro: [{ who: 'dot', text: `Your ${next.rel} ${next.first}${next.job ? ', the ' + next.job.toLowerCase() : ''}. ${next.town.id === home.id ? 'Right here in ' + home.name : cap(next.town.name) + (next.town.country !== home.country ? ', ' + next.town.nation : '')}, ${next.year}. That's the first page Hargreaves will go for.` },
      { who: 'dot', text: `${next.town.id === home.id ? '' : (next.town.country !== home.country ? `You'll need to get to ${next.town.nation} first: tickets at ${H.hub}. ` : `Get yourself to ${next.town.name} first: tickets at ${H.hub}. `)}Then set the dial with T, find a long straight road and keep your foot down until the dial reaches the year.` },
      { who: 'dot', text: `Don't lift off. She hates it when you lift off. She sulks, and a sulking time machine is nobody's friend.` }],
    steps: [{ t: 'travel', town: next.town.id, year: next.year, text: `Get to ${next.town.name} in ${next.year}` }],
    outro: [{ who: 'note', text: `${next.town.name}, ${next.year}. ${eraArrival(next.year, deal)}` }],
    reward: { cash: 60 },
  });

  // ---- Which scheme Hargreaves tries in each chapter ----
  {
    const real = chapters.length - 1, convoyAt = real >= 3 ? Math.ceil(real / 2) : -1;
    const pool = Object.keys(SCHEMES).map(k => [rnd(), k]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    let prev = null;
    // the day's work is settled first (the same trade twice in one family gets a different job the second time),
    // so the meeting can be picked to play differently from it
    const usedJobs = {};
    chapters.forEach(c => {
      const jobKeys = [c.group, c.group + 'B', 'odd', 'shop', 'rail', 'serve', 'careB', 'craftB'].filter(k => DAY_JOBS[k]);
      c.jobKey = jobKeys.find(k => !usedJobs[k]) || c.group;
      if (c !== finale) usedJobs[c.jobKey] = true;
      const N = names(c.town, c.year);
      c.jobMech = (DAY_JOBS[c.jobKey] || DAY_JOBS.odd)({ ...N, year: c.year, first: c.first, jobL: c.jobs.join(' ').toLowerCase() }).steps[0].t;
    });
    chapters.forEach((c, i) => {
      if (c === finale) { c.scheme = 'search'; return; }
      const bad = k => k === prev || SCHEME_MECH[k] === c.jobMech || (i === 0 && k === 'forgery') || (i === convoyAt && k === 'siege') || (chapters[i + 1] === finale && k === 'search');
      let k = pool.find(x => !bad(x)) || pool[0] || 'search';
      pool.splice(pool.indexOf(k), 1);
      if (!pool.length) pool.push(...Object.keys(SCHEMES).filter(x => x !== k));
      c.scheme = prev = k;
    });
  }
  const usedTwists = {}, asked = {};

  // ---- One chapter per chosen ancestor ----
  chapters.forEach((c, i) => {
    const isFinale = c === finale;
    const N = names(c.town, c.year), w = eraWords(c.year);
    const ctx = { ...N, year: c.year, first: c.first, jobL: c.jobs.join(' ').toLowerCase() };
    const pay = 160 + i * 50;
    const act = isFinale ? 'Finale' : `Chapter ${i + 1}`;
    const base = { act, town: c.town.id, year: c.year, chapter: i };
    const relLine = `${c.name}, your ${c.rel}`;
    const quiz = quizFor(c, cast, rnd, deal, asked);
    c.quizSaid = quiz?.said || '';
    if (quiz) {
      // what they say to each answer: one "right", one "right at last", and three different ways of saying "wrong"
      const from = LINES.wrong.indexOf(deal('wrong', LINES.wrong));
      Object.assign(quiz, { right: deal('right', LINES.right), rightAtLast: deal('rightAtLast', LINES.rightAtLast), wrong: [0, 3, 5].map(k => LINES.wrong[(from + k) % LINES.wrong.length]) });
    }
    // If you have already been born by this year, they know a child of your name, and it is not you.
    // (Unless this is the very year, and the chapter is about you being born: then you are still on the way.)
    const age = hero.byKnown && c.year >= hero.by && !(c.year === hero.by && c.set === 'birth') ? c.year - hero.by : null;
    const kidWord = c.gen === 1 ? (hero.sex === 'M' ? 'son' : hero.sex === 'F' ? 'daughter' : 'child') : c.gen === 2 ? (hero.sex === 'M' ? 'grandson' : hero.sex === 'F' ? 'granddaughter' : 'grandchild') : (hero.sex === 'M' ? 'great-grandson' : hero.sex === 'F' ? 'great-granddaughter' : 'great-grandchild');
    const ageWord = age == null ? '' : age === 0 ? 'a babe in arms' : age === 1 ? 'a year old' : `${NUM[age] || age} years old`;
    const [hHe, hHim] = PRON[hero.sex] || PRON.U;
    const young = age != null && age < 16;       // old enough, and they simply would not believe it was you grown up
    const they = c.he === 'they';
    const X = { He: cap(c.he), he: c.he, him: c.him, his: c.his, has: they ? 'have' : 'has', is: they ? 'are' : 'is', does: they ? 'do' : 'does', knows: they ? 'know' : 'knows',
      hero: hero.first, kid: kidWord, age: ageWord, hHe, hHim, doing: age == null ? '' : age < 3 ? 'asleep indoors' : age < 11 ? 'out playing in the street' : 'supposed to be at school' };
    const knowsNote = age == null ? (isFinale ? `Be polite: ${c.he} ${X.is} the oldest relative you will ever meet, and ${X.has} no idea you are coming.` : deal('stranger', LINES.stranger)(X))
      : (isFinale ? 'Be polite. ' : '') + (young ? deal('knowsChild', LINES.knowsChild)(X) : deal('knowsGrown', LINES.knowsGrown)(X));
    const workLot = { haul: 'works', cloth: 'works', craft: 'works', farm: 'farm', sea: 'hub', rail: 'hub', shop: 'market', care: 'infirmary', school: 'school', arms: 'police', desk: 'hall' }[c.group] || 'church';
    const spots = [...new Set(['home', workLot, 'pub', 'church'])].slice(0, 3);
    const sch = SCHEMES[c.scheme]({ c, N, w, workLot, spots });
    c.schemeInfo = sch;
    // What they say when you find them: a wary opening, why they are wary (the scheme), and the challenge before the quiz.
    // The very top of the tree has lines of its own.
    const wary = isFinale ? `There's a grey fellow been round all week asking after the parish book, and now there's you.` : sch.wary;
    const knowsLines = isFinale && age == null ? [`Kin? I have no kin. ${wary} Tell me one true thing about myself, and I'll hear the rest.`]
      : age == null ? [`${deal('wary', LINES.wary)} ${wary}`, deal('challenge', LINES.challenge)]
        : [(young ? deal('waryChild', LINES.waryChild) : deal('waryGrown', LINES.waryGrown))(X), wary, deal('challenge', LINES.challenge)];
    const knowsOutro = age == null ? deal('welcome', LINES.welcome) : deal('welcomeKnown', LINES.welcomeKnown)(X);
    const noteAt = deal('noteAt', LINES.noteAt), clue = quiz?.told ? ` ${deal('remember', LINES.remember)} ${quiz.told}` : '';
    // 1. Meet them, the way this chapter's scheme decides.
    add({
      ...base, id: `meet-${i}`, title: isFinale ? 'Brick Wall' : `Meeting ${c.first}`, giver: { who: 'dot', at: 'phone' },
      brief: `Find ${relLine}, in ${c.town.name}, ${c.year}.`,
      intro: isFinale
        ? [{ who: 'dot', text: `${noteAt} "${c.name}, your ${c.rel}${c.job ? ', ' + c.job.toLowerCase() : ''}. Try the house first. If ${c.he} ${X.is} out, ${c.he} will be at ${N[spots[1]]}, and failing that ${N[spots[2]]}. ${knowsNote}${clue}"` }]
        : [{ who: 'dot', text: `${noteAt} "${c.name}, your ${c.rel}${c.job ? ', ' + c.job.toLowerCase() : ''}. ${sch.note} ${knowsNote}${clue}"` }],
      scheme: isFinale ? null : c.scheme,
      steps: [...(isFinale
        ? [{ t: 'search', spots, miss: { 0: `Nobody in. A neighbour thinks ${c.he} went up to ${N[spots[1]]}. "Walks everywhere, that one. Always has."`, 1: `An old man shakes his head. "You want ${N[spots[2]]}. And a hat, in this weather."`, 2: `Empty. A dog looks at you, then pointedly towards ${N[spots[1]]}.` }, text: `Find ${c.first}` }]
        : sch.steps),
        { t: 'talk', who: c.id, at: isFinale ? '@found' : sch.talkAt, greet: true, quiz, text: `Talk to ${c.first}`, lines: knowsLines }],
      outro: [{ who: c.id, text: isFinale
        ? `Then you're mine, sure enough, though how is past my wits. There's nobody behind me in any book, you know. I'm where it starts.`
        : knowsOutro }],
      reward: { cash: 80 + i * 10 },
    });
    // 2. A day's work
    const jobKey = c.jobKey;
    const job = spice((DAY_JOBS[jobKey] || DAY_JOBS.odd)(ctx));
    if (!isFinale && job.steps.length === 1) {
      const last = job.steps[0], end = last.to || last.at || last.around || (last.stops && last.stops[last.stops.length - 1]) || 'market';
      const avoid = new Set([last.t, SCHEMES[c.scheme]({ c, N, w, workLot, spots }).mech]);
      const keys = Object.keys(DAY_TWISTS).filter(k => !avoid.has(k)).sort((a, b) => (usedTwists[a] || 0) - (usedTwists[b] || 0) || (a < b ? -1 : 1));
      const tk = keys[i % Math.min(2, keys.length)] || keys[0];
      usedTwists[tk] = (usedTwists[tk] || 0) + 1;
      job.steps = [...job.steps, DAY_TWISTS[tk](end, c, w, deal)];
    }
    const jobL = c.job.toLowerCase(), an = /^[aeiou]/.test(jobL) ? 'an' : 'a';
    if (!isFinale) add({
      ...base, id: `work-${i}`, title: job.title, giver: { who: c.id, at: c.group === 'farm' ? 'farm' : ['haul', 'cloth', 'craft'].includes(c.group) ? 'works' : c.group === 'sea' ? 'hub' : 'home' },
      brief: `${c.first}${c.job ? ' the ' + c.job.toLowerCase() : ''} could use a hand.`,
      intro: [...(c.job ? [{ who: c.id, text: deal('trade', LINES.trade)({ a: an, A: cap(an), job: q(jobL) }) }] : []), { who: c.id, text: job.ask }],
      steps: job.steps,
      outro: [{ who: c.id, text: deal('paid', LINES.paid) }],
      reward: { cash: pay },
    });
    // 3. The set piece, built on a real event from the file
    const groom = c.sex === 'F' ? c.spouse : c.indi, bride = c.sex === 'F' ? c.indi : c.spouse;
    const emig = c.emig, census = c.census, bapt = c.bapt;
    const childBirth = c.child && findEvent(c.child, 'BIRT');
    const kind = c.set;
    const when = d => d ? ' ' + datePhrase(d) : '';
    let set;
    // The same kind of event can come up in two chapters, so every ask, shout and verdict has two versions ([D-...] ALT 1 and 2).
    const v = deal('set-' + kind, [0, 1]), alt = (a, b) => v ? b : a;
    if (kind === 'wedding') {
      const g = groom ? firstName(groom) : 'the groom', b = bride ? firstName(bride) : 'the bride';
      set = { title: 'Get Me to the Church', brief: `${g} and ${b} are to be married${when(c.marriage?.date)}. Hargreaves would rather they weren't.`,
        ask: c.sex === 'F'
          ? alt([`It's my wedding morning and «${g}» has not come. Somebody's had the wheels off every ${w.ride} in the street, and the parson won't wait past the bells.`, `He'll be at «${N.pub}», sick with nerves. Fetch him to church or there's no wedding, and then where will you be?`],
            [`I've been in this frock since dawn and there's no sign of «${g}». Every ${w.ride} for a mile has been got at, and the bells are about to start.`, `Try «${N.pub}» first. He'll be staring into a glass, working up to it. Bring him to the church, and tell him I said so.`])
          : alt([`It's my wedding morning and I'm stranded. There isn't a ${w.ride} in the road with a wheel left on it, and the parson is a stickler for time.`, `Get me to that church. If I'm not wed today then there's no us, and by the look on your face there's no you.`],
            [`I'm to be married within the hour, and some grey villain has wrecked every ${w.ride} we had. I've a clean collar, a speech, and no way of getting there.`, `You've a vehicle, of sorts. Take me to church. And if you see me reaching for the door on the way, speed up.`]),
        steps: [{ t: 'carry', from: c.sex === 'F' ? 'pub' : 'home', to: 'church', n: 1, label: 'groom', passenger: g, timed: 1.05, text: `Get ${g} to ${N.church} before the bells stop`, bark: { name: g, text: `I've changed my mind. No. No, I haven't. Faster!` } },
          { t: 'chase', from: 'church', hp: 4 + Math.min(3, i), label: `the ${w.van}`, drop: 'the marriage register', text: `They've snatched the register! Stop the ${w.van}` }],
        done: alt(`${g} and ${b}, married. It's in the book and the ink's dry.`, `${g} and ${b}: wed, witnessed and written down. I do love a wedding I'm not catering.`),
        proof: proof('marriage', c, `Marriage of ${groom ? displayName(groom) : g} and ${bride ? displayName(bride) : b}`, [c.marriage?.date && cap(datePhrase(c.marriage.date)), placeTown(c.marriage?.place)?.name || c.town.name].filter(Boolean).join(', ')) };
    } else if (kind === 'birth') {
      const kid = firstName(c.child);
      set = { title: 'Special Delivery', brief: `${kid} is due${when(childBirth?.date)}, and the midwife is nowhere to be found.`,
        ask: [alt(`The baby's coming and the midwife's not: some grey devil has ${c.year >= 1900 ? 'let her tyres down' : 'lamed her pony'}. Fetch her from «${N.infirmary}», and drive like the child's life hangs on it. Yours might, come to think.`,
          `It's the baby, it's now, and the midwife is stranded: some grey devil has ${c.year >= 1900 ? 'let her tyres down' : 'lamed her pony'}. She'll be at «${N.infirmary}». Go like the wind, and don't come back without her.`)],
        steps: [{ t: 'carry', from: 'infirmary', to: 'home', n: 1, label: 'midwife', passenger: 'the midwife', timed: 1.0, text: `Rush the midwife from ${N.infirmary} to the house`, bark: { name: 'The midwife', text: `I've delivered half this town and I'll not be late for this one. Whatever this thing is, make it go.` } },
          { t: 'collect', around: 'hall', radius: 14, n: 6, label: 'register pages', timed: 1.4, text: `Hargreaves's men have scattered the birth register. Collect every page near ${N.hall}` }],
        done: c.child.id === rootId ? `${displayName(c.child)}, safely born and safely in the register. That one is you, by the way. You were very red.`
          : alt(`${displayName(c.child)}, born safe and written down. One more link that holds.`, `A baby: ${displayName(c.child)}. Loud, healthy and entered in the register. That's another one he can't have.`),
        proof: proof('birth', { id: c.child.id }, `Birth of ${displayName(c.child)}`, [childBirth?.date && cap(datePhrase(childBirth.date)), placeTown(childBirth?.place)?.name || c.town.name].filter(Boolean).join(', ')) };
    } else if (kind === 'emig') {
      const dest = (c.movedTo || placeTown(evPlace(c.indi, 'IMMI', 'DEAT', 'BURI')))?.nation;
      const air = c.year >= 1950;
      set = { title: air ? 'Final Call' : 'The Last Boat', brief: `${c.first} is leaving${dest && dest !== c.town.nation ? ' for ' + dest : ''}${when(emig?.date)}. The ${w.boat} will not wait.`,
        ask: [alt(`The ${w.boat} ${air ? 'leaves within the hour' : 'sails on the tide'}${dest && dest !== c.town.nation ? ' for «' + dest + '»' : ''}, and every ${air ? 'taxi' : 'carter'} in town has been paid by some grey gentleman to be busy. Get the trunks to «${N.hub}», then come back for me.`,
          `I've a ticket${dest && dest !== c.town.nation ? ' for «' + dest + '»' : ''} and no way to «${N.hub}»: every ${air ? 'taxi' : 'carter'} for miles is suddenly spoken for. The ${w.boat} ${air ? 'leaves within the hour' : 'sails on the tide'}. Trunks first, then me. I'm lighter, but I matter more.`)],
        steps: [{ t: 'carry', from: 'home', to: 'hub', n: 2, label: 'trunks', timed: 1.2, text: `Get both trunks to ${N.hub}`, bark: { who: c.id, text: `Don't look back at the house. It's bad luck to look back.` } },
          { t: 'carry', from: 'home', to: 'hub', n: 1, label: 'traveller', passenger: c.first, who: c.id, timed: 1.0, text: `Now ${c.first}. The ${w.boat} is about to leave` },
          { t: 'chase', from: 'hub', hp: 4 + Math.min(3, i), label: `the ${w.van}`, drop: 'the passenger list', text: `Hargreaves's men have the passenger list. Stop the ${w.van}` }],
        done: alt(`${c.name}, on the passenger list in black and white. Wherever ${c.he} went, ${c.he} went on the record.`, `${c.name}: name, age and luggage, all on the passenger list. Gone abroad, and nobody can say otherwise.`),
        proof: proof('passage', c, `Passage of ${c.name}`, [emig?.date ? cap(datePhrase(emig.date)) : String(c.year), dest && 'bound for ' + dest].filter(Boolean).join(', ') || 'Passenger list') };
    } else if (kind === 'arms') {
      set = { title: 'The King\'s Shilling', brief: `${c.first} has orders, and somebody has been at the muster roll.`,
        ask: alt([`I'm to report, and the muster roll's gone missing with my name on it. No roll, no record, and a soldier with no record never served.`, `Run these dispatches round, and then get me to «${N.hub}» before the column moves off.`],
          [`The muster roll has vanished, and my name with it. The army won't feed anybody who isn't on a list. I've asked.`, `Take these dispatches round for the sergeant, then get me to «${N.hub}» before they march. I'd rather not chase a column on foot.`]),
        steps: [{ t: 'race', stops: ['police', 'hall', 'church', 'post', 'home'], timed: 1.1, text: 'Carry the dispatches round the town' },
          { t: 'carry', from: 'home', to: 'hub', n: 1, label: 'soldier', passenger: c.first, who: c.id, timed: 1.0, text: `Get ${c.first} to ${N.hub} before the column leaves` }],
        done: alt(`${c.name}, on the muster roll. Served, counted and remembered.`, `${c.name}: present on parade and present in the roll. The army loses a great many things, but not that page. Not today.`),
        proof: proof('service', c, `Service record of ${c.name}`, c.job || 'Muster roll') };
    } else if (kind === 'census') {
      set = { title: 'Count Me In', brief: `Census night${when(census.date)}. The enumerator has lost his nerve and most of his schedules.`,
        ask: [alt(`The census man's been round in tears. A grey ${w.ride === 'cart' ? 'carriage' : 'van'} knocked him flat and took his schedules. If this street isn't counted tonight, we were never here. Do his round for him and get the book back.`,
          `They've robbed the census man. A grey ${w.ride === 'cart' ? 'carriage' : 'van'} had him over and made off with every form. He's sat on my step with a cup of something. You'll have to count the street yourself, and fetch his book back.`)],
        steps: [{ t: 'race', stops: ['home', 'pub', 'farm', 'school', 'market', 'church'], timed: 1.25, text: 'Do the enumerator\'s round before midnight', bark: { who: c.id, text: `Knock loud. Half of them will think you're the rent man and hide.` } },
          { t: 'chase', from: 'hall', hp: 4 + Math.min(3, i), label: `the ${w.van}`, drop: 'the census schedules', text: `Get the schedules back from the ${w.van}` }],
        done: alt(`${c.name}${c.job ? ', ' + c.job.toLowerCase() : ''}, counted at ${c.town.name}. Present and correct.`, `The whole street counted, and there in the middle: ${c.name}${c.job ? ', ' + c.job.toLowerCase() : ''}, of ${c.town.name}. I do like a tidy column.`),
        proof: proof('census', c, `Census entry for ${c.name}`, [dateYear(census.date), placeTown(census.place)?.name || c.town.name].filter(Boolean).join(', ')) };
    } else if (kind === 'baptism') {
      set = { title: 'Wet the Baby\'s Head', brief: `${c.first}'s own baptism entry${when(bapt.date)} is coming loose from the book.`,
        ask: [alt(`Parson says the register fell open in the night and the wind took the pages. In a shut vestry. With the door locked. The page with my name on is out there somewhere, and I'd like to go on having been christened.`,
          `The baptism pages have blown clean out of the church, parson says. Blown. Through a bolted door. Mine's among them, and without it I'm a heathen on paper. Help me gather them in.`)],
        steps: [{ t: 'collect', around: 'church', radius: 15, n: 7, label: 'register pages', timed: 1.4, text: `Gather the register pages around ${N.church}` },
          { t: 'chase', from: 'church', hp: 4 + Math.min(3, i), label: `the ${w.van}`, drop: 'the last page', text: `The last page is in the ${w.van}. Stop it` }],
        done: alt(`${c.name}, baptised${when(bapt.date)}. Back in the book.`, `Christened and recorded: ${c.name}${bapt.date ? ',' + when(bapt.date) : ''}. The page is a little muddy, but so was the baby, I expect.`),
        proof: proof('baptism', c, `Baptism of ${c.name}`, [bapt.date && cap(datePhrase(bapt.date)), placeTown(bapt.place)?.name || c.town.name].filter(Boolean).join(', ')) };
    } else if (kind === 'burial') {
      const L = c.late, who = displayName(L.indi), rel = L.indi.id === c.spouse?.id ? (L.indi.sex === 'M' ? 'husband' : 'wife') : L.indi.sex === 'M' ? 'father' : 'mother';
      set = { title: 'Set in Stone', brief: `${who} is to be buried${when(L.ev.date)}, and somebody has been to see the mason.`,
        ask: alt([`We bury my ${rel} today. «${who}». The mason has the stone cut and paid for, and a man in grey has been at him to leave the name off it.`, `Fetch the stone from «${N.works}» to the churchyard, and go gently. It is the last thing we shall ever give ${L.indi.sex === 'F' ? 'her' : 'him'}.`],
          [`It's the funeral today. «${who}», my ${rel}. There's a headstone waiting at «${N.works}», and a grey stranger hanging about it with a purse and a chisel.`, `Bring the stone to the churchyard for me. Slowly, please. «${firstName(L.indi)}» was never hurried in life, and won't thank you for it now.`]),
        steps: [{ t: 'carry', from: 'works', to: 'church', n: 1, label: 'headstone', gentle: true, timed: 1.7, text: `Carry the headstone from ${N.works} to ${N.church}, gently` },
          { t: 'catch', from: 'church', label: 'man in grey with a chisel', drop: 'the chisel', text: 'A man in grey is at the stone with a chisel. Catch him' }],
        done: alt(`${who}, laid to rest and named in stone. They cannot rub out granite.`, `${who}: buried with a name, a date and a good stone over the top. He'll need more than bleach for that.`),
        proof: proof('burial', { id: L.indi.id }, `Burial of ${who}`, [L.ev.date && cap(datePhrase(L.ev.date)), placeTown(L.ev.place)?.name || c.town.name].filter(Boolean).join(', ')) };
    } else if (kind === 'portrait') {
      const kids = c.kids.filter(k => (birthYear(k) ?? 0) <= c.year).slice(0, 6), names = kids.map(firstName);
      set = { title: 'Watch the Birdie', brief: `A likeness of the whole ${c.child?.surname || c.surname} family, ${c.year}. If anybody can find the children.`,
        ask: alt([`There's a photographer come to «${N.hub}», and we've saved a twelvemonth for one likeness of us all. The minute they were washed the children scattered: ${names.map(n => '«' + n + '»').join(', ')}.`, `Find every one, then fetch the man himself before he loses the light. A grey fellow's been offering him double to go home.`],
          [`We're to be photographed today, all of us, and I had every child clean for a full minute. Then I turned my back. ${names.map(n => '«' + n + '»').join(', ')}: gone.`, `Round them up, then bring the photographer from «${N.hub}». Some grey article has been paying him to pack up early.`]),
        steps: [{ t: 'collect', around: 'home', radius: 12, n: names.length, names, label: 'children', timed: 1.7, text: `Round up the children: ${names.join(', ')}` },
          { t: 'carry', from: 'hub', to: 'home', n: 1, label: 'photographer', passenger: 'the photographer', timed: 1.1, text: `Fetch the photographer from ${N.hub} before the light goes`, bark: { name: 'The photographer', text: `Nobody is to smile. It takes eight seconds and smiling is a strain.` } },
          { t: 'chase', from: 'home', hp: 4 + Math.min(3, i), label: `the ${w.van}`, drop: 'the glass plate', text: `They have the glass plate! Stop the ${w.van}` }],
        done: alt(`One photograph: ${names.join(', ')}, and their parents trying not to blink. Nobody can rub out a photograph.`, `Got it. ${names.join(', ')}, all facing the same way for the only time in their lives. Let him try unpicking that.`),
        proof: proof('portrait', c, `Photograph of the ${c.child?.surname || c.surname} family`, [String(c.year), c.town.name, names.join(', ')].filter(Boolean).join(', ')) };
    } else if (kind === 'chase') {
      set = { title: 'Struck Out', brief: `Hargreaves's men are at ${N.hall} with a bottle of ink remover.`,
        ask: [alt(`That grey lot are at «${N.hall}» this minute with the book open at our page. I saw them through the window. Whatever that contraption of yours does, do it now.`,
          `They're in «${N.hall}» right now, the grey ones, with a knife out and the register open. At OUR page. Get that machine of yours moving.`)],
        steps: [{ t: 'goto', at: 'hall', timed: 1.0, text: `Get to ${N.hall}` },
          { t: 'catch', from: 'hall', label: 'grey clerk', drop: 'the torn page', text: 'A clerk in grey has the page under his coat. Run him down on foot', bark: { name: 'The clerk', text: `It's only a name! You've hundreds!` } },
          { t: 'chase', from: 'hall', hp: 5 + Math.min(3, i), label: `the ${w.van}`, drop: 'the parish book', text: `Stop the ${w.van} and get the book back` }],
        done: alt(`${c.name}: the entry stands.`, `Still there in ink: ${c.name}. And one parish clerk who will think twice next time.`),
        proof: proof('entry', c, `Parish entry for ${c.name}`, [c.life, c.town.name].filter(Boolean).join(', ')) };
    }
    if (set) {
      const g = groom ? firstName(groom) : 'the groom', van = `the ${w.van}`, hp = 4 + Math.min(3, i);
      const kidNames = c.kids.filter(k => (birthYear(k) ?? 0) <= c.year).slice(0, 6).map(firstName);
      const acts = {
        wedding: [
          c.sex === 'F'
            ? { t: 'search', spots: ['pub', 'works', 'market'], miss: { 0: `"He was in here an hour since, white as his shirt. Ordered a drink and forgot to drink it. Try ${N.works}."`, 1: `"Came and went. Said he needed air. There's plenty of that at ${N.market}."`, 2: `"The bridegroom? Went off towards ${N.works} with a face like a wet week, practising saying 'I will'."` }, text: `Find ${g}. He has lost his nerve somewhere` }
            : { t: 'search', spots: ['pub', 'market', 'works'], miss: { 0: `"The best man? He was showing everybody the ring. Dropped it twice. Try ${N.market}."`, 1: `"He was here. He's gone to ${N.works} to borrow a collar stud. He'd already borrowed the collar."`, 2: `"You've just missed him. ${cap(N.market)}, most like, writing his speech on his cuff."` }, text: 'Find the best man. He has the ring' },
          { t: 'carry', from: c.sex === 'F' ? '@found' : 'home', to: 'church', n: 1, label: 'groom', passenger: g, timed: 1.05, rival: true, tokens: 2, text: `Get ${g} to ${N.church} before the men in grey bar the door`, bark: { name: g, text: alt(`I've changed my mind. No. No, I haven't. Faster!`, `Does it go any quicker? No, slower. No. Quicker. Sorry. It's my first wedding.`) } },
          { t: 'chase', from: 'church', hp, label: van, drop: 'the marriage register', text: `They've snatched the register! Stop ${van}` },
          { t: 'carry', from: 'church', to: 'pub', n: 1, label: 'couple', passenger: 'the happy couple', gentle: true, text: `Drive the happy couple to the wedding breakfast at ${N.pub}. Gently: it is the only good frock she has`, bark: { name: bride ? firstName(bride) : 'The bride', text: alt(`Mind my frock. And mind him, he's gone the colour of the cake.`, `Married! Drive carefully. I've only had him ten minutes.`) } },
        ],
        birth: [
          { t: 'search', spots: ['infirmary', 'church', 'market'], miss: { 0: `"The midwife? Out on a call. Twins, ${N.church} way. It's always twins when you're in a hurry."`, 1: `"You've missed her. She went to ${N.market} for carbolic. She gets through a deal of carbolic."`, 2: `"She's been and gone, and told me off on her way out. Try ${N.church}."` }, text: 'Find the midwife. She is out on her rounds' },
          { t: 'carry', from: '@found', to: 'home', n: 1, label: 'midwife', passenger: 'the midwife', timed: 1.05, blocks: 1, tokens: 2, text: 'Rush the midwife to the house. Men in grey have blocked the street', bark: { name: 'The midwife', text: alt(`I've delivered half this town and I'll not be late for this one. Whatever this thing is, make it go.`, `I've been to births by cart, by boat and once carried on a door. This is new. Go on, then, and mind the bumps.`) } },
          { t: 'collect', around: 'hall', radius: 14, n: 6, label: 'register pages', timed: 1.6, hunt: 1, text: `Hargreaves's men have scattered the birth register. Collect every page near ${N.hall}` },
          { t: 'goto', at: 'hall', timed: 1.3, rival: 0.4, text: `Get the pages back to ${N.hall} before Hargreaves's clerk gets there first` },
        ],
        emig: [
          { t: 'carry', from: 'home', to: 'hub', n: 2, label: 'trunks', timed: 1.25, spill: true, tokens: 2, text: `Get both trunks to ${N.hub}`, bark: { who: c.id, text: alt(`Don't look back at the house. It's bad luck to look back.`, `Careful with that one. It's my whole life, and also the good teapot.`) } },
          { t: 'carry', from: 'home', to: 'hub', n: 1, label: 'traveller', passenger: c.first, who: c.id, timed: 1.1, switch: { to: 'post', name: c.first, text: alt('The tickets! I left the tickets at the post office!', 'Stop! The tickets! They\'re on the post office counter, where I put them so I shouldn\'t forget them!') }, text: `Now ${c.first}. The ${w.boat} is about to leave` },
          { t: 'goto', at: 'hub', timed: 1.15, blocks: 1, text: `Tickets in hand. Get to ${N.hub} before they take the gangway up` },
          { t: 'chase', from: 'hub', hp, label: van, drop: 'the passenger list', text: `Hargreaves's men have the passenger list. Stop ${van}` },
        ],
        arms: [
          { t: 'race', stops: ['police', 'hall', 'church', 'post', 'home'], timed: 1.15, tokens: 3, hunt: 1, text: 'Carry the dispatches round the town' },
          { t: 'carry', from: 'home', to: 'hub', n: 1, label: 'soldier', passenger: c.first, who: c.id, timed: 1.05, rival: true, text: `Get ${c.first} to ${N.hub} before the column leaves` },
          { t: 'catch', from: 'hub', label: 'grey clerk', drop: 'the muster roll', text: 'A grey clerk is striking names off the muster roll. Catch him' },
        ],
        census: [
          { t: 'race', stops: ['home', 'pub', 'farm', 'school', 'market', 'church'], timed: 1.3, tokens: 3, hunt: 1, text: 'Do the enumerator\'s round before midnight', bark: { who: c.id, text: alt(`Knock loud. Half of them will think you're the rent man and hide.`, `Count everybody. Even him at the end house, though he'll shout through the door that he's out.`) } },
          { t: 'search', spots: ['pub', 'farm', 'market'], miss: { 0: `"The lodger? He scarpered when he heard the census was coming. He's not fond of being written down. Try ${N.farm}."`, 1: `"Slept in the barn and went at first light, with one of my hens under his coat. ${cap(N.market)}, maybe."`, 2: `"Him? Owes me for a week. If you find him at ${N.farm}, count him twice."` }, text: 'One lodger is dodging the count. Find where he has gone to ground' },
          { t: 'catch', from: '@found', label: 'the lodger', drop: 'his name, age and occupation', text: 'There he goes! Catch him and count him' },
          { t: 'chase', from: 'hall', hp, label: van, drop: 'the census schedules', text: `Now get the schedules back from ${van}` },
        ],
        portrait: [
          { t: 'collect', around: 'home', radius: 12, n: kidNames.length, names: kidNames, label: 'children', timed: 1.7, text: `Round up the children: ${kidNames.join(', ')}` },
          { t: 'search', spots: ['hub', 'pub', 'market'], miss: { 0: `"The photographer? Gone to wet his whistle at ${N.pub}. Says it steadies the hand."`, 1: `"He was here. Went to ${N.market} to buy a new cloth for his head. The old one had a moth, and the moth was in three pictures."`, 2: `"The picture man? He asked where a body could get a drink. I said ${N.pub}. He ran."` }, text: 'Find the photographer' },
          { t: 'carry', from: '@found', to: 'home', n: 1, label: 'photographer', passenger: 'the photographer', gentle: true, timed: 1.5, text: 'Bring him to the house without breaking his camera', bark: { name: 'The photographer', text: alt(`Nobody is to smile. It takes eight seconds and smiling is a strain.`, `Stand still. Stiller. If the baby moves it comes out as a ghost, and I charge extra for ghosts.`) } },
          { t: 'chase', from: 'home', hp, label: van, drop: 'the glass plate', text: `They have the glass plate! Stop ${van}` },
        ],
        burial: [
          { t: 'carry', from: 'works', to: 'church', n: 1, label: 'headstone', gentle: true, timed: 1.7, text: `Carry the headstone from ${N.works} to ${N.church}, gently` },
          { t: 'defend', from: 'home', to: 'church', hp: 7, waves: 4, text: `See the funeral safe from the house to ${N.church}. They mean to turn it back` },
          { t: 'catch', from: 'church', label: 'man in grey with a chisel', drop: 'the chisel', text: 'A man in grey is at the stone with a chisel. Catch him' },
        ],
        baptism: [
          { t: 'collect', around: 'church', radius: 15, n: 7, label: 'register pages', timed: 1.4, text: `Gather the register pages around ${N.church}` },
          { t: 'search', spots: ['pub', 'infirmary', 'farm'], miss: { 0: `"Parson's out visiting the sick. ${cap(N.infirmary)}. He'll be a while. He takes his sermons with him."`, 1: `"He's been and gone. Up at ${N.farm}, I heard, having words with a goat that ate a hymn book."`, 2: `"Parson? Went by at a trot, holding his hat on. ${cap(N.infirmary)}, I'd say."` }, text: 'Find the parson to sign the entry afresh' },
          { t: 'carry', from: '@found', to: 'church', n: 1, label: 'parson', passenger: 'the parson', timed: 1.1, rival: true, text: `Get the parson to ${N.church} before the men in grey` },
          { t: 'chase', from: 'church', hp, label: van, drop: 'the last page', text: `The last page is in ${van}. Stop it` },
        ],
        chase: [
          { t: 'goto', at: 'hall', timed: 1.1, blocks: 2, text: `Get to ${N.hall}. They have blocked the road` },
          { t: 'catch', from: 'hall', label: 'grey clerk', drop: 'the torn page', text: 'A clerk in grey has the page under his coat. Run him down on foot', bark: { name: 'The clerk', text: alt(`It's only a name! You've hundreds!`, `He said nobody would mind! He said nobody would even notice!`) } },
          { t: 'chase', from: 'hall', hp: hp + 1, label: van, drop: 'the parish book', text: `Stop ${van} and get the book back` },
          { t: 'escape', heat: 1.3, text: `${cap(w.law)} think it was you who took it. Lose them` },
          { t: 'goto', at: 'hall', text: `Put the book back where it belongs, at ${N.hall}` },
        ],
      }[kind];
      if (acts) set.steps = acts;
    }
    if (set) add({
      ...base, id: `proof-${i}`, title: set.title, giver: { who: c.id, at: 'home' }, brief: set.brief,
      hour: { wedding: 10.5, birth: 2.5, emig: 6, arms: 7, census: 20.2, baptism: 11, chase: 22.5, portrait: 15, burial: 14.5 }[kind],
      intro: set.ask.map(text => ({ who: c.id, text })), steps: set.steps,
      outro: (() => {
        const nx = chapters[i + 1] && chapters[i + 1] !== finale ? chapters[i + 1] : null, [tally, lead] = deal('tally', LINES.tally);
        return [{ who: 'dot', text: `${set.done} ${tally({ n: proofs.length, word: NUM[proofs.length] || String(proofs.length), total: chapters.length + 1 })}` },
          ...(nx ? [{ who: 'dot', text: `${lead} ${nx.name}, your ${nx.rel}, ${nx.town.name}, ${nx.year}.` }] : [])];
      })(),
      reward: { cash: pay + 120, proof: set.proof },
    });
    const real = chapters.length - 1; // chapters before the finale
    if (set && !isFinale) {
      const last = missions[missions.length - 1];
      if (i === 1) last.outro.push({ who: 'letter', text: `Under the wiper, on grey paper, in grey ink: "You are costing me a great deal of money. Kindly stop. S.H. P.S. The van was on hire."` });
      // (the slip of the pen is the first hint that Hargreaves is a name he was given, not one he has)
      if (i === 3) last.outro.push({ who: 'letter', text: `Another grey note: "You have so very many of them. Mothers, grandfathers, aunts by the dozen. You would hardly miss one. I should have noticed one." It is signed S.B., crossed out, with S.H. written beside it.` });
    }
    // Grey Area: follow one of the vans home.
    if (i === 0 && real >= 2) add({
      ...base, id: 'grey-area', title: 'Grey Area', giver: { who: 'dot', at: 'phone' }, hour: 17.5,
      brief: `Where do Hargreaves's men go at the end of the day, in ${c.year}?`,
      intro: [{ who: 'dot', text: `A note in Dorothy's hand, left where you would look: "They came in a ${w.van} and they will go home in one. Follow it. Not so close they notice, not so far you lose it. I want to know where Silas keeps his men in ${c.year}."` }],
      steps: [{ t: 'goto', at: 'hall', text: `Wait for the ${w.van} outside ${N.hall}` },
        { t: 'tail', from: 'hall', via: ['works'], to: 'office', text: `Follow the ${w.van}. Keep your distance`, bark: { who: 'dot', text: `Hang back, dear. You are driving the only mustard-coloured estate car in ${c.year}.` } },
        { t: 'goto', at: 'office', foot: true, text: 'Take a look through the window' },
        { t: 'catch', from: 'office', label: 'grey clerk', drop: 'a ledger of everybody they mean to strike out', text: 'A clerk has come out with a ledger under his arm. He has seen you. Catch him' }],
      outro: [{ who: 'note', text: `Through the glass: rows of desks, rows of grey men, and on every desk a parish register and a bottle of something that smells of bleach.` },
        { who: 'note', text: `The brass plate by the door says HARGREAVES & LOWE. EST. ${c.year - 40}. Underneath, smaller: NO CALLERS. NO RELATIVES.` },
        { who: 'dot', text: `Dorothy's next note is mostly underlining: "An office. In ${c.year}. He has a branch in every century, the cheek of the man. No wonder he is always ahead of us."` },
        { who: 'dot', text: `"We shall have to pay a call on head office. I shall bring a flask."` }],
      reward: { cash: 220 },
    });
    // The Paper Convoy: half way back.
    if (!isFinale && i === Math.ceil(real / 2) && real >= 3) {
      const cart = c.year < 1900 ? 'wagon' : c.year < 1950 ? 'lorry' : 'van';
      add({
        ...base, id: 'paper-convoy', title: 'The Paper Convoy', giver: { who: 'dot', at: 'phone' }, hour: 12,
        brief: `Every register in ${c.town.name} is going by ${cart} to be bound. Hargreaves knows.`,
        intro: [{ who: 'dot', text: `Dorothy's note: "The parish is sending every old register it has to be rebound: by ${cart}, by way of ${N.farm}, to ${N.hub}. Three centuries of ${c.town.name} in one ${cart}."` },
          { who: 'dot', text: `"I have counted five grey ${c.year < 1900 ? 'carriages' : 'vans'} in town this morning, and not one of them is delivering anything. See it safe aboard."` }],
        steps: [{ t: 'goto', at: 'church', text: `Meet the ${cart} at ${N.church}` },
          { t: 'defend', from: 'church', via: ['works'], to: 'hub', hp: 12, waves: 7, text: `Keep the grey vans off the ${cart} all the way to ${N.hub}`, bark: { name: 'The carter', text: `I was told this was a quiet job. Books, they said. Who robs books?` }, bark2: { name: 'The carter', text: `I've carried gunpowder with less bother than this.` } }],
        outro: [{ who: 'dot', text: `"Three hundred years of baptisms, safe on the ${w.boat}. Somewhere in that ${cart} is the first time anybody ever wrote your surname down."` },
          { who: 'dot', text: `"He will be furious. I've opened the good biscuits."` }],
        reward: { cash: 380 + i * 40 },
      });
    }

    // The Golden Door: everybody's tree passes somebody's manifest. Only if the file never leaves home.
    if (!foreign && present > 1907 && !isFinale && i === Math.min(1, chapters.length - 2)) {
      const ny = town(NEW_YORK);
      add({ act: 'Interlude', id: 'golden-door', title: 'The Golden Door', town: ny.id, year: 1907, giver: { who: 'dot', at: 'phone' }, hour: 6.2,
        brief: 'Hargreaves has gone wholesale: Ellis Island, 1907, twelve million names.',
        intro: [{ who: 'dot', text: `A note in Dorothy's handwriting, pinned where you'd find it: "He's gone wholesale. Ellis Island, New York, 1907. Twelve million names on those manifests and he means to thin them out. Not your family's, perhaps, but somebody's. Go."` }],
        steps: [{ t: 'collect', around: 'hub', radius: 17, n: 8, label: 'manifest pages', timed: 1.5, text: 'Collect the ship\'s manifest pages blowing along the waterfront' },
          { t: 'chase', from: 'hub', hp: 6, label: 'the grey motor-van', drop: 'a crate of manifests', text: 'Stop the grey motor-van before it reaches the incinerator' }],
        outro: [{ who: 'dot', text: `Twelve million strangers who'll never know your name. That's the job, dear. That's all an archive is: minding people you will never meet. Now, back to your own lot.` }],
        reward: { cash: 520 } });
    }
    // Before the finale: the raid on Hargreaves & Lowe, back in the present.
    if (!isFinale && chapters[i + 1] === finale) addLedger();
    if (isFinale) {
      const g = `the ${w.van}`;
      add({
        ...base, id: 'blank-page', title: 'The Last Page', giver: { who: c.id, at: 'home' }, hour: 18.6,
        brief: `${c.name} is the top of your tree. If ${c.his} name never goes in the book, nobody below it does either.`,
        intro: [{ who: c.id, text: `There's a gentleman at the church this hour, grey as a gravestone, turning the parson's book to my page.` },
          { who: c.id, text: `He said the queerest thing. He said, "Somebody has to be nobody." What did he mean by it?` },
          { who: 'dot', text: `A note, in pencil, shaking: "${hero.first}. This is it. ${c.name}${bapt?.date ? ', baptised ' + datePhrase(bapt.date) : ', ' + c.by}, ${c.town.name}. Nobody above ${c.him} in any record. Your brick wall."` },
          { who: 'dot', text: `"Lose that page and the whole family comes down like washing off a line. He has my first Engine. Do not let him turn the page."` }],
        steps: [{ t: 'goto', at: 'church', timed: 1.1, blocks: 2, text: `Race to ${N.church}. They have barricaded the lane` },
          { t: 'collect', around: 'church', radius: 16, n: 8, label: 'register pages', timed: 1.3, hunt: 2, text: 'He has torn the register apart. Save every page' },
          { t: 'catch', from: 'church', label: 'Hargreaves\'s clerk', drop: 'the flyleaf', time: 70, text: 'His clerk is away through the churchyard with the flyleaf. Catch him' },
          { t: 'chase', from: 'church', hp: 12, fast: true, boss: true, hop: [...new Set([chapters[Math.floor((chapters.length - 1) / 2)].year, present, chapters[0].year, c.year])].filter((y, k, a) => k === a.length - 1 || y !== c.year), label: 'Engine No. 1', drop: 'the last page', text: 'Silas Hargreaves is running through the centuries. Stay with Engine No. 1 and stop it', bark: { who: 'blank', text: `You have thousands of them! I only ever wanted one!` }, bark2: { who: 'blank', text: `Stop following me! Nobody ever follows me!` } }],
        outro: [
          { who: 'blank', text: `Go on, then. Read it. Read the page you were so keen to save. Not the entry. The margin.` },
          { who: 'note', text: `In the margin beside ${c.first}'s entry, in the parson's cramped hand: "Also a second infant of this house, base-born, put out to the parish this day. No name given." And beneath it, in another hand: "Entered as HARGREAVES, for the overseer who signed for him."` },
          { who: 'blank', text: `Another man's name. Nobody thought to give me my own.` },
          { who: 'blank', text: `Four hundred years of your people in every book I open, and my whole family is a gap in a margin. I thought if nobody had a tree, I should not mind so much.` },
          { who: 'dot', text: `Oh, Silas. You silly man. That's not a gap. That's a sibling. You've spent thirty years trying to erase your own family.` },
        ],
        reward: { cash: 600, proof: proof('baptism', c, `Baptism of ${c.name}`, [bapt?.date ? cap(datePhrase(bapt.date)) : String(c.by), c.town.name, 'with a note in the margin'].filter(Boolean).join(', ')) },
      });
    }
  });
  function addLedger() {
    const f = finale;
    add({
      act: 'Interlude', id: 'blank-and-void', title: 'The Break-In', town: home.id, year: present, giver: { who: 'dot', at: 'garage' }, hour: 23,
      brief: 'A visit to the offices of Hargreaves & Lowe, Probate Genealogists. Uninvited.',
      intro: [{ who: 'dot', text: `He's ahead of us and I want to know how. Hargreaves & Lowe keep an office in town. Very grey. Very shredder.` },
        { who: 'dot', text: `Get whatever's left of his ledger, and expect company on the way out. I'd come in with you, but somebody has to mind the flask.` }],
      steps: [{ t: 'goto', at: 'office', text: 'Go to the offices of Hargreaves & Lowe' },
        { t: 'collect', around: 'office', radius: 15, n: 7, label: 'ledger pages', timed: 1.35, text: 'They are throwing the ledger out of the windows. Grab every page' },
        { t: 'catch', from: 'office', label: 'the office boy', drop: 'page one', time: 45, text: 'The office boy has page one. After him' },
        { t: 'escape', heat: 1.3, text: 'The alarm has gone. Lose the police' },
        { t: 'goto', at: 'garage', timed: 1.4, blocks: 1, hunt: 2, text: `Take the ledger back to ${H.garage}. They will try to stop you` }],
      outro: [{ who: 'dot', text: `I ought to tell you. He was my apprentice. The brightest I ever had, and the loneliest.` },
        { who: 'dot', text: `I showed him my first Engine one Friday, and on the Monday the pair of them were gone. He'd tidied the shed before he went. That's what I couldn't forgive.` },
        { who: 'dot', text: `Page one, in his own hand: "HARGREAVES, Silas. Foundling. Left at the door of the parish of ${f.town.name}. No name given."` },
        { who: 'dot', text: `Oh, I see. He isn't only erasing your family, ${hero.first}. He's been looking for his own.` },
        { who: 'dot', text: `And the last entry: ${f.name}, ${f.town.name}, ${f.year}. The very top of your tree. He's going for the root.` }],
      reward: { cash: 400 },
    });
  }
  // Put the raid in if the loop above never reached "the chapter before the finale" (single-chapter trees).
  if (finale && !missions.some(m => m.id === 'blank-and-void')) {
    const at = missions.findIndex(m => m.chapter === finale.index);
    addLedger();
    const led = missions.pop();
    missions.splice(at < 0 ? missions.length : at, 0, led);
  }
  // No ancestors at all: the hero is their own brick wall.
  if (!finale) {
    add({ act: 'Finale', id: 'blank-page', title: 'The Last Page', town: home.id, year: present, giver: { who: 'dot', at: 'garage' },
      brief: 'There is nobody above you in the file. You are your own brick wall.',
      intro: [{ who: 'dot', text: `There's nobody above you in this file, dear, which makes you the top of the tree and the whole of it. Hargreaves only needs one page. He's at ${H.hall} now with my first Engine.` }],
      steps: [{ t: 'goto', at: 'hall', timed: 1.0, text: `Race to ${H.hall}` }, { t: 'collect', around: 'hall', radius: 16, n: 8, label: 'register pages', timed: 1.3, text: 'Save every page' },
        { t: 'chase', from: 'hall', hp: 9, fast: true, boss: true, label: 'Engine No. 1', drop: 'the last page', text: 'Stop Engine No. 1' }],
      outro: [{ who: 'blank', text: `A foundling has no tree. I thought if nobody had one, I should not mind so much.` }, { who: 'dot', text: `Then start one, you silly man. Everybody's is one name long to begin with.` }],
      reward: { cash: 600 } });
  }
  // ---- Epilogue ----
  add({
    act: 'Epilogue', id: 'case-closed', title: 'Case Closed', town: home.id, year: present, giver: { who: 'dot', at: 'garage' }, hour: 14,
    brief: 'One pedigree, proven. One extra name to write in.',
    intro: [{ who: 'dot', text: `Every link proven, ${hero.first}, from you ${finale ? 'to ' + finale.name : 'upwards'}. And one more name for the chart than we started with.` },
      { who: 'dot', text: `Drive us to ${H.hall}, both of us. Slowly. My hip, and his nerves.` }],
    steps: [{ t: 'carry', from: 'garage', to: 'hall', n: 1, label: 'passengers', passenger: 'Dorothy and Silas', gentle: true, text: `Drive Dorothy and Silas to ${H.hall}. Gently` }],
    outro: [
      { who: 'note', text: `The pedigree of ${hero.name} is lodged and stamped. The estate of ${estateOf} is released to its rightful heirs.` },
      { who: 'note', text: `That is you, and one newly discovered cousin, many times removed, who cries all over the paperwork.` },
      { who: 'note', text: `Mr Lowe, at last report, is still filling in the mileage claim. It covers four hundred years, and he has run out of form.` },
      { who: 'blank', text: `I have a ${finale ? 'great-' + 'great-'.repeat(Math.min(3, Math.max(0, finale.gen - 2))) + 'aunt' : 'family'}. Several, apparently. I should like to meet them. Might I borrow the car?` },
      { who: 'dot', text: `You may not. But ${hero.first} might drive you. The Heirloom is yours now, dear: every town, every year, anyone in your tree.` },
      { who: 'dot', text: `Go and say hello. They've been waiting long enough.` },
    ],
    reward: { cash: 5000 },
  });
  missions.forEach((m, i) => { m.index = i; });

  // ---- Family favours: optional jobs for brothers, sisters and children of each chapter's ancestor ----
  const favours = [];
  // (a favour is never the job a chapter's ancestor has already given you, so no ask is heard twice)
  const taken = new Set([rootId, ...chapters.map(c => c.id)]), usedFav = new Set(chapters.map(c => c.jobKey));
  for (const c of chapters) {
    const meet = missions.find(m => m.chapter === c.index);
    if (!meet) continue;
    const own = c.indi.famc && data.families.get(c.indi.famc);
    const sibs = own ? own.children.filter(id => id !== c.id).map(id => [data.individuals.get(id), c.sex === 'F' ? 'sister' : 'brother', true]) : [];
    const kids = c.kids.filter(k => !c.child || k.id !== c.child.id).map(k => [k, 'child', false]);
    const cands = [...sibs, ...kids, ...(c.spouse ? [[c.spouse, 'spouse', false]] : [])].filter(([x]) => {
      if (!x || taken.has(x.id)) return false;
      const by = birthYear(x), dy = deathYear(x);
      return by != null && c.year - by >= 15 && c.year - by <= 80 && (dy == null || dy > c.year);
    }).sort((a, b) => (b[0].events.some(e => e.tag === 'OCCU') ? 1 : 0) - (a[0].events.some(e => e.tag === 'OCCU') ? 1 : 0));
    const used = new Set([c.jobKey]);
    for (const [x, how, sib] of cands.slice(0, 2)) {
      taken.add(x.id);
      const job = x.events.filter(e => e.tag === 'OCCU' && e.value).map(e => e.value.trim())[0] || '';
      const g = jobGroup(job), order = [g, g + 'B', 'shop', 'careB', 'rail', 'craftB', 'serve', 'farmB', 'shopB', 'sea', 'clothB', 'schoolB', 'serveB', 'haulB', 'seaB', 'desk', 'odd'].filter(k => DAY_JOBS[k] && !used.has(k));
      const key = order.find(k => !usedFav.has(k)) || order[0] || 'odd';
      used.add(key); usedFav.add(key);
      const N = names(c.town, c.year), first = firstName(x), m = x.sex === 'M', f = x.sex === 'F';
      const tmpl = spice(DAY_JOBS[key]({ ...N, year: c.year, first, jobL: job.toLowerCase() }));
      const rel = sib ? (m ? 'brother' : f ? 'sister' : 'kin') : how === 'child' ? (m ? 'son' : f ? 'daughter' : 'child') : (m ? 'husband' : f ? 'wife' : 'spouse');
      favours.push({
        id: `favour-${c.index}-${x.id}`, odd: true, favour: true, act: 'Family favour', title: tmpl.title, town: c.town.id, year: c.year, after: meet.index,
        giver: { who: x.id, at: 'home' }, brief: `${displayName(x)}, ${c.first}'s ${rel}, could use a hand.`,
        intro: [{ who: x.id, text: deal('favourAsk', LINES.favourAsk)({ c: q(c.first), name: q(displayName(x)), rel, job: job ? ', ' + q(job.toLowerCase()) : '', whose: q(c.first) + '\'s', poss: c.he === 'she' ? 'her' : c.he === 'he' ? 'his' : 'their' }) }, { who: x.id, text: tmpl.ask }],
        steps: tmpl.steps,
        outro: [{ who: x.id, text: deal('favourDone', LINES.favourDone)({ c: q(c.first), He: cap(c.he), he: c.he, him: c.him }) }],
        reward: { cash: 140 + c.index * 35 },
      });
    }
  }

  // ---- The Foundling File: a page of Silas's own record in every era you visit, and where it leads ----
  const ft = finale ? finale.town : home, fy = finale ? finale.year : present, FN = names(ft, fy);
  const fragText = [
    `Parish of ${ft.name}. Left at the vestry door on a Tuesday: one male infant, about a week old, in a basket. No note. No name.`,
    `Entered by the overseers as SILAS, for the saint's day, and HARGREAVES, for the overseer who signed for him.`,
    `Apprenticed at nine to a law stationer. Absconded. Returned. Absconded. "The boy reads parish registers as other boys read adventure stories."`,
    `A letter, never posted: "To any person of the name of". The name after it has been rubbed out so often the paper has gone through.`,
    `A family tree in a child's hand. There is one name on it, his own, drawn very carefully, with room left all round.`,
    `A reference in Dorothy's writing: "Quick, exact, and never once late. He asked who the Engines were for. I said, people with somebody to go back to. I have regretted it since."`,
  ];
  const fragLots = ['church', 'infirmary', 'school', 'post', 'hall', 'farm'], seenFrag = new Set();
  const frags = [];
  for (const c of chapters) {
    const k = c.town.id + ':' + c.year;
    if (seenFrag.has(k) || frags.length >= fragText.length || !missions.some(m => m.chapter === c.index)) continue;
    seenFrag.add(k);
    frags.push({ id: 'frag' + frags.length, town: c.town.id, year: c.year, lot: fragLots[frags.length], text: fragText[frags.length] });
  }
  const bonus = frags.length ? {
    id: 'somebodys-son', odd: true, bonus: true, act: 'After the end', title: `Somebody's Son`, town: home.id, year: present, giver: { who: 'dot', at: 'garage' }, hour: 16,
    brief: `Silas's file is whole again. It says where and when. The Heirloom can do the rest.`,
    intro: [{ who: 'dot', text: `You found all of it. I never could. A Tuesday, the vestry door, ${ft.name}, ${fy}: the very year you stood there${finale ? ' with ' + finale.first : ''}.` },
      { who: 'dot', text: `He was a week old and forty yards off the whole time.` },
      { who: 'dot', text: `We have a machine that goes to Tuesdays, ${hero.first}. He won't ask. He has never asked anybody for anything. So I'm asking for him.` }],
    steps: [
      { t: 'carry', from: 'garage', to: 'hub', n: 1, label: 'passenger', passenger: 'Silas', gentle: true, text: `Collect Silas. He has packed a bag, and unpacked it, twice`, bark: { name: 'Silas', text: `I have brought sandwiches. I did not know what one brings.` } },
      { t: 'travel', town: ft.id, year: fy, text: `Take Silas to ${ft.name}, ${fy}` },
      { t: 'search', spots: ['infirmary', 'pub', 'market'], miss: { 0: `Nobody has seen a girl with a basket. "Try ${FN.pub}. They take in lodgers and ask nothing."`, 1: `"There was a lass. Kept her shawl up. Went toward ${FN.market} at first light."`, 2: `"A basket? Aye. She asked the way to ${FN.infirmary} and then didn't take it."` }, text: 'Somebody carried a basket through this town today. Find where she has been' },
      { t: 'carry', from: '@found', to: 'church', n: 1, label: 'passenger', passenger: 'Silas', gentle: true, text: `She has gone up to ${FN.church}. Drive Silas there. He would like to arrive slowly`, bark: { name: 'Silas', text: `Not too close. I only want to see. I have rubbed out a great many people and I should not like to smudge this.` } },
    ],
    outro: [
      { who: 'note', text: `A girl of nineteen in a grey shawl sets a basket down at the vestry door. She tucks the blanket in. She says a name, twice, so that it will keep. It is not Hargreaves.` },
      { who: 'blank', text: `She gave me one. Did you hear? I shan't tell you what it is. I have never had anything before that was only mine.` },
      { who: 'blank', text: `She has your chin, ${hero.first}. Or you have hers. I should have looked up from the paperwork years ago.` },
      { who: 'dot', text: `Then write it in, Silas. In ink this time. And come home, the pair of you. There's a chart on my wall with room left all round one name, and I think it's finished waiting.` },
    ],
    reward: { cash: 1500 },
  } : null;

  addCuts();
  // Cut scenes, played like the opening (black bars, big faces) at the start and end of each part of the story:
  // the end of the Prologue, both ends of every chapter, the start of the Finale and of the Epilogue.
  // Each shot: where the camera is (a lot, 'home' with whose home, or 'you'), who speaks, their face, and the line.
  function addCuts() {
    const byId = id => missions.find(m => m.id === id);
    const sov = y => y >= 1837 && y < 1901 ? 'Queen\'s' : y >= 1702 && y < 1714 ? 'Queen\'s' : y >= 1558 && y < 1603 ? 'Queen\'s' : 'King\'s';
    const nameOf = indi => indi ? displayName(indi) : '';
    const firstOf = indi => nameOf(indi).split(' ')[0];
    const shot = (at, who, mood, text, extra = {}) => ({ at, who, mood, text, side: who === 'lowe' ? 1 : 0, ...extra });
    // what the ancestor is busy with when the chapter opens, before anybody has told them anything
    const busyLine = (c, proofM) => {
      const sp = c.spouse ? firstOf(c.spouse) : '', ch = c.child ? firstOf(c.child) : '', late = c.late ? nameOf(c.late.indi) : '';
      // [A-E] two of each, because the same kind of event can open two chapters
      const two = {
        wedding: [`Saturday I'm to be wed${sp ? ' to ' + sp : ''}. The banns are read, and the parson's book is waiting for the both of us.`,
          `Three days till ${sp ? 'I marry ' + sp : 'the wedding'}, and my mother has already cried on everything I own. All that's left is two names in the parson's book.`],
        birth: [`Any day now, the midwife says.${ch ? ' We have a name picked: ' + ch + '.' : ''} There's a page in the register with a space for it.`,
          `The baby's due, and the whole street has an opinion on the name.${ch ? ' It\'s ' + ch + ', and that\'s final.' : ''} It only wants writing in the register.`],
        portrait: [`There's a photographer coming to take the children's likeness. All of them at once, heaven help the man.`,
          `We're to have our likeness taken, the whole family. I've washed every child twice and I am not doing it a third time.`],
        census: [`The enumerator's coming round tonight with his forms. Every soul under this roof, written down for the government.`,
          `Census night. Every name in the house goes on the form, and I've told the lodger: one more false name and I'll choose it for him.`],
        emig: [`Everything we own is in two trunks. Our names are on the passenger list, and we ${c.year >= 1950 ? 'fly in the morning' : 'sail with the tide'}.`,
          `A whole life packed, and the house echoing. My name's on the passenger list now, so it's too late to be sensible.`],
        burial: [`We bury ${late || 'our own'} this week. Whatever else happens, it'll be written in the book proper.`,
          `The funeral's this week. ${late ? late + ' always said to make no fuss' : 'We were told to make no fuss'}, so naturally the whole town is coming. It'll go in the book, done right.`],
        arms: [`I've taken the ${sov(c.year)} shilling. They'll write my name in the muster roll, and then I belong to the army.`,
          `I've signed up. The sergeant said I'd see the world, and so far I've seen a field and a shouting man. Still, my name goes on the muster roll.`],
        baptism: [`The christening's on Sunday. Our little one, in the parish book at last.`,
          `There's a christening Sunday, and the parson has promised to keep it short. He promised that last time. It goes in the parish book, that's the main thing.`],
        chase: [`There's a gentleman in grey been round asking after the parish book. Says he's from the solicitors. I didn't like his face.`,
          `A grey sort of man knocked this morning, asking who my people were. I said they were none of his business. He wrote that down.`],
      };
      return deal('busy-' + (two[c.set] ? c.set : 'chase'), two[c.set] || two.chase);
    };
    const LOWE_IN = [
      `They followed us, sir. That yellow car was seen on the bridge this morning.`,
      `The archivist's car again, sir. It's come back through the years after us.`,
      `Sir, they're proving them faster than we can rub them out.`,
      `The men are tired, sir. And the vans keep getting rammed.`,
    ];
    const BLANK_IN = [
      `Then we shall simply have to be quicker. Tonight.`,
      `Let it come. Nobody outruns the Engine twice.`,
      `Then take the book before they find the family. Go!`,
      `Tired? We are erasing four hundred years, Mr Lowe. Nobody said it was a half-day.`,
    ];
    const prologueEnd = byId('first-jump'), ch0 = chapters[0];
    if (prologueEnd && ch0) prologueEnd.cutOut = { caption: `${ch0.town.name}, ${ch0.year}`, shots: [
      shot('you', 'note', '', `Fire on the road behind you. A smell of hot ink. And the street is the same street, give or take ${Math.max(1, present - ch0.year)} years.`),
      shot('you', 'dot', 'grin', `She works! Oh, she WORKS. Forty years in a shed, and she works. Don't tell my hip, it'll want to come along.`),
    ] };
    chapters.forEach((c, i) => {
      const own = missions.filter(m => m.chapter === i && !m.odd), first = own[0], proofM = own.filter(m => m.reward.proof).at(-1);
      if (!first) return;
      const isFinale = c === finale, k = i % 4, next = chapters[i + 1];
      const pTitle = proofM?.reward.proof.title || `${c.name}'s page`;
      if (isFinale) {
        first.cutIn = { caption: `${c.town.name}, ${c.year}. Dusk.`, hour: 18.6, shots: [
          shot('church', 'note', '', `The oldest page in the oldest book. Above ${c.name}, nothing at all. No father, no mother, no parish of birth. A brick wall.`),
          shot('church', 'blank', 'set', `Somebody has to be nobody, ${c.first}. Why not you?`),
          shot('church', 'blank', 'worried', `...Why not me?`, { caption: 'Silas Hargreaves' }),
          shot('phone', 'dot', 'worried', `This is the root, ${hero.first}. If that entry goes, every name under it goes too. Yours. Mine. All of them. Get to ${c.first} before he does.`),
        ] };
        // the finale's reveal is played as a scene rather than read out
        if (proofM && proofM.outro.length) {
          proofM.cutOut = { caption: 'The churchyard', shots: proofM.outro.map((l, n) => shot('church', l.who, l.who === 'blank' ? (n ? 'worried' : 'set') : l.who === 'dot' ? 'set' : '', l.text)) };
          proofM.outro = [];
        }
        return;
      }
      const they = c.he === 'they';
      const leadIn = deal('leadIn', LINES.leadIn)({ name: c.name, job: c.job.toLowerCase(), he: c.he, him: c.him, is: they ? 'are' : 'is', page: pTitle });
      first.cutIn = { caption: `${c.town.name}, ${c.year}`, hour: 21.5, shots: [
        shot('office', 'note', '', `${c.town.name}, ${c.year}. ` + (i === 0 ? `Hargreaves & Lowe have an office here too. They have one in every century. The carpet is always the same.` : deal('door', LINES.door)), { caption: 'Hargreaves & Lowe' }),
        // his scheme for this chapter, in his own words; failing that, the old complaints
        ...(c.schemeInfo
          ? [shot('office', 'blank', 'grin', `${leadIn} ${c.schemeInfo.cut[0]}`), shot('office', 'lowe', 'worried', c.schemeInfo.cut[1]), shot('office', 'blank', 'set', c.schemeInfo.cut[2])]
          : [shot('office', 'blank', 'grin', `${leadIn} One page in one book, Mr Lowe. Lose it, and everybody after ${c.him} goes with it.`), shot('office', 'lowe', 'worried', LOWE_IN[k]), shot('office', 'blank', 'angry', BLANK_IN[k])]),
        shot('home', c.id, '', busyLine(c, proofM), { of: c.id, caption: `Meanwhile: ${c.name}` }),
        ...(c.quizSaid ? [shot('home', c.id, '', c.quizSaid, { of: c.id, caption: `Meanwhile: ${c.name}` })] : []),   // (the quiz clue, in passing)
        shot('phone', 'dot', 'set', deal('target', LINES.target)({ hero: hero.first, page: pTitle, scheme: c.schemeInfo ? c.schemeInfo.name : 'no ordinary trick', rel: c.rel, he: c.he, does: they ? 'do' : 'does' })),
      ] };
      if (proofM) {
        const n = proofs.indexOf(proofM.reward.proof) + 1;
        proofM.cutOut = { caption: 'Hargreaves & Lowe', hour: 22, shots: [
          shot('office', 'blank', 'angry', deal('fume', LINES.fume)),
          shot('office', 'lowe', 'worried', deal('count', LINES.count)({ n, word: NUM[n] || String(n) })),
          shot('office', 'blank', 'set', next && next !== finale ? deal('further', LINES.further)({ next: `${next.name}, ${next.town.name}, ${next.year}` }) : `Then we go to the very top. The root. And we take it out.`),
          shot('home', c.id, 'grin', deal('farewell', LINES.farewell)({ hero: hero.first }), { of: c.id, caption: c.name }),
        ] };
      }
    });
    const epi = byId('case-closed');
    if (epi) epi.cutIn = { caption: `${home.name}. The present day.`, hour: 14, shots: [
      shot('garage', 'note', '', `Back where it started: a lock-up behind ${H.pub}, a yellow car with a scorched dial, and a grey man with nowhere to be.`),
      shot('garage', 'blank', 'worried', `I don't suppose there is any tea.`),
      shot('garage', 'dot', 'grin', `There's always tea. Drink it, then we'll lodge the pedigree. All three of us.`),
    ] };
  }

  return {
    frags, bonus,
    title: 'A Battle in Time', hero, villain: { name: 'Silas Hargreaves', firm: 'Hargreaves & Lowe, Probate Genealogists' }, mentor: { name: 'Dorothy Pickering' },
    benefactor, home, now: present, towns, chapters, missions, favours, proofs, tree, surname, foreign,
  };
}

/** Everyone in the file who could have been seen on the street in that town in that year. */
export function residentsOf(data, town, year, limit = 40) {
  const out = [];
  for (const indi of data.individuals.values()) {
    const by = birthYear(indi);
    if (by == null || by > year - 5) continue;
    const dy = deathYear(indi) ?? by + 75;
    if (dy < year) continue;
    const places = indi.events.filter(e => e.place).map(e => placeTown(e.place)?.id);
    if (!places.includes(town.id)) continue;
    out.push({ id: indi.id, name: displayName(indi), sex: indi.sex, age: year - by, life: lifespan(indi), job: (indi.events.find(e => e.tag === 'OCCU' && e.value) || {}).value || '' });
    if (out.length >= limit) break;
  }
  return out;
}

/** A repeatable odd job for cash, flavoured for the year. */
export function oddJob(town, year, seed, fare = false) {
  const rnd = seededRandom(seed);
  const e = eraOf(year);
  const goods = { modern: ['parcels', 'takeaways', 'flat-pack wardrobes', 'boxes of records'], retro: ['crates of pop', 'sacks of coal', 'wireless sets', 'bundles of newspapers'], vintage: ['milk churns', 'sacks of coal', 'crates of ale', 'telegrams'],
    victorian: ['barrels of ale', 'sacks of flour', 'bolts of cloth', 'baskets of tripe'], georgian: ['barrels', 'sacks of meal', 'hogsheads', 'bundles of wool'], early: ['sacks of grain', 'barrels', 'bundles of rushes', 'baskets of eels'] }[e];
  const spots = ['market', 'pub', 'works', 'farm', 'hub', 'school', 'church', 'infirmary', 'post'];
  const from = spots[Math.floor(rnd() * spots.length)];
  let to = spots[Math.floor(rnd() * spots.length)];
  if (to === from) to = spots[(spots.indexOf(from) + 3) % spots.length];
  const label = goods[Math.floor(rnd() * goods.length)];
  const n = 1 + Math.floor(rnd() * 3);
  const person = fare || rnd() < 0.3;
  return {
    id: 'odd-' + seed, odd: true, fare, act: 'Odd job', title: person ? 'Fare' : 'Carrier', town: town.id, year, giver: { who: 'board' }, brief: '', intro: [], outro: [],
    steps: [person
      ? { t: 'carry', from, to, n: 1, label: 'fare', passenger: 'your fare', timed: 1.2, text: `Take your fare from ${lotName(from, town, year)} to ${lotName(to, town, year)}` }
      : { t: 'carry', from, to, n, label, timed: 1.35, text: `Carry ${n === 1 ? 'the ' + label : n + ' loads of ' + label} from ${lotName(from, town, year)} to ${lotName(to, town, year)}` }],
    reward: { cash: 0, perTile: person ? 1.4 : 1.1 * n },
  };
}

/** Notes from the file for people connected with a town: what is written on the back of the lost photographs. */
export function townNotes(data, town, limit = 12) {
  const out = [];
  let seen = 0;
  for (const indi of data.individuals.values()) {
    if (seen++ > 20000 || out.length >= limit) break;
    if (!indi.notes.length) continue;
    if (!indi.events.some(e => e.place && placeTown(e.place)?.id === town.id)) continue;
    const text = indi.notes[0].replace(/\s+/g, ' ').trim();
    if (text.length > 8) out.push({ name: displayName(indi), life: lifespan(indi), text: text.length > 230 ? text.slice(0, 227).replace(/\s+\S*$/, '') + '…' : text });
  }
  return out;
}

/** How somebody in the file is related to the hero, as far as the game works it out. */
export function kinOf(data, tree, id) {
  const p = tree.people.get(id);
  if (p) return p.gen === 0 ? 'you' : 'your ' + relationship(p.gen, p.indi.sex);
  const indi = data.individuals.get(id);
  if (!indi) return '';
  const m = indi.sex === 'M', f = indi.sex === 'F';
  const par = parentsOf(data, id);
  for (const pid of [par.father, par.mother]) {
    const a = pid && tree.people.get(pid);
    if (!a) continue;
    const g = a.gen - 1; // the generation this person shares with someone on your line
    if (g < 0) return 'your ' + (m ? 'son' : f ? 'daughter' : 'child');
    if (g === 0) return 'your ' + (m ? 'brother' : f ? 'sister' : 'sibling');
    return 'your ' + (g === 1 ? '' : g === 2 ? 'great-' : g === 3 ? 'great-great-' : (g - 1) + '× great-') + (m ? 'uncle' : f ? 'aunt' : 'uncle or aunt');
  }
  for (const fid of indi.fams) {
    const fam = data.families.get(fid), sp = fam && (fam.husb === id ? fam.wife : fam.husb), a = sp && tree.people.get(sp);
    if (a) return a.gen === 0 ? 'your ' + (m ? 'husband' : f ? 'wife' : 'spouse') : `married to your ${relationship(a.gen, a.indi.sex)}`;
  }
  for (const pid of [par.father, par.mother]) {
    if (!pid) continue;
    const pp = parentsOf(data, pid);
    if ([pp.father, pp.mother].some(x => x && tree.people.has(x))) return 'a cousin of yours';
  }
  return 'in your family file';
}

/** Who lies in the churchyard: people in the file who died or were buried in this town by this year. */
export function burialsIn(data, town, year, limit = 24) {
  const out = [];
  let seen = 0;
  for (const indi of data.individuals.values()) {
    if (seen++ > 30000) break;
    const dy = deathYear(indi);
    if (dy == null || dy > year) continue;
    const place = evPlace(indi, 'BURI', 'CREM') || evPlace(indi, 'DEAT');
    if (!place || placeTown(place)?.id !== town.id) continue;
    out.push({ id: indi.id, name: displayName(indi), life: lifespan(indi), dy });
  }
  return out.sort((a, b) => b.dy - a.dy).slice(0, limit);
}

/** What somebody would tell you about themselves in a given year: only what has happened to them so far. */
export function lifeSoFar(data, id, year) {
  const indi = data.individuals.get(id);
  if (!indi) return [];
  const by = birthYear(indi), age = by != null ? year - by : null;
  const jobs = indi.events.filter(e => e.tag === 'OCCU' && e.value && (dateYear(e.date) ?? 0) <= year).map(e => e.value.trim().toLowerCase());
  const lines = [];
  const birth = findEvent(indi, 'BIRT', 'CHR', 'BAPM');
  lines.push(`«${displayName(indi)}»${age != null && age >= 0 ? `, ${age === 0 ? 'not a year old' : age + ' years old'}` : ''}${age != null && age >= 12 && jobs.length ? `, «${jobs[0]}»` : ''}.` + (birth?.place ? ` Born${birth.date ? ' ' + datePhrase(birth.date) : ''} in «${placeTown(birth.place)?.name || birth.place}».` : ''));
  for (const fid of indi.fams) {
    const fam = data.families.get(fid);
    if (!fam) continue;
    const my = dateYear(fam.events.find(e => e.tag === 'MARR')?.date);
    const sp = data.individuals.get(fam.husb === id ? fam.wife : fam.husb);
    const kids = fam.children.map(c => data.individuals.get(c)).filter(k => k && (birthYear(k) ?? 9999) <= year);
    if (my != null && my > year && !kids.length) continue;
    if (sp) lines.push(`Married to «${displayName(sp)}»${my ? ' since «' + my + '»' : ''}.` + (kids.length ? ` ${kids.length === 1 ? 'One child' : kids.length + ' children'} so far: ${kids.slice(0, 6).map(k => '«' + firstName(k) + '»').join(', ')}${kids.length > 6 ? ' and more' : ''}.` : ''));
  }
  const par = parentsOf(data, id), fa = par.father && data.individuals.get(par.father), mo = par.mother && data.individuals.get(par.mother);
  if (fa || mo) lines.push(`My ${fa && mo ? 'father and mother are' : fa ? 'father is' : 'mother is'} ${[fa, mo].filter(Boolean).map(x => '«' + displayName(x) + '»').join(' and ')}.`);
  const ev = indi.events.filter(e => ['RESI', 'CENS', 'EMIG', 'IMMI'].includes(e.tag) && e.place && (dateYear(e.date) ?? 9999) <= year).pop();
  if (ev) lines.push(`${ev.tag === 'EMIG' ? 'I left' : ev.tag === 'IMMI' ? 'I came to' : 'Lately I have lived at'} «${ev.place.split(',')[0]}»${ev.date ? ', ' + datePhrase(ev.date) : ''}.`);
  return lines;
}
