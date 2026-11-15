# Ancestry: A Battle in Time

### The main story, as a play script

This is every line of the main story, in the order you meet it: the villains, Dorothy, the narrator, the letters, and
the ancestor at the heart of each chapter. It is taken straight from the game (`js/storyplot.js` and
`js/storygame.js`). Rewrite it however you like, then hand it back and it will be worked back into the game.

---

## How to edit this script (read this first, and give it to your AI too)

1. **Keep every line ID** (the `[O-01]` at the start of a line). That is how each line finds its way back into
   the game. You may change the words freely. To cut a line, keep its ID and write `CUT`. To add a line, give
   it a new ID after the one it follows, such as `[O-04a]`.
2. **Keep the `{PLACEHOLDERS}`.** They are filled in from each player's family tree: names, towns, years,
   jobs and records. Move them about, drop them or use them more often, but don't invent new ones without saying
   what they should hold. Every placeholder is listed in the next section.
3. **Write alternatives freely.** Where a line repeats (every chapter, every meeting), give several versions
   marked `ALT 1`, `ALT 2` and so on, and the game will rotate through them. The lines that repeat most are
   flagged **⟳ repeats**.
4. **Keep lines short.** Each line shows in a dialogue box about three lines tall on a phone. Two or three
   sentences is the most a line should hold; split longer speeches into several lines.
5. **Ancestors talk in their own dialect.** Anything an ancestor says is put through a dialect filter for where
   they were born (Lancashire, Scots, Cockney, West Country and the rest) and the century. Write their lines in
   plain English and the game adds the accent. Names and places in their lines are protected automatically.
6. **The hero never speaks.** The player is the hero. Others talk to them and about them, but they have no lines.
   Please keep it that way.
7. **Stage directions** in *italics* describe what happens on screen. They help you write, and you can suggest
   changes to them, but they are not shown to the player.

---

## The cast

| Who | |
|---|---|
| **DOROTHY** | Dorothy Pickering. County Archivist, retired. A {SURNAME} herself, from much further down the tree. Built a time machine into her late husband's estate car "because she was a very bored archivist". Bad hip, so you drive. Warm, brisk, calls you "dear". Leaves notes when there is no phone. |
| **SILAS** | Silas Hargreaves, of Hargreaves & Lowe, Probate Genealogists. Grey suit, grey van, grey everything. Was Dorothy's apprentice, "the brightest I ever had, and the loneliest", and ran off with her first time machine, Engine No. 1. A foundling who never had a family. The game's files call him "blank". |
| **LOWE** | Mr Lowe, his partner and clerk. Nervous, literal, always worried. |
| **NOTE** | The narrator: captions, stage directions read aloud, what you see through windows. |
| **LETTER** | Letters and notes that arrive in the story. |
| **THE ANCESTOR** | One per chapter: {ANCESTOR}, the player's {REL}. Up to six chapters, then the Finale ancestor ({ROOT}). Different person, town and century every time. |
| **The men in grey** | Hargreaves's men. They have no lines, only actions. |
| Bit parts | The groom, the bride, the midwife, the photographer, the carter, the parish clerk. One or two lines each. |
| **THE HERO** | The player: {HERO}. Silent. |

---

## Placeholders

Each one is filled in from the player's own family tree.

| Placeholder | What it holds | Example |
|---|---|---|
| `{HERO}` / `{HERO_FULL}` | The player's first name / full name | Jess / Jess Ashworth |
| `{SURNAME}` | The family surname | Ashworth |
| `{HOME}` | The hero's home town | Leeds |
| `{BENEFACTOR}` | The great-grandparent whose dormant estate starts it all | Catherine Holroyd (1904–1962) |
| `{ESTATE}` | "the {SURNAME} estate" or "the estate of {BENEFACTOR}" | the estate of Catherine Holroyd |
| `{ANCESTOR}` / `{ANCESTOR_FULL}` | This chapter's ancestor, first name / full name | Martha / Martha Garside |
| `{REL}` | How they're related to the hero | great-grandmother |
| `{HE}` `{HIM}` `{HIS}` | The ancestor's pronouns | she / her / her |
| `{JOB}` | Their trade, from the file | weaver |
| `{TOWN}` / `{YEAR}` | Where and when the chapter is set | Wigan / 1890 |
| `{PROOF}` | The record this chapter fights over | Marriage of John Ashworth and Sarah Whiteley |
| `{NEXT}` | The next chapter's ancestor, town and year | Harriet Ellery, Wigan, 1890 |
| `{ROOT}` | The earliest person on the line: the Finale's ancestor, the "brick wall" | Robert Vickers |
| `{VAN}` | Hargreaves's vehicle in that era | grey van / grey motor-van / grey carriage / grey coach / grey wagon |
| `{RIDE}` | Everyday transport in that era | car / motor / cart |
| `{BOAT}` | Long-distance travel in that era | flight / steamer / packet ship / ship |
| `{LAW}` | The police in that era | the police / the bobbies / the constables / the watch |
| `{PUB}` `{CHURCH}` `{HALL}` `{WORKS}` `{MARKET}` `{HUB}` `{FARM}` `{INFIRMARY}` `{POST}` `{GARAGE}` `{PHONE}` | Named places in that town and year. `{HALL}` is the Records Office (the vestry before 1837), `{HUB}` the airport or quay, `{GARAGE}` Dorothy's lock-up or barn, `{PHONE}` the phone box or notice board | The Red Lion, St Mary's, the Records Office, … |
| `{CHILD}` | The child of the ancestor that the player descends from | John |
| `{SPOUSE}` | The ancestor's husband or wife | Sarah Whiteley |
| `{N}` / `{TOTAL}` | How many records are proven so far / in all | 3 / 8 |

---

# ACT ONE: THE PROLOGUE

*Present day, {HOME}. The player has just pressed Start.*

## Scene 1. The opening

*Night. The camera is in close, black bars top and bottom, big faces. Caption: "{HOME}. Tonight." It plays once;
the player can skip it.*

*The offices of Hargreaves & Lowe.*

**[O-01] NOTE:** The offices of Hargreaves & Lowe, Solicitors. The lights are on late.

**[O-02] SILAS** *(grinning)***:** Another one, Mr Lowe. {ESTATE}. A fortune, and nobody has come forward to claim it.

**[O-03] LOWE** *(worried)***:** But there are heirs, Mr Hargreaves. The {SURNAME} family. Hundreds of them, going back four hundred years. It is all written down in the parish registers.

**[O-04] SILAS** *(angry)***:** Then we take them OUT of the registers. One name at a time. One generation at a time. All the way back to the very first {SURNAME}.

**[O-05] LOWE** *(worried)***:** If nobody was ever born... and nobody was ever married...

**[O-06] SILAS** *(grinning)***:** ...then there never was a {SURNAME} family. And the money comes to the only people left to ask for it. Us. Start the time engine, Mr Lowe. We are going to erase a family from history.

*Caption: "Meanwhile". The lock-up behind {PUB}.*

**[O-07] NOTE:** Across town, in a lock-up behind the pub, somebody has been listening.

**[O-08] DOROTHY** *(angry)***:** Not while I'm breathing, Silas Hargreaves.

**[O-09] DOROTHY** *(worried)***:** I'm a {SURNAME} too, you see. From a good way further down the family tree than anybody alive today. If he rubs out that line, I am never born. Nor is anybody I love.

**[O-10] DOROTHY** *(determined)***:** He has a time machine. So have I: she's old, she's yellow, and she needs a driver. I'm too old to drive her. But I know who isn't.

*Caption: "{HERO_FULL}. That's you." The camera finds the player.*

**[O-11] NOTE:** You are {HERO}. You have one very old car, one month, and four hundred years of family depending on you. Go back through time, one ancestor at a time, and prove every one of them existed before Hargreaves can rub them out.

*Banner: A BATTLE IN TIME. "Save the {SURNAME} family".*

## Scene 2. Final Notice

*Morning. A letter on the mat.*

**[P1-01] LETTER:** FINAL NOTICE. Re: {ESTATE}, late of {BENEFACTOR'S TOWN}. Unless a proven line of descent is lodged by the last day of the month, the estate passes to our client. No reply is necessary. Yours faithfully, S. Hargreaves, Hargreaves & Lowe, Probate Genealogists.

**[P1-02] NOTE:** You have never heard of Hargreaves & Lowe. You have barely heard of {BENEFACTOR}. Outside, {PHONE} on the corner is ringing. Nobody rings phone boxes any more.
> *In a story whose "present" is before 1925:* "Outside, somebody has pinned a note to {PHONE}, and it has your name on it."

*The player walks to the phone box and answers.*

**[P1-03] DOROTHY:** Is that {HERO}? {BENEFACTOR}'s great-grandchild? Thank heavens. Dorothy Pickering: County Archivist, retired, and family, though not from any year you would know.

**[P1-04] DOROTHY:** Don't sign anything. Silas Hargreaves doesn't find heirs. He removes them. Names are going out of the registers like chalk off a slate, and yours is next in the queue.

**[P1-05] DOROTHY:** Come to my lock-up behind {PUB}. Tell nobody. Oh, and I do hope you can drive.

*The lock-up. A mustard-yellow estate car with wood trim and a brass dial on the roof.*

**[P1-06] DOROTHY:** There she is. My late husband's estate car. We call her the Heirloom.

**[P1-07] DOROTHY:** I fitted the Parish Engine myself. It runs on register ink and it reads the road like a page. She turns the years back. Or she will, once she is mended: the time engine is dead, and it wants three parts before it will go. I was a very bored archivist.

**[P1-08] DOROTHY:** But first, {HALL}. I want the {SURNAME} file out of there before Hargreaves's people shred it. Get in, the door sticks.

**[P1-09] DOROTHY:** Not so fast, mind. Nobody takes my husband's car anywhere until I've seen them handle her. Round the streets, dear. I'll shout.

*The driving lesson. Dorothy calls out after each move.*

**[P1-10] DOROTHY** *(after flat out)***:** Oh, she likes that. Now let's see you stop her.

**[P1-11] DOROTHY** *(after braking)***:** Brake in a straight line, before the corner, never in it. My husband never learned.

**[P1-12] DOROTHY** *(after reversing)***:** Good. That gets you out of any dead end in any century.

**[P1-13] DOROTHY** *(after a handbrake skid)***:** Ha! Space lets the back go. Use it to slide round corners without stopping.

**[P1-14] DOROTHY** *(after a handbrake turn)***:** That's how you lose a grey van in a narrow street. Right: you can drive. Off we go.

**[P1-15] DOROTHY** *(as you set off)***:** You'll do. Now: {HALL}, and quickly.

*A grey van is pulling away from {HALL} with the family file.*

**[P1-16] DOROTHY** *(shouted, mid-chase)***:** Don't be gentle with it, dear. It's a hire van.

**[P1-17] DOROTHY:** One birth certificate: {HERO_FULL}, born {HERO'S BIRTH DATE} in {HERO'S BIRTHPLACE}. That's proof number one, and it proves you exist, which is a start. Now we go backwards, one generation at a time, faster than he can rub them out.

## Scene 3. Spare Parts

**[P2-01] DOROTHY:** Before the Heirloom can travel in time she needs three things. A valve, from {WORKS}. A clock spring, from {MARKET}. And a bottle of proper register ink, from {HALL}. Until she has all three, the time dial stays locked. And Hargreaves will have heard we're looking, so expect company.

**[P2-02] DOROTHY:** The ink costs money, and so will every ticket after it. So while you are at {MARKET}, earn some: {PUB} wants two crates fetched. After today, look for the £ signs in any town in any year. There is always somebody who needs something shifted.

**[P2-03] DOROTHY** *(the valve has come apart in the works yard)***:** Drive over each piece and it's yours. The white dots on the little map show where they've rolled.

**[P2-04] DOROTHY** *(a grey van is racing you to the market)***:** That grey van is after the same spring. Beat it there, dear. Cut corners. Use the handbrake.

**[P2-05] DOROTHY** *(carrying bottles)***:** Stop on the yellow ring to load, and on the next to unload. Those are bottles: three knocks and they're broken, so brake before the corners, not in them.

**[P2-06] DOROTHY** *(a man in grey runs off with the ink)***:** He's on foot, and he's quick. Get out and run after him, or catch him with the car if he's daft enough to stay on the road.

**[P2-07] DOROTHY:** Valve. Spring. Ink. Hold the lamp, dear. There. Hear that ticking? The time dial is working. From now on you can set a year and drive there.

*Banner: TIME TRAVEL UNLOCKED.*

## Scene 4. Relative Speed (the first jump)

**[P3-01] DOROTHY:** Your {REL} {ANCESTOR}, the {JOB}. {TOWN}, {YEAR}. That's the first page Hargreaves will go for.

**[P3-02] DOROTHY:** Get yourself to {TOWN} first: tickets at {HUB}. Then set the dial with T, find a long straight road and keep your foot down until the dial reaches the year. Don't lift off. She hates it when you lift off.
> *If the first chapter is in the home town, the first sentence is dropped. If it is abroad: "You'll need to get to {COUNTRY} first: tickets at {HUB}."*

*The tyres catch fire. White light. The year on screen counts back.*

**[P3-03] NOTE:** {TOWN}, {YEAR}. {ERA ARRIVAL LINE}

The era arrival lines, one per era (these appear on every arrival in a new era):

- **[P3-04] Present day:** Traffic, takeaways and a phone signal.
- **[P3-05] Post-war (1950–):** Coal smoke, corner shops and somebody's wireless through an open window.
- **[P3-06] Early 1900s (1900–1949):** Trams, flat caps and motor cars that still frighten the horses.
- **[P3-07] Victorian (1837–1899):** Gas lamps, horse muck and a hundred chimneys.
- **[P3-08] Georgian (1714–1836):** Mud to the axles, a coach horn somewhere, and not one pavement.
- **[P3-09] Stuart and before:** Thatch, woodsmoke and a church bell. The road is mostly a suggestion.

*Cut scene: end of the Prologue. Caption: "{TOWN}, {YEAR}".*

**[P3-10] NOTE:** Fire on the road behind you. A smell of hot ink. And the street is the same street, give or take {YEARS} years.

**[P3-11] DOROTHY** *(grinning)***:** She works! Oh, she WORKS. Forty years in a shed, and she works. Don't tell my hip, it'll want to come along.

---

# ACT TWO: THE CHAPTERS

*This act plays once for every ancestor in the chapter list, usually five or six times. Each chapter is set in the
town and year of one real event in that ancestor's life. It runs:*

1. *The opening cut scene (Hargreaves's scheme, the ancestor at home, Dorothy).*
2. *The meeting: find the ancestor, the way the scheme decides, and pass the family quiz.*
3. *A day's work at the ancestor's trade.*
4. *The big mission, built on the real event, which wins the {PROOF}.*
5. *The closing cut scene.*

*Because it repeats, this is where the repetition lives. Lines marked **⟳ repeats** are heard in every chapter.
Those are the best places to write several versions.*

## Scene A. The chapter opens (cut scene)

*Night, the {YEAR} branch office of Hargreaves & Lowe. Caption: "{TOWN}, {YEAR}".*

**[A-01] NOTE ⟳ repeats** *(first chapter only)***:** {TOWN}, {YEAR}. Hargreaves & Lowe have an office here too. They have one in every century.
**[A-02] NOTE ⟳ repeats** *(every later chapter)***:** {TOWN}, {YEAR}. Another century, the same grey door.

*Then three lines between Silas and Lowe, which depend on the chapter's **scheme**. Each chapter gets a different
scheme; there are seven, listed below. The first line always begins "{ANCESTOR_FULL}. {PROOF}." and goes on with
that scheme's line.*

| Scheme | **[A-S1] SILAS** *(grinning)* | **[A-S2] LOWE** *(worried)* | **[A-S3] SILAS** *(determined)* |
|---|---|---|---|
| **The false alarm** | A false alarm, Mr Lowe. Shout "fire" and {ANCESTOR} runs, and an empty house has no witnesses. | And while {HE}'s away, sir? | While {HE}'s away, the page goes. |
| **The bought clerk** | Every man has his price, Mr Lowe. The parish clerk's is a sovereign and a new hat. | He'll cut the page out himself, sir? | With his own penknife. Nobody suspects the clerk. |
| **The lift** | No book, no page, no ink. We simply take {ANCESTOR} for a little drive. | A drive, sir? Where to? | Somewhere nobody thinks to write anything down. Out of the record, out of the world. |
| **The scattered letters** | Letters, Mr Lowe. People keep letters. Letters prove who is whose. | So we burn them, sir? | Burning is for amateurs. We scatter them. Nobody believes a letter found in the gutter. |
| **The rumour** | Why erase a life when you can simply end it on paper? A word in the right ear, Mr Lowe. | That {ANCESTOR} is dead, sir? | Dead and buried by teatime. Nobody looks for a dead {MAN/WOMAN}'s birth. |
| **The forger** | My forger has made a lovely copy of the register, Mr Lowe. Every page exactly the same. | Every page, sir? | Every page but one. {ANCESTOR} was never born, according to the new book. |
| **The siege** | If the archivist's driver wants the page so badly, Mr Lowe, we shall take the house. | The whole house, sir? | Every {VAN} we have, round every door. Nothing leaves without our say. |

*Caption: "Meanwhile: {ANCESTOR_FULL}". The ancestor at home, busy with the event the chapter is about. They have no
idea who you are yet. Their line depends on the event, and ends with the quiz clue (see A-Q below).*

| Event | **[A-E] THE ANCESTOR** |
|---|---|
| A wedding | Saturday I'm to be wed to {SPOUSE}. The banns are read, and the parson's book is waiting for the both of us. |
| A birth | Any day now, the midwife says. We have a name picked: {CHILD}. There's a page in the register with a space for it. |
| A family photograph | There's a photographer coming to take the children's likeness. All of them at once, heaven help the man. |
| A census | The enumerator's coming round tonight with his forms. Every soul under this roof, written down for the government. |
| Emigrating | Everything we own is in two trunks. Our names are on the passenger list, and we sail with the tide. |
| A burial | We bury {THE DEAD} this week. Whatever else happens, it'll be written in the book proper. |
| Military service | I've taken the {KING'S/QUEEN'S} shilling. They'll write my name in the muster roll, and then I belong to the army. |
| A baptism | The christening's on Sunday. Our little one, in the parish book at last. |
| (none of these) | There's a gentleman in grey been round asking after the parish book. Says he's from the solicitors. I didn't like his face. |

**The quiz clue.** *Each chapter's family quiz asks one question, and the answer is dropped into conversation first.
The ancestor says it here; Dorothy repeats it in her note (B-02).*

| Question asked later | **[A-Q] THE ANCESTOR** (said here) | **[B-Q] DOROTHY** (in her note) |
|---|---|---|
| What was my mother's name before she wed? | My mother was a {MAIDEN NAME} before she wed, and she never let my father forget it. | {HIS} mother was a {MAIDEN NAME} before she married. {HE}'s prouder of that side than {HE} lets on. |
| What is my father's Christian name? | My father, {FATHER}, always said a good name is worth more than a full purse. | {HIS} father was {FATHER}, and {HE} quotes him at every turn. |
| Who did I marry? | {SPOUSE} will want {HIS/HER} tea, and I've not set foot in the kitchen. | {HE}'s married to {SPOUSE}. |
| Who am I walking out with? | I'm walking out with {SPOUSE}, if you must know, and the whole street does know. | {HE}'s walking out with {SPOUSE}, and the whole street knows it. |
| What year was I born? | Born in {BIRTH YEAR}, I was, and my mother said it was the longest night of her life. | Born in {BIRTH YEAR}, by the register. |
| What do I do for my living? | A {JOB} gets no days off, whatever the solicitors are doing. | {HE} works as a {JOB}. |
| Where was I born? | I was born in {BIRTHPLACE}, and they'll carry me out of {BIRTHPLACE} when the time comes. | {HE} was born here in {BIRTHPLACE} and has never left it for long. |

*The phone box (or a note pinned up, before phones).*

**[A-03] DOROTHY ⟳ repeats:** That's the page he's after, {HERO}: {PROOF}. And this time it's {SCHEME NAME}. Get to your {REL} before his men do.

## Scene B. The meeting

**[B-01] DOROTHY'S NOTE** *(shown as the mission starts; it can be read again from the case file)***:** A note in Dorothy's hand, pinned where you would see it: "{ANCESTOR_FULL}, your {REL}, {JOB}. {SCHEME NOTE} {KNOWS NOTE} Something to remember: {B-Q CLUE}"

*The {SCHEME NOTE}, one per scheme:*

| Scheme | **[B-S] Dorothy's note** | How it plays |
|---|---|---|
| The false alarm | Hargreaves's people have been at the house with a story about a fire at {PLACE 2}, and {ANCESTOR} has gone running. Try the house first, then {PLACE 2}, then {PLACE 3}. | Search three places |
| The bought clerk | Hargreaves has bought the parish clerk. The minute {HALL} is empty he means to cut {ANCESTOR}'s entry out with a penknife. Get there first, and if he runs, run faster. | Drive there against the clock, catch the clerk on foot, take the page home |
| The lift | An hour ago a {VAN} stopped beside {ANCESTOR} and offered {HIM} a lift. Nobody has seen {HIM} since. Find that {VAN} and stop it. | Chase the van, then drive the ancestor home gently |
| The scattered letters | Hargreaves's men broke into {ANCESTOR}'s house in the night and threw every family letter out of the window. Gather them up: one of them will say where {HE} has gone. | Pick up six letters, then go where the last one says |
| The rumour | Hargreaves has put it about that {ANCESTOR} died last week. By tonight somebody will write it down and then it's true. Get round {PUB}, {MARKET} and {CHURCH} and tell everybody otherwise, then find {ANCESTOR}. | Race round three stops, then find them |
| The forger | Hargreaves has had the register copied out with {ANCESTOR} left out of it, and his forger is in town to swap the books. He's just left {HALL} with a parcel. Follow him and he'll lead you to the real one. Don't let him see you. | Tail the forger, then catch him |
| The siege | The {VAN}s have been circling {ANCESTOR}'s house since dawn. {HE}'s loading the family's papers onto a {CART} to take to {CHURCH} for safe keeping. Ride alongside and keep them off. | Guard the cart to the church |

*The {KNOWS NOTE}: the ancestor has either never heard of the hero, or (if the chapter is after the hero's own birth)
already has a child or grandchild with the hero's name.*

**[B-02] ⟳ repeats** *(never heard of you)***:** {HE} has never heard of you.
**[B-03] ⟳ repeats** *(hero is a child in this year)***:** Mind: {HE} has a {SON/DAUGHTER/GRANDCHILD} called {HERO} already, {AGE}, and as far as {HE} knows that is not you. Do not try to explain.
**[B-04] ⟳ repeats** *(hero is grown up in this year)***:** Mind: {HE} knows {HERO} perfectly well, and {HERO} is {AGE}. You are a good deal older than that. Do not try to explain.

*Lines Dorothy shouts during the meeting:*

**[B-05] THE ANCESTOR** *(the lift: being driven home)***:** I've been in one cart today against my will. Go steady in this one.

*Some false-alarm search misses (one per place you try):*

**[B-06]** Nobody in. A neighbour says a man in grey shouted "Fire!" and {ANCESTOR} ran off towards {PLACE 2}.
**[B-07]** No fire here, and no {ANCESTOR}. "Try {PLACE 3}," says somebody, without looking up.
**[B-08]** Not here either. "Gone to {PLACE 2}, I should think."

*You find them. They are wary. Their opening line depends on whether they know a {HERO} already, then their
suspicion depends on the scheme.*

**[B-09] THE ANCESTOR ⟳ repeats** *(never heard of you)***:** Family, you say. {SUSPICION}
**[B-10] THE ANCESTOR ⟳ repeats** *(hero is a child here)***:** {HERO}? My {HERO} is {AGE}, and {asleep indoors / out playing in the street / supposed to be at school}. You've a look of {HIM}, I'll give you that. {SUSPICION}
**[B-11] THE ANCESTOR ⟳ repeats** *(hero is grown here)***:** You've the very look of my {HERO}, only {HE} is {AGE} and you are not. A cousin, is it? {SUSPICION}

| Scheme | **[B-W] {SUSPICION}** (always followed by "Tell me something only family would know.") |
|---|---|
| The false alarm | Some joker in grey sent me running across town for a fire that never was. I'll not be made a fool of twice. |
| The bought clerk | The parish clerk, of all people. Thirty years I've known that man, and he'd sell my name for a sovereign. I'll trust nobody now who can't tell me something only kin would know. |
| The lift | A nice man offered me a lift, and the next thing I know I'm halfway to nowhere in the back of a box. I'll not be kind to strangers again in a hurry. |
| The scattered letters | They had every letter I own out of the drawer and into the street. My mother's hand, my sweetheart's. I'll not talk family with anybody who can't prove they're family. |
| The rumour | Half the town's been round with flowers. Apparently I'm dead. I've never felt better, and I'd like to know who's been telling folk otherwise. |
| The forger | A man swapped our parish book for one with my name missing. I watched him do it and thought he was the verger. I'll trust nobody's face again. |
| The siege | Grey {VAN}s round my door since first light, and now a stranger who drives like a lunatic. Thank you for that, by the way. But I'll still need proof. |

*The quiz: one of the questions in the A-Q table, with four answers to pick from.*

**[B-12] THE ANCESTOR ⟳ repeats** *(right first time)***:** Right first time. Nobody but family would know that.
**[B-13] THE ANCESTOR ⟳ repeats** *(right after a wrong guess)***:** There. Now you sound like one of us.
**[B-14] THE ANCESTOR ⟳ repeats** *(wrong)***:** No. Any stranger off the road would say that. Think on, and try again.

**[B-15] THE ANCESTOR ⟳ repeats** *(never heard of you)***:** Then you're one of ours, though I can't think how. Come home with me. You look half starved and wholly lost.
**[B-16] THE ANCESTOR ⟳ repeats** *(knows a {HERO})***:** Then you're family, right enough, though I can't work out where you fit. You've even the name of my {SON/DAUGHTER/GRANDCHILD}. Come home with me. You look half starved and wholly lost.

## Scene C. A day's work

*The ancestor gives you a job at their own trade (thirteen trades, two jobs each; their asks are listed in the
appendix). Every job ends the same way:*

**[C-01] THE ANCESTOR ⟳ repeats** *(every chapter)***:** Not bad. Not bad at all, for somebody who talks like you do. Here, you've earned it.

*If the job is short, something goes wrong at the end and the ancestor shouts one of these:*

**[C-02]** *(a pickpocket takes the day's pay)* My pay! He's had my pay! Don't just sit there!
**[C-03]** *(a {VAN} rams the load on purpose)* That was no accident. Go on, give it some of its own back.
**[C-04]** *(a rival is after tomorrow's work)* See that fellow? He wants my trade. Get there before him and put my name down.
**[C-05]** *(the load falls off)* You've left half of it in the road. Back you go.
**[C-06]** *(the law takes an interest)* Now you've done it. Don't stop, and don't give them my name.

## Scene D. The big mission

*Built on a real event from the ancestor's life. One of these nine, whichever this ancestor has that the story has
used least. The ancestor asks (D-x-01), people shout along the way, and Dorothy sums up at the end (D-x-done).*

### D-W. Get Me to the Church (a wedding)

**[D-W-01] THE ANCESTOR** *(a woman, the bride)***:** It's my wedding morning and {GROOM} has not come. Somebody's had the wheels off every {RIDE} in the street and the parson won't wait past the bells. He'll be at {PUB}, sick with nerves. Fetch him to church or there's no wedding, and then where will you be?
**[D-W-02] THE ANCESTOR** *(a man, the groom)***:** It's my wedding morning and I'm stuck here. Somebody's had the wheels off every {RIDE} in the street and the parson won't wait past the bells. Get me to that church. If I'm not wed today then there's no us, and by the look on your face there's no you.

*Searching for the groom (bride's version):*
**[D-W-03]** "He was in here an hour since, white as his shirt. Try {WORKS}."
**[D-W-04]** "Not here. He said something about needing air. {MARKET}?"
**[D-W-05]** "Him? Went off towards {WORKS} with a face like a wet week."

*Searching for the best man (groom's version):*
**[D-W-06]** "The best man? He was showing everybody the ring. Try {MARKET}."
**[D-W-07]** "He was here. He's gone to {WORKS} to borrow a collar stud."
**[D-W-08]** "Not here. {MARKET}, most like."

**[D-W-09] THE GROOM** *(in the car)***:** I've changed my mind. No. No, I haven't. Faster!
**[D-W-10] THE BRIDE** *(driven to the wedding breakfast)***:** Mind my frock. And mind him, he's gone the colour of the cake.
**[D-W-done] DOROTHY:** {GROOM} and {BRIDE}, married. It's in the book and the ink's dry.

### D-B. Special Delivery (the birth of the child you descend from)

**[D-B-01] THE ANCESTOR:** The baby's coming and the midwife's not: some grey devil has {let her tyres down / lamed her pony}. Fetch her from {INFIRMARY}, and drive like the child's life hangs on it. Yours might, come to think.
**[D-B-02]** "The midwife? Out on a call. She was heading for {CHURCH}."
**[D-B-03]** "You've missed her. She went to {MARKET} for carbolic."
**[D-B-04]** "Not here. Try {CHURCH}."
**[D-B-05] THE MIDWIFE:** I've delivered half this town and I'll not be late for this one. Whatever this thing is, make it go.
**[D-B-done] DOROTHY:** {CHILD_FULL}, born safe and written down. One more link that holds.
> *If the baby is the hero:* "{CHILD_FULL}, born safe and written down. That one is you, by the way."

### D-E. The Last Boat / Final Call (emigrating; "Final Call" after 1950)

**[D-E-01] THE ANCESTOR:** Everything I own is in two trunks and the {BOAT} {sails on the tide / leaves within the hour} for {COUNTRY}. Every {carter / taxi} in town has been paid by some grey gentleman to be busy. Get the trunks to {HUB}, then come back for me.
**[D-E-02] THE ANCESTOR** *(loading the trunks)***:** Don't look back at the house. It's bad luck to look back.
**[D-E-03] THE ANCESTOR** *(halfway to the quay)***:** The tickets! I left the tickets at the post office!
**[D-E-done] DOROTHY:** {ANCESTOR_FULL}, on the passenger list in black and white. Wherever {HE} went, {HE} went on the record.

### D-K. The King's Shilling (military service)

**[D-K-01] THE ANCESTOR:** I'm to report and the muster roll's gone missing with my name on it. No roll, no record, and a man with no record never served. Run these dispatches round and then get me to {HUB} before the column moves off.
**[D-K-done] DOROTHY:** {ANCESTOR_FULL}, on the muster roll. Served, counted and remembered.

### D-C. Count Me In (a census)

**[D-C-01] THE ANCESTOR:** The census man's been round in tears. A grey {carriage / van} knocked him flat and took his schedules. If this street isn't counted tonight, we were never here. Do his round for him and get the book back.
**[D-C-02] THE ANCESTOR** *(as you set off)***:** Knock loud. Half of them will think you're the rent man and hide.
**[D-C-03]** "The lodger? He scarpered when he heard the census was coming. Try {FARM}."
**[D-C-04]** "Slept in the barn, went at first light. {MARKET}, maybe."
**[D-C-05]** "Not here. Try {FARM}."
**[D-C-done] DOROTHY:** {ANCESTOR_FULL}, {JOB}, counted at {TOWN}. Present and correct.

### D-P. Watch the Birdie (a family photograph)

**[D-P-01] THE ANCESTOR:** There's a photographer come to {HUB}, and we've saved a twelvemonth for one likeness of us all. The minute they were washed the children scattered: {CHILDREN'S NAMES}. Find every one, then fetch the man himself before he loses the light. A grey fellow's been offering him double to go home.
**[D-P-02]** "The photographer? Gone to wet his whistle at {PUB}."
**[D-P-03]** "He was here. Went to {MARKET} to buy a new cloth for his head."
**[D-P-04]** "Not here. {PUB}?"
**[D-P-05] THE PHOTOGRAPHER:** Nobody is to smile. It takes eight seconds and smiling is a strain.
**[D-P-done] DOROTHY:** One photograph: {CHILDREN'S NAMES}, and their parents trying not to blink. Nobody can rub out a photograph.

### D-S. Set in Stone (burying a parent, husband or wife)

**[D-S-01] THE ANCESTOR:** We bury my {father / mother / husband / wife} today. {THE DEAD}. The mason has the stone cut and paid for, and there's a grey fellow been round offering him double to leave the name off it. Fetch the stone from {WORKS} to the churchyard, and go gently. It is the last thing we shall ever give {HIM/HER}.
**[D-S-done] DOROTHY:** {THE DEAD}, laid to rest and named in stone. They cannot rub out granite.

### D-H. Wet the Baby's Head (the ancestor's own baptism)

**[D-H-01] THE ANCESTOR:** Parson says the register fell open in the night and the wind took the pages. In a shut vestry. With the door locked. The page with my name on is out there somewhere, and I'd like to go on having been christened.
**[D-H-02]** "Parson's out visiting the sick. {INFIRMARY}."
**[D-H-03]** "He's been and gone. Up at {FARM}, I heard."
**[D-H-04]** "Not here. Try {INFIRMARY}."
**[D-H-done] DOROTHY:** {ANCESTOR_FULL}, baptised {DATE}. Back in the book.

### D-X. Struck Out (when the file has none of the above)

**[D-X-01] THE ANCESTOR:** That grey lot are at {HALL} this minute with the book open at our page. I saw them through the window. Whatever that contraption of yours does, do it now.
**[D-X-02] THE PARISH CLERK** *(running)***:** It's only a name! You've hundreds!
**[D-X-done] DOROTHY:** {ANCESTOR_FULL}: the entry stands.

*After every big mission:*

**[D-99] DOROTHY ⟳ repeats** *(added to the end of every "done" line)***:** Proof {N} of {TOTAL}. Next: {NEXT}.

## Scene E. The chapter closes (cut scene)

*Night again, Hargreaves & Lowe. Caption: "Hargreaves & Lowe". The four versions rotate by chapter.*

**[E-01] SILAS** *(angry)*, one of:
- **ALT 1:** Lodged? LODGED? One page, and they have it in a folder with a ribbon round it.
- **ALT 2:** Again! That ridiculous car, and that ridiculous old woman.
- **ALT 3:** How do they always know where to look? They must be family. They must actually care.
- **ALT 4:** Do you know what it costs to keep a van in four centuries, Mr Lowe? Do you?

**[E-02] LOWE ⟳ repeats** *(worried)***:** That's {N} links of the chain proven, sir. If they reach the top of the tree...

**[E-03] SILAS ⟳ repeats** *(determined)***:** They won't. We go further back. {NEXT}. Before they've even worked out where.
> *Before the Finale:* "Then we go to the very top. The root. And we take it out."

*The ancestor's doorstep. Caption: "{ANCESTOR_FULL}".*

**[E-04] THE ANCESTOR ⟳ repeats** *(smiling)***:** Mind how you go, {HERO}. Whoever you are, you've the family look about you.

*Unused spare lines from the opening scene. These played before the schemes were written and will come back if a
chapter has no scheme:*

- **[A-X1] LOWE:** They followed us, sir. That yellow car was seen on the bridge this morning. / The archivist's car again, sir. It's come back through the years after us. / Sir, they're proving them faster than we can rub them out. / The men are tired, sir. And the vans keep getting rammed.
- **[A-X2] SILAS:** Then we shall simply have to be quicker. Tonight. / Let it come. Nobody outruns the Engine twice. / Then take the book before they find the family. Go! / Tired? We are erasing four hundred years, Mr Lowe. Nobody said it was a half-day.

## Hargreaves's letters

*Left under the Heirloom's wiper, on grey paper, after the second and fourth chapters.*

**[L-01] LETTER:** Under the wiper, on grey paper, in grey ink: "You are costing me a great deal of money. Kindly stop. S.H."

**[L-02] LETTER:** Another grey note: "You have so very many of them. Mothers, grandfathers, aunts by the dozen. You would hardly miss one. I should have noticed one. S.B."
> *Note: this one is signed S.B. while the first is S.H. Deliberate (Silas Blank, his real non-name) or a slip? Your call.*

---

# INTERLUDES

## Grey Area (after the first chapter: tail a van to find his office)

**[I1-01] DOROTHY'S NOTE:** "They came in a {VAN} and they will go home in one. Follow it. Not so close they notice, not so far you lose it. I want to know where Silas keeps his men in {YEAR}."
**[I1-02] DOROTHY** *(shouted, mid-tail)***:** Hang back, dear. You are driving the only mustard-coloured estate car in {YEAR}.
**[I1-03] NOTE:** Through the glass: rows of desks, rows of grey men, and on every desk a parish register and a bottle of something that smells of bleach. The brass plate by the door says HARGREAVES & LOWE. EST. {YEAR − 40}.
**[I1-04] DOROTHY'S NOTE:** Dorothy's next note is mostly underlining: "An office. In {YEAR}. He has a branch in every century, the cheek of the man. No wonder he is always ahead of us. We shall have to pay a call on head office."

## The Paper Convoy (halfway: guard the parish registers)

**[I2-01] DOROTHY'S NOTE:** "The parish is sending every old register it has to be rebound: by {CART}, by way of {FARM}, to {HUB}. Three centuries of {TOWN} in one {CART}. I have counted five grey {vans / carriages} in town this morning. See it safe aboard."
**[I2-02] THE CARTER:** I was told this was a quiet job. Books, they said. Who robs books?
**[I2-03] DOROTHY:** "Three hundred years of baptisms, safe on the {BOAT}. Somewhere in that {CART} is the first time anybody ever wrote your surname down. He will be furious."

## The Golden Door (only if nobody in the tree ever left the country: Ellis Island, 1907)

**[I3-01] DOROTHY'S NOTE:** "He's gone wholesale. Ellis Island, New York, 1907. Twelve million names on those manifests and he means to thin them out. Not your family's, perhaps, but somebody's. Go."
**[I3-02] DOROTHY:** Twelve million strangers who'll never know your name. That's the job, dear. Now, back to your own lot.

## The Break-In (before the Finale: raid head office, present day, at night)

**[I4-01] DOROTHY:** He's ahead of us and I want to know how. Hargreaves & Lowe keep an office in town. Very grey. Very shredder. Get whatever's left of his ledger, and expect company on the way out.
*They throw the ledger out of the windows a page at a time; an office boy runs off with page one; the alarm goes.*
**[I4-02] DOROTHY:** I ought to tell you. He was my apprentice. The brightest I ever had, and the loneliest. I showed him my first Engine one Friday, and on the Monday the pair of them were gone.
**[I4-03] DOROTHY:** Page one, in his own hand: "HARGREAVES, Silas. Foundling. Left at the door of the parish of {ROOT_TOWN}. No name given." Oh, I see. He isn't only erasing your family, {HERO}. He's been looking for his own.
**[I4-04] DOROTHY:** And the last entry: {ROOT_FULL}, {ROOT_TOWN}, {ROOT_YEAR}. The very top of your tree. He's going for the root.

---

# ACT THREE: THE FINALE

## The Finale opens (cut scene)

*Dusk at the church. Caption: "{ROOT_TOWN}, {ROOT_YEAR}. Dusk."*

**[F-01] NOTE:** The oldest page in the oldest book. Above {ROOT_FULL}, nothing at all. No father, no mother, no parish of birth. A brick wall.
**[F-02] SILAS** *(determined)***:** Somebody has to be nobody, {ROOT}. Why not you?
**[F-03] SILAS** *(worried; caption "Silas Hargreaves")***:** ...Why not me?
**[F-04] DOROTHY** *(worried)***:** This is the root, {HERO}. If that entry goes, every name under it goes too. Yours. Mine. All of them. Get to {ROOT} before he does.

## Brick Wall (meeting the root ancestor)

**[F-05] DOROTHY'S NOTE:** "{ROOT_FULL}, your {REL}, {JOB}. Try the house first. If {HE} is out, {HE} will be at {PLACE 2}, and failing that {PLACE 3}. Be polite. {HE} has never heard of you. Something to remember: {QUIZ CLUE}"
**[F-06] THE ROOT:** Family, you say. There's a grey fellow been round all week asking after the parish book, and I trust nobody who can't tell me something only kin would know.
**[F-07] THE ROOT:** Then you're mine, sure enough, though how is past my wits. There's nobody behind me in any book, you know. I'm where it starts.

## The Last Page

**[F-08] THE ROOT:** There's a gentleman at the church this hour, grey as a gravestone, turning the parson's book to my page. He said the queerest thing. He said, "Somebody has to be nobody." What did he mean by it?
**[F-09] DOROTHY'S NOTE** *(in pencil, shaking)***:** "{HERO}. This is it. {ROOT_FULL}, baptised {DATE}, {ROOT_TOWN}. Nobody above {HIM} in any record. Your brick wall. If that entry goes, every name under it goes, down to yours. He has my first Engine. Do not let him turn the page."
*A barricade, the torn register, a clerk in the churchyard, then Engine No. 1. Every few knocks Silas jumps to another
century and drags you with him.*
**[F-10] SILAS** *(shouted, mid-chase)***:** You have thousands of them! I only ever wanted one!

*The reveal, played as a cut scene in the churchyard.*

**[F-11] SILAS** *(determined)***:** Go on, then. Read it. Read the page you were so keen to save. Not the entry. The margin.
**[F-12] NOTE:** In the margin beside {ROOT}'s entry, in the parson's cramped hand: "Also a second infant of this house, base-born, put out to the parish this day. No name given." And beneath it, in another hand: "Entered as HARGREAVES, for the overseer who signed for him."
**[F-13] SILAS** *(worried)***:** Another man's name. Nobody thought to give me my own. Four hundred years of your people in every book I open, and my whole family is a gap in a margin. I thought if nobody had a tree, I should not mind so much.
**[F-14] DOROTHY** *(determined)***:** Oh, Silas. You silly man. That's not a gap. That's a sibling. You've spent thirty years trying to erase your own family.

*If the hero has no ancestors in the file at all, a short version plays instead:*
**[F-15] DOROTHY:** There's nobody above you in this file, dear, which makes you the top of the tree and the whole of it. Hargreaves only needs one page. He's at {HALL} now with my first Engine.
**[F-16] SILAS:** A foundling has no tree. I thought if nobody had one, I should not mind so much.
**[F-17] DOROTHY:** Then start one, you silly man. Everybody's is one name long to begin with.

---

# EPILOGUE: CASE CLOSED

*Cut scene. The lock-up, present day, afternoon. Caption: "{HOME}. The present day."*

**[X-01] NOTE:** Back where it started: a lock-up behind {PUB}, a yellow car with a scorched dial, and a grey man with nowhere to be.
**[X-02] SILAS** *(worried)***:** I don't suppose there is any tea.
**[X-03] DOROTHY** *(grinning)***:** There's always tea. Drink it, then we'll lodge the pedigree. All three of us.

**[X-04] DOROTHY:** Every link proven, {HERO}, from you to {ROOT_FULL}. And one more name for the chart than we started with. Drive us to {HALL}, both of us. Slowly. My hip, and his nerves.
**[X-05] NOTE:** The pedigree of {HERO_FULL} is lodged and stamped. {ESTATE} is released to its rightful heirs: you, and one newly discovered cousin, many times removed, who cries all over the paperwork.
**[X-06] SILAS:** I have a great-great-aunt. Several, apparently. I should like to meet them. Might I borrow the car?
**[X-07] DOROTHY:** You may not. But {HERO} might drive you. The Heirloom is yours now, dear: every town, every year, anyone in your tree. Go and say hello. They've been waiting long enough.

*Banner: CASE CLOSED.*

---

# AFTER THE END

## Silas in the back seat

*After the story, Silas rides along. Every third relative you meet, he says one of these.*

- **[Z-01]** Is that one of ours? I mean yours. I mean ours.
- **[Z-02]** She has my chin. Do you see it? That is my chin.
- **[Z-03]** I had no idea there were so many. Do they all come at Christmas?
- **[Z-04]** I should like to write that one down. In ink. I have given up pencil.
- **[Z-05]** Nobody ever told me families were so loud.
- **[Z-06]** May we stop? I think that gentleman is my great-great-great-uncle and I have nothing to give him.

**[Z-07] DOROTHY** *(at her workbench, once the story is done)***:** Nothing left to prove, dear. Go and visit them. Take your time; you've got all of it.

## The Foundling File

*One page of Silas's own record is hidden in each era the story visits. Found in this order:*

- **[Y-01]** Parish of {ROOT_TOWN}. Left at the vestry door on a Tuesday: one male infant, about a week old, in a basket. No note. No name.
- **[Y-02]** Entered by the overseers as SILAS, for the saint's day, and HARGREAVES, for the overseer who signed for him.
- **[Y-03]** Apprenticed at nine to a law stationer. Absconded. Returned. Absconded. "The boy reads parish registers as other boys read adventure stories."
- **[Y-04]** A letter, never posted: "To any person of the name of". The name after it has been rubbed out so often the paper has gone through.
- **[Y-05]** A family tree in a child's hand. There is one name on it, his own, drawn very carefully, with room left all round.
- **[Y-06]** A reference in Dorothy's writing: "The brightest apprentice I ever had. He asked who the Engines were for. I said, people with somebody to go back to. I have regretted it since."

## Somebody's Son (the last mission, once every page is found)

**[Y-07] DOROTHY:** You found all of it. I never could. A Tuesday, the vestry door, {ROOT_TOWN}, {ROOT_YEAR}: the very year you stood there with {ROOT}. He was a week old and forty yards off the whole time.
**[Y-08] DOROTHY:** We have a machine that goes to Tuesdays, {HERO}. He won't ask. He has never asked anybody for anything. So I'm asking for him.
**[Y-09] SILAS** *(collected from the lock-up)***:** I have brought sandwiches. I did not know what one brings.
*Asking round the town for a girl with a basket:*
**[Y-10]** Nobody has seen a girl with a basket. "Try {PUB}. They take in lodgers and ask nothing."
**[Y-11]** "There was a lass. Kept her shawl up. Went toward {MARKET} at first light."
**[Y-12]** "A basket? Aye. She asked the way to {INFIRMARY} and then didn't take it."
**[Y-13] SILAS** *(driven to the church)***:** Not too close. I only want to see. I have rubbed out a great many people and I should not like to smudge this.
**[Y-14] NOTE:** A girl of nineteen in a grey shawl sets a basket down at the vestry door. She tucks the blanket in. She says a name, twice, so that it will keep. It is not Hargreaves.
**[Y-15] SILAS:** She gave me one. Did you hear? I shan't tell you what it is. I have never had anything before that was only mine.
**[Y-16] SILAS:** She has your chin, {HERO}. Or you have hers. I should have looked up from the paperwork years ago.
**[Y-17] DOROTHY:** Then write it in, Silas. In ink this time. And come home, the pair of you. There's a chart on my wall with room left all round one name, and I think it's finished waiting.

---

# APPENDIX 1: The lines that repeat most

These are heard in every chapter, so they are where the story feels repetitive. Each would benefit from four to
six versions:

| ID | Line | Heard |
|---|---|---|
| C-01 | "Not bad. Not bad at all, for somebody who talks like you do. Here, you've earned it." | After every day's work |
| B-15 / B-16 | "...Come home with me. You look half starved and wholly lost." | After every meeting |
| B-12 / B-13 / B-14 | The quiz replies | Every meeting |
| E-02 / E-03 / E-04 | Lowe counting links, Silas naming the next ancestor, the ancestor's farewell | Every chapter's closing scene |
| A-02 / A-03 | "Another century, the same grey door." / "That's the page he's after..." | Every chapter's opening scene |
| D-99 | "Proof {N} of {TOTAL}. Next: {NEXT}." | After every big mission |
| B-02 to B-04 | The "never heard of you" notes | Every meeting |

# APPENDIX 2: The day's work, by trade

*The ancestor's ask for each job. These are smaller and more optional; rewrite them if you like.*

| Trade | Job | **The ancestor asks** |
|---|---|---|
| Miner, labourer | Three Loads | Three loads from {WORKS} down to {HUB} before the hooter goes. Every one that's late is a day's pay docked, and I've none to spare. Thy contraption looks strong enough. |
| | Runaway Tubs | A string of tubs has broken loose from {WORKS} and gone rattling off down the town. Six of them, loaded. Catch every one before something catches them, and the gaffer need never know. |
| Weaver, tailor | Cut From the Same Cloth | Two pieces of finished cloth to go to the draper in {MARKET}. Finished, mind. One splash of muck and it comes out of my wages, so drive it like it was a christening gown. |
| | The Knocker-Up | Half the street is still abed and the gates shut on the stroke. Anybody locked out loses the day. Go round and rattle every window, then be at {WORKS} before the hooter. |
| Farmer | Gone Astray | Somebody in a grey coat left the gate open and every beast I own is out on the lane. Round them up, then take the cart to {MARKET} before the dealers go home. |
| | Market Day | Two churns for {MARKET}, and they'll not keep in this heat. Mind the ruts, mind the dog, and mind you get a fair price. |
| Servant, cook | Below Stairs | The mistress wants the whole list fetched before she rings for tea, and she rings early when she's vexed. I can't be in four places at once. Can you? |
| | The Mistress Is Out | The mistress is to be driven to church and the coachman's nowhere. Somebody in a grey coat stood him a drink. She notices every bump, mind. Every one. |
| Fisherman, docker | Fresh Today | Two boxes off the boat and they want to be in {MARKET} while they still smell of the sea and not of Friday. Go on, shift. |
| | Pots and Lines | The pots came adrift on the tide and they're strewn the length of the quay road. Fetch them in before somebody else does. |
| Railwayman, postman | The Round | Bags for {POST}, {HALL}, the school and {PUB}, and the timetable waits for nobody. I'll ride along and shout if you're late. |
| | The Night Mail | The mail goes out to {HUB} tonight by way of {FARM}, and three grey {VAN}s have sat outside all afternoon doing nothing. I don't care for {VAN}s that do nothing. |
| Shopkeeper | Orders Out | Five orders, five doors, and every one of them expects it before dinner. A shop lives on its name. Don't lose me mine. |
| | Five-Finger Discount | That grey article has just walked out of here with a week's takings under his hat. He went towards {MARKET}. I'd go myself, but who'd mind the shop? |
| Smith, joiner | Made to Last | That's a week of my work on the bench, wanted at the church, and a {mended wheel / mended generator} wanted at {FARM}. Set it down gently. I'll know if you didn't. |
| | Tools of the Trade | Some comedian in a grey apron has had my tool bag and scattered the lot between here and {MARKET}. Every one of those cost me a week's wage. Find them. |
| Nurse, doctor | On Call | There's a man hurt up at {FARM} and nothing with wheels to fetch him. Bring him to {INFIRMARY}, quick but smooth. He has enough broken already. |
| | The Rounds | Four calls to make before dark, and my feet gave out at dinner time. You have wheels. Physic to each door, and no dawdling at {PUB}. |
| Teacher, clergy | Truants | Half my flock has bolted. Somebody told them there was a grey man giving out toffee. Round them up before the inspector arrives and finds me teaching the furniture. |
| | The Treat | It is the Sunday school treat and the waggonette has not come. Take the little ones up to {FARM} for me. If one of them is sick, you will hear about it. |
| Soldier, constable | Dispatches | Orders for the constabulary, the quay, the hall and the church tower, and back to me. At the double. Consider it a test of character. |
| | Absent Without Leave | One of my lads has taken the shilling and then taken to his heels, in a borrowed grey coat. He was last seen by {PUB}. Bring him back on his own feet, if you please. |
| Clerk, solicitor | In Triplicate | Stamped at {HALL}, countersigned at {POST}, witnessed at {POLICE} and back on my desk before the office shuts. That's how things get done properly. |
| | Due Process | A grey gentleman has been in three times this week asking for a copy of every will in the district. Follow him when he leaves. I should like to know where a man like that keeps his paperwork. |
| Gentleman, landowner | Driving the Quality | You may drive me to {HALL} and then to church. You will not jolt me, you will not splash me, and you will not speak unless the vehicle is on fire. |
| | Leaving Cards | One calls, one leaves a card, one goes. Five houses before luncheon. You will hand in the cards. I shall remain in the vehicle and be seen. |
| Anybody else | Earning Your Keep | If you're stopping, you can make yourself useful. Two loads from {MARKET} to {PUB}, and there's a drink in it if nothing gets broken. |

Every job opens with the ancestor saying "I'm a {JOB}, and it's no life for the idle." before the ask above.
**⟳ That opener repeats too.**
