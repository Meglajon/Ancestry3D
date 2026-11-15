# Ancestry: A Battle in Time

### The main story, as a play script (second draft: no repeats, more jokes)

This is every line of the main story, in the order you meet it: the villains, Dorothy, the narrator, the letters, and
the ancestor at the heart of each chapter. The first draft was taken straight from the game (`js/storyplot.js` and
`js/storygame.js`). This draft is the rewrite, and **it is now in the game**: the packs of alternatives live in
`LINES` at the top of `js/storyplot.js`, and `tests/story.test.mjs` fails if any sentence is said twice in one story.

---

## What changed in this draft

1. **Nothing heard twice.** Every line that used to play in every chapter now has a pack of `ALT`s, at least seven
   where a line can come up in all six chapters and the Finale. **Each pack is dealt like shuffled cards: one pack
   per line ID for the whole story, and no ALT comes round again until the pack is empty.** The shuffle is seeded by
   the family, so the same tree always reads the same way.
2. **ALT 1 is usually the original line**, so nothing already recorded or tested is lost.
3. **Fixed joins are now packs too.** Three bits of glue used to be hard-wired and were heard every chapter. They now
   have their own IDs: `A-02a` (Silas's lead-in, which used to be the fixed "{ANCESTOR_FULL}. {PROOF}."), `B-11a`
   (the ancestor's challenge, which used to be the fixed "Tell me something only family would know.") and `C-00`
   (the day's-work opener, which used to be the fixed "I'm a {JOB}, and it's no life for the idle."). `B-01` and
   `B-01a` do the same for the frame of Dorothy's note.
4. **Long lines are split** so each fits the dialogue box. The second half takes the same ID with an `a`:
   `O-06a`, `O-06b`, `O-11a`, `P1-01a`, `P1-03a`, `P1-07a`, `P1-17a`, `P2-01a`, `P2-02a`, `P2-07a`, `P3-02a`,
   `D-W-01a`, `D-W-02a`, `D-K-01a`, `D-P-01a`, `D-S-01a`, `I1-03a`, `I1-04a`, `I2-01a`, `I2-03a`, `I4-01a`,
   `I4-02a`, `I4-03a`, `F-08a`, `F-09a`, `F-13a`, `X-04a`, `X-05a`, `X-07a`, `Y-07a`. Where both halves have ALTs,
   ALT 1 goes with ALT 1 and ALT 2 with ALT 2.
5. **A few brand-new lines**, all optional and all marked **(new)**: `I2-02a`, `F-10a`, `X-05b`, `Z-06a` to
   `Z-06f`. Each says when it should play.
6. **No new placeholders in the main story.** Everything in braces was already in the first draft, bar three for the family favours (see point 9 and the favours section).
7. **The S.B. question is answered.** The second grey letter is now signed "S.B.", crossed out, with "S.H." written
   beside it. A slip of the pen that he corrects, and the first hint that Hargreaves is not his name.
8. **Echoes kept on purpose.** "Somebody has to be nobody" (F-02, F-08a), the chin (Z-02, Y-16), "room left all
   round" (Y-05, Y-17) and the overseer's signature (F-12, Y-02) are meant to be heard twice. They are the only ones.
9. **Found while wiring it in**, and added here so the script stays complete:
   - **Family favours** (the optional jobs for brothers, sisters and spouses) had one fixed greeting and one fixed
     thank-you, heard up to fourteen times. They are now `V-01` and `V-02`, fourteen of each, and a favour is never
     the same job a chapter's ancestor has already given you.
   - **The quiz** now asks a different kind of question each chapter for as long as it can, so no clue comes round
     a third time.
   - **The Finale's search** had its own three "not here" lines: now `F-05a` to `F-05c`.
   - **Dorothy's verdict** after a big mission is two boxes: the verdict with the running total, then where next.
   - **The ancestor at home** (A-E) and the quiz clue (A-Q) are two shots in the cut scene, not one long one.
   - A wrong quiz answer picks from three different B-14 lines in each meeting, and the first is never one you
     have heard in an earlier meeting.

---

## How to edit this script (read this first, and give it to your AI too)

1. **Keep every line ID** (the `[O-01]` at the start of a line). That is how each line finds its way back into
   the game. You may change the words freely. To cut a line, keep its ID and write `CUT`. To add a line, give
   it a new ID after the one it follows, such as `[O-04a]`.
2. **Keep the `{PLACEHOLDERS}`.** They are filled in from each player's family tree: names, towns, years,
   jobs and records. Move them about, drop them or use them more often, but don't invent new ones without saying
   what they should hold. Every placeholder is listed in the next section.
3. **Write alternatives freely.** Where a line repeats (every chapter, every meeting), give several versions
   marked `ALT 1`, `ALT 2` and so on, and the game will deal them out without repeating. The lines that do this
   are flagged **⟳ rotates**.
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
| **DOROTHY** | Dorothy Pickering. County Archivist, retired. A {SURNAME} herself, from much further down the tree. Built a time machine into her late husband's estate car "because she was a very bored archivist". Bad hip, so you drive. Warm, brisk, calls you "dear". Leaves notes when there is no phone. Has opinions about her late husband's driving. |
| **SILAS** | Silas Hargreaves, of Hargreaves & Lowe, Probate Genealogists. Grey suit, grey van, grey everything. Was Dorothy's apprentice, "the brightest I ever had, and the loneliest", and ran off with her first time machine, Engine No. 1. A foundling who never had a family. The game's files call him "blank". |
| **LOWE** | Mr Lowe, his partner and clerk. Nervous, literal, always worried, and the only villain in history who keeps receipts. |
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

**[O-01] NOTE:** The offices of Hargreaves & Lowe, Solicitors. The lights are on late. Even the lights are grey.

**[O-02] SILAS** *(grinning)***:** Another one, Mr Lowe. {ESTATE}. A fortune, gathering dust, and not one soul has come forward to claim it.

**[O-03] LOWE** *(worried)***:** But there are heirs, Mr Hargreaves. The {SURNAME} family. Hundreds of them, going back four hundred years. It's all in the parish registers. I checked twice. I wish I hadn't.

**[O-04] SILAS** *(angry)***:** Then we take them OUT of the registers. One name at a time. One generation at a time. All the way back to the very first {SURNAME}.

**[O-05] LOWE** *(worried)***:** If nobody was ever born... and nobody was ever married...

**[O-06] SILAS** *(grinning)***:** ...then there never was a {SURNAME} family. And the money comes to the only people left to ask for it. Us.

**[O-06a] LOWE** *(worried)***:** Is that legal, sir?

**[O-06b] SILAS** *(grinning)***:** Nobody has ever thought to forbid it, Mr Lowe. That is the beauty of it. Start the time engine. We are going to erase a family from history.

*Caption: "Meanwhile". The lock-up behind {PUB}.*

**[O-07] NOTE:** Across town, in a lock-up behind the pub, somebody has been listening in. She would call it research.

**[O-08] DOROTHY** *(angry)***:** Not while I'm breathing, Silas Hargreaves.

**[O-09] DOROTHY** *(worried)***:** I'm a {SURNAME} too, you see. From a good way further down the family tree than anybody alive today. If he rubs out that line, I am never born. Nor is anybody I love.

**[O-10] DOROTHY** *(determined)***:** He has a time machine. So have I: she's old, she's yellow, and she needs a driver. My hip retired before I did. But I know somebody with two good ones.

*Caption: "{HERO_FULL}. That's you." The camera finds the player.*

**[O-11] NOTE:** You are {HERO}. You have one very old car, one month, and four hundred years of family depending on you. No pressure.

**[O-11a] NOTE:** Go back through time, one ancestor at a time, and prove every one of them existed before Hargreaves can rub them out.

*Banner: A BATTLE IN TIME. "Save the {SURNAME} family".*

## Scene 2. Final Notice

*Morning. A letter on the mat.*

**[P1-01] LETTER:** FINAL NOTICE. Re: {ESTATE}, late of {BENEFACTOR'S TOWN}. Unless a proven line of descent is lodged by the last day of the month, the estate passes to our client.

**[P1-01a] LETTER:** No reply is necessary. No reply will be read. Yours faithfully, S. Hargreaves, Hargreaves & Lowe, Probate Genealogists.

**[P1-02] NOTE:** You have never heard of Hargreaves & Lowe. You have barely heard of {BENEFACTOR}. Outside, {PHONE} on the corner is ringing. Nobody has rung it in twenty years, and it sounds surprised.
> *In a story whose "present" is before 1925:* "Outside, somebody has pinned a note to {PHONE}, and it has your name on it. Spelled correctly, which is the worrying part."

*The player walks to the phone box and answers.*

**[P1-03] DOROTHY:** Is that {HERO}? {BENEFACTOR}'s great-grandchild? Thank heavens. I've been ringing every phone box in the district.
> *Before 1925, the last sentence is:* "I've pinned one of these to every board in the district."

**[P1-03a] DOROTHY:** Dorothy Pickering: County Archivist, retired. And family, though not from any year you would know. I'll explain later. It won't help.

**[P1-04] DOROTHY:** Don't sign anything. Silas Hargreaves doesn't find heirs. He removes them. Names are going out of the registers like chalk off a slate, and yours is next in the queue.

**[P1-05] DOROTHY:** Come to my lock-up behind {PUB}. Tell nobody. Oh, and I do hope you can drive.

*The lock-up. A mustard-yellow estate car with wood trim and a brass dial on the roof.*

**[P1-06] DOROTHY:** There she is. My late husband's estate car. We call her the Heirloom. He called her other things, mostly on hills.

**[P1-07] DOROTHY:** I fitted the Parish Engine myself. It runs on register ink and it reads the road like a page. She turns the years back.

**[P1-07a] DOROTHY:** Or she will, once she is mended. The time engine is dead, and it wants three parts before it will go. I was a very bored archivist. Other people take up bowls.

**[P1-08] DOROTHY:** But first, {HALL}. I want the {SURNAME} file out of there before Hargreaves's people shred it. Get in. The door sticks. Everything sticks.

**[P1-09] DOROTHY:** Not so fast, mind. Nobody takes my husband's car anywhere until I've seen them handle her. Round the streets, dear. I'll shout. I'm good at it.

*The driving lesson. Dorothy calls out after each move.*

**[P1-10] DOROTHY** *(after flat out)***:** Oh, she likes that. She hasn't been past thirty since the funeral. Now let's see you stop her.

**[P1-11] DOROTHY** *(after braking)***:** Brake in a straight line, before the corner, never in it. My husband never learned. We got through four hedges and a bandstand.

**[P1-12] DOROTHY** *(after reversing)***:** Good. That gets you out of any dead end in any century. And most family gatherings.

**[P1-13] DOROTHY** *(after a handbrake skid)***:** Ha! Space lets the back go. Use it to slide round corners without stopping. I'm told it isn't in the Highway Code.

**[P1-14] DOROTHY** *(after a handbrake turn)***:** That's how you lose a grey van in a narrow street. Right: you can drive. Better than he could, and I'll deny I said so.

**[P1-15] DOROTHY** *(as you set off)***:** You'll do. Now: {HALL}, and don't spare her.

*A grey van is pulling away from {HALL} with the family file.*

**[P1-16] DOROTHY** *(shouted, mid-chase)***:** Don't be gentle with it, dear. It's a hire van. Let him lose the deposit.

**[P1-17] DOROTHY:** One birth certificate: {HERO_FULL}, born {HERO'S BIRTH DATE} in {HERO'S BIRTHPLACE}. That's proof number one. It proves you exist, which is a start.

**[P1-17a] DOROTHY:** Now we go backwards, one generation at a time, faster than he can rub them out.

## Scene 3. Spare Parts

**[P2-01] DOROTHY:** Before the Heirloom can travel in time she needs three things. A valve, from {WORKS}. A clock spring, from {MARKET}. And a bottle of proper register ink, from {HALL}.

**[P2-01a] DOROTHY:** Until she has all three, the time dial stays locked. And Hargreaves will have heard we're shopping, so expect company.

**[P2-02] DOROTHY:** The ink costs money, and so will every ticket after it. So while you are at {MARKET}, earn some: {PUB} wants two crates fetched.

**[P2-02a] DOROTHY:** After today, look for the £ signs in any town in any year. There is always somebody who needs something shifted. It's the one constant of history.

**[P2-03] DOROTHY** *(the valve has come apart in the works yard)***:** The valve's in bits and the bits have rolled. Drive over each piece and it's yours. The white dots on the little map show where they've got to.

**[P2-04] DOROTHY** *(a grey van is racing you to the market)***:** That grey van is after the same spring. Beat it there, dear. Cut corners. Use the handbrake. Forget what I said about hedges.

**[P2-05] DOROTHY** *(carrying bottles)***:** Stop on the yellow ring to load, and on the next to unload. Those are bottles: three knocks and they're broken. Drive as if I were holding a full cup of tea. I am.

**[P2-06] DOROTHY** *(a man in grey runs off with the ink)***:** He's on foot, and he's quick. Get out and run after him, or catch him with the car if he's daft enough to stay on the road. I'd chase him myself, but, well. Hip.

**[P2-07] DOROTHY:** Valve. Spring. Ink. Hold the lamp, dear. No, higher. There. Hear that ticking?

**[P2-07a] DOROTHY:** The time dial is working. From now on you can set a year and drive there. I have waited forty years to say that to somebody.

*Banner: TIME TRAVEL UNLOCKED.*

## Scene 4. Relative Speed (the first jump)

**[P3-01] DOROTHY:** Your {REL} {ANCESTOR}, the {JOB}. {TOWN}, {YEAR}. That's the first page Hargreaves will go for.

**[P3-02] DOROTHY:** Get yourself to {TOWN} first: tickets at {HUB}. Then set the dial with T, find a long straight road and keep your foot down until the dial reaches the year.
> *If the first chapter is in the home town, the first sentence is dropped. If it is abroad: "You'll need to get to {COUNTRY} first: tickets at {HUB}."*

**[P3-02a] DOROTHY:** Don't lift off. She hates it when you lift off. She sulks, and a sulking time machine is nobody's friend.

*The tyres catch fire. White light. The year on screen counts back.*

**[P3-03] NOTE:** {TOWN}, {YEAR}. {ERA ARRIVAL LINE}

The era arrival lines. **⟳ rotates:** they appear on every arrival in a new era, and two chapters can share an era, so
each era has three.

- **[P3-04] Present day:**
  - **ALT 1:** Traffic, takeaways and a phone signal.
  - **ALT 2:** Roadworks, a queue for coffee, and a parking warden already taking an interest.
  - **ALT 3:** Home. Everything costs more than you remember, and you only left this morning.
- **[P3-05] Post-war (1950–):**
  - **ALT 1:** Coal smoke, corner shops and somebody's wireless through an open window.
  - **ALT 2:** Washing on every line, a football against every wall, and one car on the whole street. Yours.
  - **ALT 3:** Doorsteps scrubbed white and net curtains twitching. The Heirloom has been noticed.
- **[P3-06] Early 1900s (1900–1949):**
  - **ALT 1:** Trams, flat caps and motor cars that still frighten the horses.
  - **ALT 2:** A brass band somewhere, a tram bell, and a policeman who has never seen a car this colour.
  - **ALT 3:** Hats. Everybody has a hat. You feel underdressed from the neck up.
- **[P3-07] Victorian (1837–1899):**
  - **ALT 1:** Gas lamps, horse muck and a hundred chimneys.
  - **ALT 2:** Soot on everything, a hymn from somewhere, and a small boy offering to mind your engine for a penny.
  - **ALT 3:** Fog, clogs on cobbles, and a smell you decide not to identify.
- **[P3-08] Georgian (1714–1836):**
  - **ALT 1:** Mud to the axles, a coach horn somewhere, and not one pavement.
  - **ALT 2:** A pig in the road. It has right of way and it knows it.
  - **ALT 3:** Wigs on the gentry, mud on everybody else, and a coachman staring hard at your wheels.
- **[P3-09] Stuart and before:**
  - **ALT 1:** Thatch, woodsmoke and a church bell. The road is mostly a suggestion.
  - **ALT 2:** Geese, mud and a great deal of sky. Somebody crosses themselves as you go by.
  - **ALT 3:** No lamps, no signs, and no glass in half the windows. A dog barks at the Heirloom, then thinks better of it.

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

*Because the act repeats, every line in it that used to repeat is now a pack of ALTs, marked **⟳ rotates**. Deal them
without repeating (see "What changed", point 1).*

## Scene A. The chapter opens (cut scene)

*Night, the {YEAR} branch office of Hargreaves & Lowe. Caption: "{TOWN}, {YEAR}".*

**[A-01] NOTE** *(first chapter only)***:** {TOWN}, {YEAR}. Hargreaves & Lowe have an office here too. They have one in every century. The carpet is always the same.

**[A-02] NOTE ⟳ rotates** *(every later chapter)*, one of:
- **ALT 1:** {TOWN}, {YEAR}. Another century, the same grey door.
- **ALT 2:** {TOWN}, {YEAR}. The brass plate is newer here. The grey is exactly the same.
- **ALT 3:** {TOWN}, {YEAR}. A different roof, a different street, and Mr Lowe's same worried face at the window.
- **ALT 4:** {TOWN}, {YEAR}. You can always find the office. It's the one building in town nobody has ever looked at twice.
- **ALT 5:** {TOWN}, {YEAR}. The clerks change with the centuries. The filing does not.
- **ALT 6:** {TOWN}, {YEAR}. Somewhere in this town is a grey room with a lamp burning late. There always is.

*Then three lines between Silas and Lowe, which depend on the chapter's **scheme**. Each chapter gets a different
scheme; there are seven, listed below. Silas's first line opens with a lead-in (A-02a) and goes on with that scheme's
A-S1.*

**[A-02a] SILAS ⟳ rotates** *(the lead-in to A-S1)*, one of:
- **ALT 1:** {ANCESTOR_FULL}. {PROOF}.
- **ALT 2:** Next on the list: {ANCESTOR_FULL}. And the page that props {HIM} up: {PROOF}.
- **ALT 3:** {PROOF}. One page, and {ANCESTOR_FULL} hangs from it by a thread.
- **ALT 4:** The name is {ANCESTOR_FULL}. The record is {PROOF}. Write it down, while there is still something to write.
- **ALT 5:** {ANCESTOR_FULL}, {JOB}. Nobody of the slightest importance, and yet here {HE} is in ink. {PROOF}.
- **ALT 6:** Tonight's page: {PROOF}. Tonight's inconvenience: {ANCESTOR_FULL}.
- **ALT 7:** {ANCESTOR_FULL}. Yet another one. They breed like footnotes. {PROOF}.

| Scheme | **[A-S1] SILAS** *(grinning)* | **[A-S2] LOWE** *(worried)* | **[A-S3] SILAS** *(determined)* |
|---|---|---|---|
| **The false alarm** | A false alarm, Mr Lowe. Shout "fire" and {ANCESTOR} runs, and an empty house has no witnesses. | Should I bring an actual fire, sir? For authenticity? | Bring a loud voice. While {HE}'s away, the page goes. |
| **The bought clerk** | Every man has his price, Mr Lowe. The parish clerk's is a sovereign and a new hat. | A hat, sir? Shall I get a receipt for the hat? | No receipts. He'll cut the page out with his own penknife. Nobody suspects the clerk. |
| **The lift** | No book, no page, no ink. We simply take {ANCESTOR} for a little drive. | A drive, sir? Where to? I only ask because of the mileage. | Somewhere nobody thinks to write anything down. Out of the record, out of the world. |
| **The scattered letters** | Letters, Mr Lowe. People keep letters. Letters prove who is whose. | So we burn them, sir? I've brought matches. I've also brought a bucket, in case. | Burning is for amateurs. We scatter them. Nobody believes a letter found in the gutter. |
| **The rumour** | Why erase a life when you can simply end it on paper? A word in the right ear, Mr Lowe. | That {ANCESTOR} is dead, sir? Should we send flowers? It seems only polite. | Send them. It adds conviction. Dead and buried by teatime, and nobody looks for a dead {MAN/WOMAN}'s birth. |
| **The forger** | My forger has made a lovely copy of the register, Mr Lowe. Every page exactly the same. | Every page, sir? Even the blots? | Even the blots. Every page but one. According to the new book, {ANCESTOR} was never born. |
| **The siege** | If the archivist's driver wants the page so badly, Mr Lowe, we shall take the house. | The whole house, sir? We've only the one form for that. | Every {VAN} we have, round every door. Nothing leaves without our say. |

*Caption: "Meanwhile: {ANCESTOR_FULL}". The ancestor at home, busy with the event the chapter is about. They have no
idea who you are yet. Their line depends on the event, and ends with the quiz clue (see A-Q below). **⟳ rotates:**
an event can come up in more than one chapter, so each has two.*

| Event | **[A-E] THE ANCESTOR** |
|---|---|
| A wedding | **ALT 1:** Saturday I'm to be wed to {SPOUSE}. The banns are read, and the parson's book is waiting for the both of us.<br>**ALT 2:** Three days till I marry {SPOUSE}, and my mother has already cried on everything I own. All that's left is two names in the parson's book. |
| A birth | **ALT 1:** Any day now, the midwife says. We have a name picked: {CHILD}. There's a page in the register with a space for it.<br>**ALT 2:** The baby's due, and the whole street has an opinion on the name. It's {CHILD}, and that's final. It only wants writing in the register. |
| A family photograph | **ALT 1:** There's a photographer coming to take the children's likeness. All of them at once, heaven help the man.<br>**ALT 2:** We're to have our likeness taken, the whole family. I've washed every child twice and I am not doing it a third time. |
| A census | **ALT 1:** The enumerator's coming round tonight with his forms. Every soul under this roof, written down for the government.<br>**ALT 2:** Census night. Every name in the house goes on the form, and I've told the lodger: one more false name and I'll choose it for him. |
| Emigrating | **ALT 1:** Everything we own is in two trunks. Our names are on the passenger list, and we sail with the tide. *(After 1950: "and we fly in the morning.")*<br>**ALT 2:** A whole life packed, and the house echoing. My name's on the passenger list now, so it's too late to be sensible. |
| A burial | **ALT 1:** We bury {THE DEAD} this week. Whatever else happens, it'll be written in the book proper.<br>**ALT 2:** The funeral's this week. {THE DEAD} always said to make no fuss, so naturally the whole town is coming. It'll go in the book, done right. |
| Military service | **ALT 1:** I've taken the {KING'S/QUEEN'S} shilling. They'll write my name in the muster roll, and then I belong to the army.<br>**ALT 2:** I've signed up. The sergeant said I'd see the world, and so far I've seen a field and a shouting man. Still, my name goes on the muster roll. |
| A baptism | **ALT 1:** The christening's on Sunday. Our little one, in the parish book at last.<br>**ALT 2:** There's a christening Sunday, and the parson has promised to keep it short. He promised that last time. It goes in the parish book, that's the main thing. |
| (none of these) | **ALT 1:** There's a gentleman in grey been round asking after the parish book. Says he's from the solicitors. I didn't like his face.<br>**ALT 2:** A grey sort of man knocked this morning, asking who my people were. I said they were none of his business. He wrote that down. |

**The quiz clue.** *Each chapter's family quiz asks one question, and the answer is dropped into conversation first.
The ancestor says it here; Dorothy repeats it in her note (B-01). **⟳ rotates:** two of each, because a question can
come round again.*

| Question asked later | **[A-Q] THE ANCESTOR** (said here) | **[B-Q] DOROTHY** (in her note) |
|---|---|---|
| What was my mother's name before she wed? | **ALT 1:** My mother was a {MAIDEN NAME} before she wed, and she never let my father forget it.<br>**ALT 2:** Stubborn? I'm half {MAIDEN NAME}, on my mother's side. We don't call it stubborn. We call it being right. | **ALT 1:** {HIS} mother was a {MAIDEN NAME} before she married. {HE}'s prouder of that side than {HE} lets on.<br>**ALT 2:** The mother's maiden name was {MAIDEN NAME}. It's in the register and, by all accounts, in {HIS} temper. |
| What is my father's Christian name? | **ALT 1:** My father, {FATHER}, always said a good name is worth more than a full purse.<br>**ALT 2:** My father {FATHER} had a saying for everything. Most of them were wrong, but he said them with great confidence. | **ALT 1:** {HIS} father was {FATHER}, and {HE} quotes him at every turn.<br>**ALT 2:** Father: {FATHER}. Remember it. {HE} certainly does. |
| Who did I marry? | **ALT 1:** {SPOUSE} will want {HIS/HER} tea, and I've not set foot in the kitchen.<br>**ALT 2:** If {SPOUSE} asks, I was home an hour ago. That's marriage for you: a long argument about what time it is. | **ALT 1:** {HE}'s married to {SPOUSE}, who is by all accounts the brains of the outfit.<br>**ALT 2:** Married to {SPOUSE}. Happily, or near enough for the register. |
| Who am I walking out with? | **ALT 1:** I'm walking out with {SPOUSE}, if you must know, and the whole street does know.<br>**ALT 2:** {SPOUSE} is calling for me Sunday. I haven't told a soul, so I expect the town crier has it by now. | **ALT 1:** {HE}'s walking out with {SPOUSE}. It's meant to be a secret, so everybody has heard.<br>**ALT 2:** {HE}'s courting {SPOUSE}. It isn't in any register yet, but the neighbours keep better records than I do. |
| What year was I born? | **ALT 1:** Born in {BIRTH YEAR}, I was, and my mother said it was the longest night of her life.<br>**ALT 2:** I've been on this earth since {BIRTH YEAR}, and tired since about a week after. | **ALT 1:** Born in {BIRTH YEAR}, by the register. {HE} may knock a year or two off if asked. Don't be fooled.<br>**ALT 2:** Year of birth: {BIRTH YEAR}. I found the entry myself, and it took a wet Thursday. |
| What do I do for my living? | **ALT 1:** A {JOB} gets no days off, whatever the solicitors are doing.<br>**ALT 2:** I've been a {JOB} since I was old enough to be shouted at. It's honest work, which is why it pays so badly. | **ALT 1:** {HE} works as a {JOB}, and will tell you so at length.<br>**ALT 2:** Occupation: {JOB}. A good one, too. I've looked for complaints and found hardly any. |
| Where was I born? | **ALT 1:** I was born in {BIRTHPLACE}, and they'll carry me out of {BIRTHPLACE} when the time comes.<br>**ALT 2:** {BIRTHPLACE} born and {BIRTHPLACE} bred. I went somewhere else once. I didn't care for it. | **ALT 1:** {HE} was born here in {BIRTHPLACE} and has never left it for long.<br>**ALT 2:** Born in {BIRTHPLACE}. {HE} thinks the rest of the world is a rumour. |

*The phone box (or a note pinned up, before phones).*

**[A-03] DOROTHY ⟳ rotates**, one of:
- **ALT 1:** That's the page he's after, {HERO}: {PROOF}. And this time it's {SCHEME NAME}. Get to your {REL} before his men do.
- **ALT 2:** {PROOF}, dear. That's the page he wants, and his plan this time is {SCHEME NAME}. Your {REL} hasn't the faintest idea. Go and be the faintest idea.
- **ALT 3:** I've found his next target: {PROOF}. I'd file this one under {SCHEME NAME}. Find your {REL}, quickly, before somebody greyer does.
- **ALT 4:** He's after {PROOF} now, and the trick is {SCHEME NAME}. Nasty little man. Your {REL} needs you, {HERO}, though {HE} doesn't know it yet.
- **ALT 5:** Now then. The page is {PROOF}. The plan is {SCHEME NAME}. The person is your {REL}, and you want to get there first.
- **ALT 6:** It's {PROOF} this time, and it's {SCHEME NAME}. Honestly, the effort he goes to. Off you go, dear: your {REL} is expecting nobody, so do knock.

## Scene B. The meeting

**[B-01] DOROTHY'S NOTE ⟳ rotates** *(shown as the mission starts; it can be read again from the case file)***:**
*(where the note is found, below)* "{ANCESTOR_FULL}, your {REL}, {JOB}. {SCHEME NOTE} {KNOWS NOTE} *(a lead-in from B-01a)* {B-Q CLUE}"

*Where the note is found, one of:*
- **ALT 1:** A note in Dorothy's hand, pinned where you would see it:
- **ALT 2:** A note taped to the steering wheel, in Dorothy's small square writing:
- **ALT 3:** On the dashboard, a page torn from an archive request form. Dorothy has written on the back:
- **ALT 4:** Tucked behind the sun visor, a note that smells faintly of register ink:
- **ALT 5:** A note on the passenger seat, held down with a boiled sweet:
- **ALT 6:** Folded into the door pocket, a note with a tea ring on it:
- **ALT 7:** Clipped to the brass dial with a clothes peg, a note in pencil:
- **ALT 8:** In the glove box, on the back of an old parking ticket, in Dorothy's hand:

**[B-01a] ⟳ rotates** *(the words that introduce the quiz clue; also used in the Finale)*, one of:
- **ALT 1:** Something to remember:
- **ALT 2:** Keep this in your head:
- **ALT 3:** One fact for your pocket:
- **ALT 4:** You will be asked, so learn this:
- **ALT 5:** Don't forget, whatever else you forget:
- **ALT 6:** Worth knowing before you knock:
- **ALT 7:** And a word to the wise:

*The {SCHEME NOTE}, one per scheme:*

| Scheme | **[B-S] Dorothy's note** | How it plays |
|---|---|---|
| The false alarm | Hargreaves's people have been at the house with a story about a fire at {PLACE 2}, and {ANCESTOR} has gone running. Try the house first, then {PLACE 2}, then {PLACE 3}. There is no fire. There is never a fire. There is only ever Silas. | Search three places |
| The bought clerk | Hargreaves has bought the parish clerk. The minute {HALL} is empty he means to cut {ANCESTOR}'s entry out with a penknife. Get there first, and if he runs, run faster. He's a clerk. It shouldn't be hard. | Drive there against the clock, catch the clerk on foot, take the page home |
| The lift | An hour ago a {VAN} stopped beside {ANCESTOR} and offered {HIM} a lift. Nobody has seen {HIM} since. Find that {VAN} and stop it. I don't mind how. I'd rather not know how. | Chase the van, then drive the ancestor home gently |
| The scattered letters | Hargreaves's men broke into {ANCESTOR}'s house in the night and threw every family letter out of the window. Gather them up: one of them will say where {HE} has gone. Don't read the love letters. Well. Skim. | Pick up six letters, then go where the last one says |
| The rumour | Hargreaves has put it about that {ANCESTOR} died last week. By tonight somebody will write it down, and then it's true. Get round {PUB}, {MARKET} and {CHURCH} and tell everybody otherwise. Then find {ANCESTOR}, who I imagine is livid. | Race round three stops, then find them |
| The forger | Hargreaves has had the register copied out with {ANCESTOR} left out of it, and his forger is in town to swap the books. He's just left {HALL} with a parcel. Follow him and he'll lead you to the real one. Don't let him see you. Think inconspicuous thoughts. | Tail the forger, then catch him |
| The siege | The {VAN}s have been circling {ANCESTOR}'s house since dawn. {HE}'s loading the family's papers onto a {CART} to take to {CHURCH} for safe keeping. Ride alongside and keep them off. You have my permission to be rude. | Guard the cart to the church |

*The {KNOWS NOTE}: the ancestor has either never heard of the hero, or (if the chapter is after the hero's own birth)
already has a child or grandchild with the hero's name.*

**[B-02] ⟳ rotates** *(never heard of you)*, one of:
- **ALT 1:** {HE} has never heard of you.
- **ALT 2:** To {HIM} you are a stranger in odd shoes. Start from there.
- **ALT 3:** {HE} doesn't know you from Adam, and Adam at least dressed for the period.
- **ALT 4:** You are nobody to {HIM} yet. Be a polite nobody.
- **ALT 5:** {HE} won't know your face, your name or your business. Lead with the name.
- **ALT 6:** As far as {HE} is concerned you won't be born for a very long time. Don't bring it up.

**[B-03] ⟳ rotates** *(hero is a child in this year)*, one of:
- **ALT 1:** Mind: {HE} has a {SON/DAUGHTER/GRANDCHILD} called {HERO} already, {AGE}, and as far as {HE} knows that is not you. Do not try to explain.
- **ALT 2:** Careful: there is already a {HERO} in that house, {AGE}, and it's {HIS} {SON/DAUGHTER/GRANDCHILD}. You are a coincidence. Stay a coincidence.
- **ALT 3:** One thing: {HIS} {SON/DAUGHTER/GRANDCHILD} {HERO} is {AGE} this year. If you meet a small child with your face, do not shake hands. I don't know what happens and I don't want to.

**[B-04] ⟳ rotates** *(hero is grown up in this year)*, one of:
- **ALT 1:** Mind: {HE} knows {HERO} perfectly well, and {HERO} is {AGE}. You are a good deal older than that. Say you're a cousin and leave it there.
- **ALT 2:** Awkward: {HE} already knows a {HERO}, {AGE} and living locally. You are the same person with more miles on. Smile and change the subject.
- **ALT 3:** Take care: the {HERO} {HE} knows is {AGE}. You look like that {HERO} after a hard winter. Don't explain, dear. I explained once, and a man fainted.

*Said during the meeting:*

**[B-05] THE ANCESTOR** *(the lift: being driven home)***:** I've been carried off once today already. Go steady in this one, and warn me before you turn.

*The false-alarm search misses (one per place you try):*

**[B-06]** Nobody in. A neighbour says a man in grey shouted "Fire!" and {ANCESTOR} ran off towards {PLACE 2}. "He didn't run himself, I noticed," she adds.
**[B-07]** No fire here, no smoke, and no {ANCESTOR}. "Try {PLACE 3}," says somebody, without looking up from a pie.
**[B-08]** No sign of {HIM}. "Went by with a bucket," says a child. "Towards {PLACE 2}. I'd have gone too, but I'm not allowed."

*You find them. They are wary. Their opening line depends on whether they know a {HERO} already. Then comes their
suspicion, which depends on the scheme, and then the challenge (B-11a).*

**[B-09] THE ANCESTOR ⟳ rotates** *(never heard of you)*, one of:
- **ALT 1:** Family, you say. {SUSPICION}
- **ALT 2:** Kin of mine? You? {SUSPICION}
- **ALT 3:** A relation. I see. I've a great many relations and I've met them all. {SUSPICION}
- **ALT 4:** One of us, are you? You don't dress like one of us. {SUSPICION}
- **ALT 5:** Family is what they all say when they want something. {SUSPICION}
- **ALT 6:** You'll forgive me if I don't ask you in just yet. {SUSPICION}

**[B-10] THE ANCESTOR ⟳ rotates** *(hero is a child here)*, one of:
- **ALT 1:** {HERO}? My {HERO} is {AGE}, and {asleep indoors / out playing in the street / supposed to be at school}. You've a look of {HIM}, I'll give you that. {SUSPICION}
- **ALT 2:** {HERO}, is it? I've a {HERO} of my own, {AGE}, and {asleep indoors / out playing in the street / supposed to be at school}. Same name, same nose. That's a lot of coincidence for one doorstep. {SUSPICION}
- **ALT 3:** That's my little {HERO}'s name, and my little {HERO} is {AGE} and {asleep indoors / out playing in the street / supposed to be at school}. You're the spit of the child, only taller and worse dressed. {SUSPICION}

**[B-11] THE ANCESTOR ⟳ rotates** *(hero is grown here)*, one of:
- **ALT 1:** You've the very look of my {HERO}, only {HE} is {AGE} and you are not. A cousin, is it? {SUSPICION}
- **ALT 2:** Well, you're not my {HERO}, because my {HERO} is {AGE} and owes me money. But you've the same face. A cousin? {SUSPICION}
- **ALT 3:** For a moment I took you for our {HERO}. But our {HERO} is {AGE}, and stands up straighter. Some sort of cousin, I suppose. {SUSPICION}

| Scheme | **[B-W] {SUSPICION}** (always followed by a challenge from B-11a) |
|---|---|
| The false alarm | Some joker in grey sent me running across town for a fire that never was. I took a bucket. I'll not be made a fool of twice in one day. |
| The bought clerk | The parish clerk, of all people. Thirty years I've known that man, and he'd sell my name for a sovereign and a hat. It wasn't even a good hat. |
| The lift | A nice man offered me a lift, and the next thing I know I'm halfway to nowhere in the back of a box. That's the last time I'm civil to a stranger. |
| The scattered letters | They had every letter I own out of the drawer and into the street. My mother's hand, my sweetheart's. Half the road has read things I'd not have told my own pillow. |
| The rumour | Half the town's been round with flowers. Apparently I'm dead. I've never felt better, and somebody has already asked about my boots. |
| The forger | A man swapped our parish book for one with my name missing. I watched him do it and thought he was the verger. I held the door for him. |
| The siege | Grey {VAN}s round my door since first light, and now a stranger who drives like a lunatic. Thank you for that, by the way. It doesn't mean I trust you. |

**[B-11a] THE ANCESTOR ⟳ rotates** *(the challenge, straight after the suspicion)*, one of:
- **ALT 1:** Tell me something only family would know.
- **ALT 2:** So prove it. Something no stranger could tell me.
- **ALT 3:** If you're kin, you'll know a thing or two about us. Let's hear one.
- **ALT 4:** One question, then. Get it right and I'll listen.
- **ALT 5:** Blood knows blood. Answer me this.
- **ALT 6:** I'll ask you what I'd ask any long-lost cousin who turned up at dinner time.
- **ALT 7:** Go on, then. Convince me.

*The quiz: one of the questions in the A-Q table, with four answers to pick from.*

**[B-12] THE ANCESTOR ⟳ rotates** *(right first time)*, one of:
- **ALT 1:** Right first time. Nobody but family would know that.
- **ALT 2:** Well, I'll be. Straight off, and without counting on your fingers.
- **ALT 3:** Correct. And you didn't even look at the ceiling first.
- **ALT 4:** Now how would a stranger know that? They wouldn't. Go on, then, you're in.
- **ALT 5:** That's it exactly. You've either the blood or a very good spy.
- **ALT 6:** Quick as that! You know us better than some who come to dinner every Sunday.
- **ALT 7:** Yes. That's the truth of it, and there's not many living could say so.

**[B-13] THE ANCESTOR ⟳ rotates** *(right after a wrong guess)*, one of:
- **ALT 1:** There. Now you sound like one of us.
- **ALT 2:** Got there in the end. That's the family way: wrong first, then loud about being right.
- **ALT 3:** That's the one. I was starting to wonder about you.
- **ALT 4:** Better. We'll say no more about the other answers.
- **ALT 5:** There it is. Slow, but sound. We've a few like that.
- **ALT 6:** Right at last. My patience isn't what it was, and it was never much.
- **ALT 7:** Finally. You may be family after all. None of us listens the first time.

**[B-14] THE ANCESTOR ⟳ rotates** *(wrong; this can be heard several times in one meeting, so it has the biggest pack)*, one of:
- **ALT 1:** No. Any stranger off the road would say that. Think on, and try again.
- **ALT 2:** Wrong. And you said it with such confidence, too.
- **ALT 3:** No. Not even close, and I was being generous with the question.
- **ALT 4:** That's not it. Family would know. Have another go before I shut this door.
- **ALT 5:** Ha! No. Whoever told you that was having you on.
- **ALT 6:** Guessing, are you? I can always tell. You've gone pink.
- **ALT 7:** No, and I'll thank you not to guess at my family as if it were a raffle.
- **ALT 8:** Not that. I've all day, mind. You're the one who looks in a hurry.

**[B-15] THE ANCESTOR ⟳ rotates** *(never heard of you)*, one of:
- **ALT 1:** Then you're one of ours, though I can't think how. Come home with me. You look half starved and wholly lost.
- **ALT 2:** Kin, then. Don't ask me which branch. Come in and eat something before you fall over.
- **ALT 3:** So you are family. That explains the nose. You'd best come back with me, there's a pot on.
- **ALT 4:** Well, I can't leave a relation standing in the road. Come along. You can explain yourself over supper, or not at all.
- **ALT 5:** One of us, then, from some far corner of the family that nobody mentions. Come home. We'll find you a chair.
- **ALT 6:** That settles it. You're ours, and we look after our own, even the peculiar ones. This way.

**[B-16] THE ANCESTOR ⟳ rotates** *(knows a {HERO})*, one of:
- **ALT 1:** Then you're family, right enough, though I can't work out where you fit. You've even the name of my {SON/DAUGHTER/GRANDCHILD}. Come back with me and we'll puzzle it out.
- **ALT 2:** Family, then. Two of you called {HERO}: you and my {SON/DAUGHTER/GRANDCHILD}. We never did have much imagination with names. Come on, there's supper.
- **ALT 3:** So you're one of ours, and you share a name with my {SON/DAUGHTER/GRANDCHILD}. I shall call you the Other {HERO}, to save confusion. Come and be fed.

## Scene C. A day's work

*The ancestor gives you a job at their own trade (thirteen trades, two jobs each; their asks are listed in
Appendix 2). Every job opens with C-00, then the ask, and ends with C-01.*

**[C-00] THE ANCESTOR ⟳ rotates** *(the opener, before the ask)*, one of:
- **ALT 1:** I'm a {JOB}, and it's no life for the idle.
- **ALT 2:** You've caught me at work. A {JOB} is always at work.
- **ALT 3:** Since you're family, you can be useful. I'm a {JOB}, and I'm a pair of hands short.
- **ALT 4:** Being a {JOB} looks easy from where you're standing. Everything does, from standing.
- **ALT 5:** Nobody ever got rich as a {JOB}, but nobody ever got bored either.
- **ALT 6:** My father said a {JOB} never starves. He said nothing about ever sitting down.
- **ALT 7:** You want to know your family? Then know the work. I'm a {JOB}.
- **ALT 8:** There's no such thing as a guest in this house. I'm a {JOB}, and today so are you.

**[C-01] THE ANCESTOR ⟳ rotates** *(the job is done)*, one of:
- **ALT 1:** Not bad. Not bad at all, for somebody who talks like you do. Here, you've earned it.
- **ALT 2:** Well, nothing's broken and nobody's dead. I've paid for worse. Here.
- **ALT 3:** You've done a day's work in half a day. Don't tell anybody, or they'll all want you. Take this.
- **ALT 4:** I'd not have believed it of somebody with hands that soft. There's your money.
- **ALT 5:** That'll do. That is high praise in this family, by the way. Here's what you're owed.
- **ALT 6:** You work like one of us: no fuss, no thanks, and done before dark. Go on, take it.
- **ALT 7:** Fair's fair, and you did the job. Count it if you like. I would.
- **ALT 8:** I've had hired hands twenty years who never shifted like that. Mind, they had no contraption. Your pay.

*If the job is short, something goes wrong at the end and the ancestor shouts one of these. **⟳ rotates:** two of each.*

**[C-02]** *(a pickpocket takes the day's pay)*
- **ALT 1:** My pay! He's had my pay! Don't just sit there!
- **ALT 2:** Stop him! That's a week's wages running off on somebody else's legs!

**[C-03]** *(a {VAN} rams the load on purpose)*
- **ALT 1:** That was no accident. Go on, give it some of its own back.
- **ALT 2:** He did that on purpose! Well? You've wheels of your own. Use them.

**[C-04]** *(a rival is after tomorrow's work)*
- **ALT 1:** See that fellow? He wants my trade. Get there before him and put my name down.
- **ALT 2:** That weasel is after tomorrow's work. Beat him to it, and don't be polite about it.

**[C-05]** *(the load falls off)*
- **ALT 1:** You've left half of it in the road. Back you go.
- **ALT 2:** Well, that's the load all over the lane. It won't pick itself up. I've waited to see.

**[C-06]** *(the law takes an interest)*
- **ALT 1:** Now you've done it. Don't stop, and don't give them my name.
- **ALT 2:** That's {LAW} looking this way. Drive on. If anybody asks, we've never met, which is very nearly true.

## Scene D. The big mission

*Built on a real event from the ancestor's life. One of these nine, whichever this ancestor has that the story has
used least. The ancestor asks (D-x-01), people shout along the way, and Dorothy sums up at the end (D-x-done).
**⟳ rotates:** the same kind of event can come up in two chapters, so every ask and every "done" line has two
versions.*

### D-W. Get Me to the Church (a wedding)

**[D-W-01] THE ANCESTOR** *(a woman, the bride)*
- **ALT 1:** It's my wedding morning and {GROOM} has not come. Somebody's had the wheels off every {RIDE} in the street, and the parson won't wait past the bells.
- **ALT 2:** I've been in this frock since dawn and there's no sign of {GROOM}. Every {RIDE} for a mile has been got at, and the bells are about to start.

**[D-W-01a] THE ANCESTOR**
- **ALT 1:** He'll be at {PUB}, sick with nerves. Fetch him to church or there's no wedding, and then where will you be?
- **ALT 2:** Try {PUB} first. He'll be staring into a glass, working up to it. Bring him to the church, and tell him I said so.

**[D-W-02] THE ANCESTOR** *(a man, the groom)*
- **ALT 1:** It's my wedding morning and I'm stranded. There isn't a {RIDE} in the road with a wheel left on it, and the parson is a stickler for time.
- **ALT 2:** I'm to be married within the hour, and some grey villain has wrecked every {RIDE} we had. I've a clean collar, a speech, and no way of getting there.

**[D-W-02a] THE ANCESTOR**
- **ALT 1:** Get me to that church. If I'm not wed today then there's no us, and by the look on your face there's no you.
- **ALT 2:** You've a vehicle, of sorts. Take me to church. And if you see me reaching for the door on the way, speed up.

*Searching for the groom (bride's version):*
**[D-W-03]** "He was in here an hour since, white as his shirt. Ordered a drink and forgot to drink it. Try {WORKS}."
**[D-W-04]** "Came and went. Said he needed air. There's plenty of that at {MARKET}."
**[D-W-05]** "The bridegroom? Went off towards {WORKS} with a face like a wet week, practising saying 'I will'."

*Searching for the best man (groom's version):*
**[D-W-06]** "The best man? He was showing everybody the ring. Dropped it twice. Try {MARKET}."
**[D-W-07]** "He was here. He's gone to {WORKS} to borrow a collar stud. He'd already borrowed the collar."
**[D-W-08]** "You've just missed him. {MARKET}, most like, writing his speech on his cuff."

**[D-W-09] THE GROOM** *(in the car)*
- **ALT 1:** I've changed my mind. No. No, I haven't. Faster!
- **ALT 2:** Does it go any quicker? No, slower. No. Quicker. Sorry. It's my first wedding.

**[D-W-10] THE BRIDE** *(driven to the wedding breakfast)*
- **ALT 1:** Mind my frock. And mind him, he's gone the colour of the cake.
- **ALT 2:** Married! Drive carefully. I've only had him ten minutes.

**[D-W-done] DOROTHY**
- **ALT 1:** {GROOM} and {BRIDE}, married. It's in the book and the ink's dry.
- **ALT 2:** {GROOM} and {BRIDE}: wed, witnessed and written down. I do love a wedding I'm not catering.

### D-B. Special Delivery (the birth of the child you descend from)

**[D-B-01] THE ANCESTOR**
- **ALT 1:** The baby's coming and the midwife's not: some grey devil has {let her tyres down / lamed her pony}. Fetch her from {INFIRMARY}, and drive like the child's life hangs on it. Yours might, come to think.
- **ALT 2:** It's the baby, it's now, and the midwife is stranded: some grey devil has {let her tyres down / lamed her pony}. She'll be at {INFIRMARY}. Go like the wind, and don't come back without her.

**[D-B-02]** "The midwife? Out on a call. Twins, {CHURCH} way. It's always twins when you're in a hurry."
**[D-B-03]** "You've missed her. She went to {MARKET} for carbolic. She gets through a deal of carbolic."
**[D-B-04]** "She's been and gone, and told me off on her way out. Try {CHURCH}."

**[D-B-05] THE MIDWIFE**
- **ALT 1:** I've delivered half this town and I'll not be late for this one. Whatever this thing is, make it go.
- **ALT 2:** I've been to births by cart, by boat and once carried on a door. This is new. Go on, then, and mind the bumps.

**[D-B-done] DOROTHY**
- **ALT 1:** {CHILD_FULL}, born safe and written down. One more link that holds.
- **ALT 2:** A baby: {CHILD_FULL}. Loud, healthy and entered in the register. That's another one he can't have.
> *If the baby is the hero:* "{CHILD_FULL}, safely born and safely in the register. That one is you, by the way. You were very red."

### D-E. The Last Boat / Final Call (emigrating; "Final Call" after 1950)

**[D-E-01] THE ANCESTOR**
- **ALT 1:** The {BOAT} {sails on the tide / leaves within the hour} for {COUNTRY}, and every {carter / taxi} in town has been paid by some grey gentleman to be busy. Get the trunks to {HUB}, then come back for me.
- **ALT 2:** I've a ticket for {COUNTRY} and no way to {HUB}: every {carter / taxi} for miles is suddenly spoken for. The {BOAT} {sails on the tide / leaves within the hour}. Trunks first, then me. I'm lighter, but I matter more.

**[D-E-02] THE ANCESTOR** *(loading the trunks)*
- **ALT 1:** Don't look back at the house. It's bad luck to look back.
- **ALT 2:** Careful with that one. It's my whole life, and also the good teapot.

**[D-E-03] THE ANCESTOR** *(halfway to the quay)*
- **ALT 1:** The tickets! I left the tickets at the post office!
- **ALT 2:** Stop! The tickets! They're on the post office counter, where I put them so I shouldn't forget them!

**[D-E-done] DOROTHY**
- **ALT 1:** {ANCESTOR_FULL}, on the passenger list in black and white. Wherever {HE} went, {HE} went on the record.
- **ALT 2:** {ANCESTOR_FULL}: name, age and luggage, all on the passenger list. Gone abroad, and nobody can say otherwise.

### D-K. The King's Shilling (military service)

**[D-K-01] THE ANCESTOR**
- **ALT 1:** I'm to report, and the muster roll's gone missing with my name on it. No roll, no record, and a soldier with no record never served.
- **ALT 2:** The muster roll has vanished, and my name with it. The army won't feed anybody who isn't on a list. I've asked.

**[D-K-01a] THE ANCESTOR**
- **ALT 1:** Run these dispatches round, and then get me to {HUB} before the column moves off.
- **ALT 2:** Take these dispatches round for the sergeant, then get me to {HUB} before they march. I'd rather not chase a column on foot.

**[D-K-done] DOROTHY**
- **ALT 1:** {ANCESTOR_FULL}, on the muster roll. Served, counted and remembered.
- **ALT 2:** {ANCESTOR_FULL}: present on parade and present in the roll. The army loses a great many things, but not that page. Not today.

### D-C. Count Me In (a census)

**[D-C-01] THE ANCESTOR**
- **ALT 1:** The census man's been round in tears. A grey {carriage / van} knocked him flat and took his schedules. If this street isn't counted tonight, we were never here. Do his round for him and get the book back.
- **ALT 2:** They've robbed the census man. A grey {carriage / van} had him over and made off with every form. He's sat on my step with a cup of something. You'll have to count the street yourself, and fetch his book back.

**[D-C-02] THE ANCESTOR** *(as you set off)*
- **ALT 1:** Knock loud. Half of them will think you're the rent man and hide.
- **ALT 2:** Count everybody. Even him at the end house, though he'll shout through the door that he's out.

**[D-C-03]** "The lodger? He scarpered when he heard the census was coming. He's not fond of being written down. Try {FARM}."
**[D-C-04]** "Slept in the barn and went at first light, with one of my hens under his coat. {MARKET}, maybe."
**[D-C-05]** "Him? Owes me for a week. If you find him at {FARM}, count him twice."

**[D-C-done] DOROTHY**
- **ALT 1:** {ANCESTOR_FULL}, {JOB}, counted at {TOWN}. Present and correct.
- **ALT 2:** The whole street counted, and there in the middle: {ANCESTOR_FULL}, {JOB}, of {TOWN}. I do like a tidy column.

### D-P. Watch the Birdie (a family photograph)

**[D-P-01] THE ANCESTOR**
- **ALT 1:** There's a photographer come to {HUB}, and we've saved a twelvemonth for one likeness of us all. The minute they were washed the children scattered: {CHILDREN'S NAMES}.
- **ALT 2:** We're to be photographed today, all of us, and I had every child clean for a full minute. Then I turned my back. {CHILDREN'S NAMES}: gone.

**[D-P-01a] THE ANCESTOR**
- **ALT 1:** Find every one, then fetch the man himself before he loses the light. A grey fellow's been offering him double to go home.
- **ALT 2:** Round them up, then bring the photographer from {HUB}. Some grey article has been paying him to pack up early.

**[D-P-02]** "The photographer? Gone to wet his whistle at {PUB}. Says it steadies the hand."
**[D-P-03]** "He was here. Went to {MARKET} to buy a new cloth for his head. The old one had a moth, and the moth was in three pictures."
**[D-P-04]** "The picture man? He asked where a body could get a drink. I said {PUB}. He ran."

**[D-P-05] THE PHOTOGRAPHER**
- **ALT 1:** Nobody is to smile. It takes eight seconds and smiling is a strain.
- **ALT 2:** Stand still. Stiller. If the baby moves it comes out as a ghost, and I charge extra for ghosts.

**[D-P-done] DOROTHY**
- **ALT 1:** One photograph: {CHILDREN'S NAMES}, and their parents trying not to blink. Nobody can rub out a photograph.
- **ALT 2:** Got it. {CHILDREN'S NAMES}, all facing the same way for the only time in their lives. Let him try unpicking that.

### D-S. Set in Stone (burying a parent, husband or wife)

**[D-S-01] THE ANCESTOR**
- **ALT 1:** We bury my {father / mother / husband / wife} today. {THE DEAD}. The mason has the stone cut and paid for, and a man in grey has been at him to leave the name off it.
- **ALT 2:** It's the funeral today. {THE DEAD}, my {father / mother / husband / wife}. There's a headstone waiting at {WORKS}, and a grey stranger hanging about it with a purse and a chisel.

**[D-S-01a] THE ANCESTOR**
- **ALT 1:** Fetch the stone from {WORKS} to the churchyard, and go gently. It is the last thing we shall ever give {HIM/HER}.
- **ALT 2:** Bring the stone to the churchyard for me. Slowly, please. {THE DEAD} was never hurried in life, and won't thank you for it now.

**[D-S-done] DOROTHY**
- **ALT 1:** {THE DEAD}, laid to rest and named in stone. They cannot rub out granite.
- **ALT 2:** {THE DEAD}: buried with a name, a date and a good stone over the top. He'll need more than bleach for that.

### D-H. Wet the Baby's Head (the ancestor's own baptism)

**[D-H-01] THE ANCESTOR**
- **ALT 1:** Parson says the register fell open in the night and the wind took the pages. In a shut vestry. With the door locked. The page with my name on is out there somewhere, and I'd like to go on having been christened.
- **ALT 2:** The baptism pages have blown clean out of the church, parson says. Blown. Through a bolted door. Mine's among them, and without it I'm a heathen on paper. Help me gather them in.

**[D-H-02]** "Parson's out visiting the sick. {INFIRMARY}. He'll be a while. He takes his sermons with him."
**[D-H-03]** "He's been and gone. Up at {FARM}, I heard, having words with a goat that ate a hymn book."
**[D-H-04]** "Parson? Went by at a trot, holding his hat on. {INFIRMARY}, I'd say."

**[D-H-done] DOROTHY**
- **ALT 1:** {ANCESTOR_FULL}, baptised {DATE}. Back in the book.
- **ALT 2:** Christened and recorded: {ANCESTOR_FULL}, {DATE}. The page is a little muddy, but so was the baby, I expect.

### D-X. Struck Out (when the file has none of the above)

**[D-X-01] THE ANCESTOR**
- **ALT 1:** That grey lot are at {HALL} this minute with the book open at our page. I saw them through the window. Whatever that contraption of yours does, do it now.
- **ALT 2:** They're in {HALL} right now, the grey ones, with a knife out and the register open. At OUR page. Get that machine of yours moving.

**[D-X-02] THE PARISH CLERK** *(running)*
- **ALT 1:** It's only a name! You've hundreds!
- **ALT 2:** He said nobody would mind! He said nobody would even notice!

**[D-X-done] DOROTHY**
- **ALT 1:** {ANCESTOR_FULL}: the entry stands.
- **ALT 2:** Still there in ink: {ANCESTOR_FULL}. And one parish clerk who will think twice next time.

*After every big mission:*

**[D-99] DOROTHY ⟳ rotates** *(added to the end of every "done" line)*, one of:
- **ALT 1:** Proof {N} of {TOTAL}. Next: {NEXT}.
- **ALT 2:** That's {N} of {TOTAL} in the folder. Now for {NEXT}.
- **ALT 3:** {N} down, out of {TOTAL}. Don't get comfortable: {NEXT}.
- **ALT 4:** Proof number {N}. I've put a ribbon round it. Onwards, dear: {NEXT}.
- **ALT 5:** {N} proven of {TOTAL}, and I've stopped biting my nails. Nearly. Next stop: {NEXT}.
- **ALT 6:** I make that {N} out of {TOTAL}. Have a biscuit, then {NEXT}.
- **ALT 7:** {N} of {TOTAL}, and he'll be spitting feathers. Further back we go: {NEXT}.

## Scene E. The chapter closes (cut scene)

*Night again, Hargreaves & Lowe. Caption: "Hargreaves & Lowe". Each of the three lines stands on its own, so the
three packs can be dealt separately.*

**[E-01] SILAS ⟳ rotates** *(angry)*, one of:
- **ALT 1:** Lodged? LODGED? One page, and they have it in a folder with a ribbon round it.
- **ALT 2:** Again! That ridiculous car, and that ridiculous old woman.
- **ALT 3:** How do they always know where to look? They must be family. They must actually care.
- **ALT 4:** Do you know what it costs to keep a van in four centuries, Mr Lowe? Do you?
- **ALT 5:** Beaten. By an estate car. With WOOD on the sides, Mr Lowe.
- **ALT 6:** I had it in my hand. One page. And then that dreadful mustard colour in the mirror.
- **ALT 7:** Don't say it, Mr Lowe. Don't count. I can see you counting.

**[E-02] LOWE ⟳ rotates** *(worried)*, one of:
- **ALT 1:** That's {N} links of the chain proven, sir. If they reach the top of the tree...
- **ALT 2:** I've done the sum, sir. It's {N} now. I did it twice, hoping for a smaller number.
- **ALT 3:** {N} proven, sir. I've had to start a second page in the losses ledger.
- **ALT 4:** That makes {N}, sir. And the hire company has written again about the vans.
- **ALT 5:** {N}, sir. I don't wish to alarm you. I only wish to be alarmed in company.
- **ALT 6:** They have {N} links now, sir. At this rate they will have a whole family, and we shall have a great deal of grey paint.
- **ALT 7:** {N}, sir. I only mention it because you asked me not to.

**[E-03] SILAS ⟳ rotates** *(determined)*, one of:
- **ALT 1:** They won't reach the top. We go further back. {NEXT}. Before they've even worked out where.
- **ALT 2:** Then we stop being clever and start being early. {NEXT}. Fetch my coat.
- **ALT 3:** Further back, Mr Lowe. The ink is older there, and old ink lifts beautifully. {NEXT}.
- **ALT 4:** One page is nothing. A family is a chain, and I need only one link. {NEXT}.
- **ALT 5:** Let them have it. They cannot be in two centuries at once, and we have an office in every one. {NEXT}.
- **ALT 6:** Stop quivering and wind the Engine. {NEXT}. And tell the men to look less grey. No. More grey.
> *Before the Finale:* "Then we go to the very top. The root. And we take it out."

*The ancestor's doorstep. Caption: "{ANCESTOR_FULL}".*

**[E-04] THE ANCESTOR ⟳ rotates** *(smiling)*, one of:
- **ALT 1:** Mind how you go, {HERO}. Whoever you are, you've the family look about you.
- **ALT 2:** Go careful, {HERO}. And come again, when you can tell me whose you are.
- **ALT 3:** I still don't know where you fit, {HERO}. But there's a chair here for you whenever you want one.
- **ALT 4:** Off you go, then. You drive like a mad thing, {HERO}, but you're our mad thing.
- **ALT 5:** Safe home, {HERO}, wherever that is. I've a feeling it's a long way off.
- **ALT 6:** I'll tell the children about you, {HERO}. They'll not believe a word, but I'll tell them.
- **ALT 7:** Look after yourself, {HERO}. And that machine. I've grown almost fond of the smell.

*Unused spare lines from the opening scene. These played before the schemes were written and will come back if a
chapter has no scheme. They are pairs: the first A-X1 goes with the first A-X2, and so on.*

- **[A-X1] LOWE:** They followed us, sir. That yellow car was seen on the bridge this morning. / The archivist's car again, sir. It's come back through the years after us. / Sir, they're proving them faster than we can rub them out. / The men are tired, sir. And the vans keep getting rammed.
- **[A-X2] SILAS:** Then we shall simply have to be quicker. Tonight. / Let it come. Nobody outruns the Engine twice. / Then take the book before they find the family. Go! / Tired? We are erasing four hundred years, Mr Lowe. Nobody said it was a half-day.

## Family favours (optional jobs, up to two a chapter)

*A brother, sister, child or spouse of the chapter's ancestor asks for a hand. They greet you (V-01), ask (one of the
jobs in Appendix 2, never one you have already been given) and thank you (V-02). `{FAVOUR NAME}` is who is asking,
`{FAVOUR REL}` how they are related to {ANCESTOR} ("brother", "wife"), and `{FAVOUR JOB}` their trade, if the file
has one. These three are the only placeholders not in the first draft; the game already had the values.*

**[V-01] THE RELATIVE ⟳ rotates**, one of:
- **ALT 1:** You're the one {ANCESTOR} has been telling everybody about. I'm {FAVOUR NAME}, {HIS} {FAVOUR REL}, {FAVOUR JOB}. Since you're stopping:
- **ALT 2:** So you're the stranger with the contraption. I'm {FAVOUR NAME}, {ANCESTOR}'s {FAVOUR REL}, {FAVOUR JOB}. {ANCESTOR} says you're handy. Prove it.
- **ALT 3:** {ANCESTOR} says you're family. I'm {FAVOUR NAME}, {HIS} {FAVOUR REL}, {FAVOUR JOB}, and in this family that means work.
- **ALT 4:** I'm {FAVOUR NAME}, {FAVOUR JOB}: {ANCESTOR}'s {FAVOUR REL}. You'll have heard about me. None of it's true. Now, while you're here:
- **ALT 5:** Ah, the famous cousin. {FAVOUR NAME}, {ANCESTOR}'s {FAVOUR REL}, {FAVOUR JOB}. I've a job that wants doing, and you've wheels.
- **ALT 6:** You'll be the one who turned up from nowhere. I'm {FAVOUR NAME}, {ANCESTOR}'s {FAVOUR REL}, {FAVOUR JOB}. Nowhere must be short of work, so:
- **ALT 7:** {FAVOUR NAME}. {HIS} {FAVOUR REL}, {FAVOUR JOB}. {ANCESTOR} never mentioned you, which in this family is a compliment. Could you do a thing for me?
- **ALT 8:** Is that the machine everybody's talking about? I'm {FAVOUR NAME}, {ANCESTOR}'s {FAVOUR REL}, {FAVOUR JOB}. Don't tell me how it works. Tell me if it carries.
- **ALT 9:** I'm {FAVOUR NAME}, {HIS} {FAVOUR REL}, {FAVOUR JOB}. They say you'll help anybody who asks. I'm asking.
- **ALT 10:** You must be the relation nobody can place. {FAVOUR NAME}, {ANCESTOR}'s {FAVOUR REL}, {FAVOUR JOB}. We'll place you later. First:
- **ALT 11:** {ANCESTOR} sent you? No? Well, you're here now. I'm {FAVOUR NAME}, {HIS} {FAVOUR REL}, {FAVOUR JOB}, and I'm in a fix.
- **ALT 12:** Any kin of {ANCESTOR} is kin of mine, I suppose. {FAVOUR NAME}, {HIS} {FAVOUR REL}, {FAVOUR JOB}. Kin help each other, or so I'm always being told.
- **ALT 13:** I'm {FAVOUR NAME}, {FAVOUR JOB}. {ANCESTOR}'s {FAVOUR REL}, for my sins. You look like somebody with time on their hands.
- **ALT 14:** You've the family ears, so I'll not ask who you are. {FAVOUR NAME}, {ANCESTOR}'s {FAVOUR REL}, {FAVOUR JOB}. I will ask a favour.

**[V-02] THE RELATIVE ⟳ rotates** *(the favour is done)*, one of:
- **ALT 1:** That's a kindness I'll not forget. Mind, I couldn't tell you what you are to me. Something with a deal of greats in it, I'd say.
- **ALT 2:** Well, that's done, and done well. Whatever branch you fell off, it's a good one.
- **ALT 3:** I'm obliged to you. If you're ever back this way, there's a seat at our table. You'll have to fight for it, mind.
- **ALT 4:** You've a useful pair of hands. That'll be our side of the family coming out.
- **ALT 5:** Thank you. I'll tell {ANCESTOR} you're all right. {HE}'ll say {HE} knew it first.
- **ALT 6:** Done already? I shall have to think of something harder next time. Go on, with my thanks.
- **ALT 7:** There. I knew {ANCESTOR} kept good company. Don't tell {HIM} I said so.
- **ALT 8:** You've saved me a day and a sore back. I'd offer you a bed, but there are six in it as it is.
- **ALT 9:** Much obliged. I still say that machine's unnatural. Handy, though.
- **ALT 10:** Well, I never. And not a scratch on anything. You're wasted on whatever it is you do.
- **ALT 11:** That's a weight off. Come by at Christmas. We need somebody the children haven't heard all the stories from.
- **ALT 12:** Good. Now go before somebody else finds you a job. They will, you know. Word gets round.
- **ALT 13:** Bless you. I'd say you take after {ANCESTOR}, but you were quicker about it.
- **ALT 14:** All done? Then you've earned this, and my good opinion, which is the rarer of the two.

## Hargreaves's letters

*Left under the Heirloom's wiper, on grey paper, after the second and fourth chapters.*

**[L-01] LETTER:** Under the wiper, on grey paper, in grey ink: "You are costing me a great deal of money. Kindly stop. S.H. P.S. The van was on hire."

**[L-02] LETTER:** Another grey note: "You have so very many of them. Mothers, grandfathers, aunts by the dozen. You would hardly miss one. I should have noticed one." It is signed S.B., crossed out, with S.H. written beside it.
> *The crossing-out is the answer to the S.B. question: a slip he corrects, and the first hint that Hargreaves is a name he was given, not one he has.*

---

# INTERLUDES

## Grey Area (after the first chapter: tail a van to find his office)

**[I1-01] DOROTHY'S NOTE:** "They came in a {VAN} and they will go home in one. Follow it. Not so close they notice, not so far you lose it. I want to know where Silas keeps his men in {YEAR}."
**[I1-02] DOROTHY** *(shouted, mid-tail)***:** Hang back, dear. You are driving the only mustard-coloured estate car in {YEAR}.
**[I1-03] NOTE:** Through the glass: rows of desks, rows of grey men, and on every desk a parish register and a bottle of something that smells of bleach.
**[I1-03a] NOTE:** The brass plate by the door says HARGREAVES & LOWE. EST. {YEAR − 40}. Underneath, smaller: NO CALLERS. NO RELATIVES.
**[I1-04] DOROTHY'S NOTE:** Dorothy's next note is mostly underlining: "An office. In {YEAR}. He has a branch in every century, the cheek of the man. No wonder he is always ahead of us."
**[I1-04a] DOROTHY'S NOTE:** "We shall have to pay a call on head office. I shall bring a flask."

## The Paper Convoy (halfway: guard the parish registers)

**[I2-01] DOROTHY'S NOTE:** "The parish is sending every old register it has to be rebound: by {CART}, by way of {FARM}, to {HUB}. Three centuries of {TOWN} in one {CART}."
**[I2-01a] DOROTHY'S NOTE:** "I have counted five grey {vans / carriages} in town this morning, and not one of them is delivering anything. See it safe aboard."
**[I2-02] THE CARTER:** I was told this was a quiet job. Books, they said. Who robs books?
**[I2-02a] THE CARTER (new)** *(after the second attack on the cart)***:** I've carried gunpowder with less bother than this.
**[I2-03] DOROTHY:** "Three hundred years of baptisms, safe on the {BOAT}. Somewhere in that {CART} is the first time anybody ever wrote your surname down."
**[I2-03a] DOROTHY:** "He will be furious. I've opened the good biscuits."

## The Golden Door (only if nobody in the tree ever left the country: Ellis Island, 1907)

**[I3-01] DOROTHY'S NOTE:** "He's gone wholesale. Ellis Island, New York, 1907. Twelve million names on those manifests and he means to thin them out. Not your family's, perhaps, but somebody's. Go."
**[I3-02] DOROTHY:** Twelve million strangers who'll never know your name. That's the job, dear. That's all an archive is: minding people you will never meet. Now, back to your own lot.

## The Break-In (before the Finale: raid head office, present day, at night)

**[I4-01] DOROTHY:** He's ahead of us and I want to know how. Hargreaves & Lowe keep an office in town. Very grey. Very shredder.
**[I4-01a] DOROTHY:** Get whatever's left of his ledger, and expect company on the way out. I'd come in with you, but somebody has to mind the flask.
*They throw the ledger out of the windows a page at a time; an office boy runs off with page one; the alarm goes.*
**[I4-02] DOROTHY:** I ought to tell you. He was my apprentice. The brightest I ever had, and the loneliest.
**[I4-02a] DOROTHY:** I showed him my first Engine one Friday, and on the Monday the pair of them were gone. He'd tidied the shed before he went. That's what I couldn't forgive.
**[I4-03] DOROTHY:** Page one, in his own hand: "HARGREAVES, Silas. Foundling. Left at the door of the parish of {ROOT_TOWN}. No name given."
**[I4-03a] DOROTHY:** Oh, I see. He isn't only erasing your family, {HERO}. He's been looking for his own.
**[I4-04] DOROTHY:** And the last entry: {ROOT_FULL}, {ROOT_TOWN}, {ROOT_YEAR}. The very top of your tree. He's going for the root.

---

# ACT THREE: THE FINALE

*The jokes thin out here on purpose. The Finale is where the story turns, and it lands better played straight.*

## The Finale opens (cut scene)

*Dusk at the church. Caption: "{ROOT_TOWN}, {ROOT_YEAR}. Dusk."*

**[F-01] NOTE:** The oldest page in the oldest book. Above {ROOT_FULL}, nothing at all. No father, no mother, no parish of birth. A brick wall.
**[F-02] SILAS** *(determined)***:** Somebody has to be nobody, {ROOT}. Why not you?
**[F-03] SILAS** *(worried; caption "Silas Hargreaves")***:** ...Why not me?
**[F-04] DOROTHY** *(worried)***:** This is the root, {HERO}. If that entry goes, every name under it goes too. Yours. Mine. All of them. Get to {ROOT} before he does.

## Brick Wall (meeting the root ancestor)

**[F-05] DOROTHY'S NOTE:** "{ROOT_FULL}, your {REL}, {JOB}. Try the house first. If {HE} is out, {HE} will be at {PLACE 2}, and failing that {PLACE 3}. Be polite: {HE} is the oldest relative you will ever meet, and has no idea you are coming. *(a lead-in from B-01a)* {QUIZ CLUE}"
*Looking for {ROOT} (one per place you try):*
**[F-05a]** Nobody in. A neighbour thinks {HE} went up to {PLACE 2}. "Walks everywhere, that one. Always has."
**[F-05b]** An old man shakes his head. "You want {PLACE 3}. And a hat, in this weather."
**[F-05c]** Empty. A dog looks at you, then pointedly towards {PLACE 2}.

**[F-06] THE ROOT:** Kin? I have no kin. There's a grey fellow been round all week asking after the parish book, and now there's you. Tell me one true thing about myself, and I'll hear the rest.
**[F-07] THE ROOT:** Then you're mine, sure enough, though how is past my wits. There's nobody behind me in any book, you know. I'm where it starts.

## The Last Page

**[F-08] THE ROOT:** There's a gentleman at the church this hour, grey as a gravestone, turning the parson's book to my page.
**[F-08a] THE ROOT:** He said the queerest thing. He said, "Somebody has to be nobody." What did he mean by it?
**[F-09] DOROTHY'S NOTE** *(in pencil, shaking)***:** "{HERO}. This is it. {ROOT_FULL}, baptised {DATE}, {ROOT_TOWN}. Nobody above {HIM} in any record. Your brick wall."
**[F-09a] DOROTHY'S NOTE:** "Lose that page and the whole family comes down like washing off a line. He has my first Engine. Do not let him turn the page."
*A barricade, the torn register, a clerk in the churchyard, then Engine No. 1. Every few knocks Silas jumps to another
century and drags you with him.*
**[F-10] SILAS** *(shouted, mid-chase)***:** You have thousands of them! I only ever wanted one!
**[F-10a] SILAS (new)** *(shouted, after a later jump)***:** Stop following me! Nobody ever follows me!

*The reveal, played as a cut scene in the churchyard.*

**[F-11] SILAS** *(determined)***:** Go on, then. Read it. Read the page you were so keen to save. Not the entry. The margin.
**[F-12] NOTE:** In the margin beside {ROOT}'s entry, in the parson's cramped hand: "Also a second infant of this house, base-born, put out to the parish this day. No name given." And beneath it, in another hand: "Entered as HARGREAVES, for the overseer who signed for him."
**[F-13] SILAS** *(worried)***:** Another man's name. Nobody thought to give me my own.
**[F-13a] SILAS** *(worried)***:** Four hundred years of your people in every book I open, and my whole family is a gap in a margin. I thought if nobody had a tree, I should not mind so much.
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

**[X-04] DOROTHY:** Every link proven, {HERO}, from you to {ROOT_FULL}. And one more name for the chart than we started with.
**[X-04a] DOROTHY:** Drive us to {HALL}, both of us. Slowly. My hip, and his nerves.
**[X-05] NOTE:** The pedigree of {HERO_FULL} is lodged and stamped. {ESTATE} is released to its rightful heirs.
**[X-05a] NOTE:** That is you, and one newly discovered cousin, many times removed, who cries all over the paperwork.
**[X-05b] NOTE (new):** Mr Lowe, at last report, is still filling in the mileage claim. It covers four hundred years, and he has run out of form.
**[X-06] SILAS:** I have a great-great-aunt. Several, apparently. I should like to meet them. Might I borrow the car?
**[X-07] DOROTHY:** You may not. But {HERO} might drive you. The Heirloom is yours now, dear: every town, every year, anyone in your tree.
**[X-07a] DOROTHY:** Go and say hello. They've been waiting long enough.

*Banner: CASE CLOSED.*

---

# AFTER THE END

## Silas in the back seat

*After the story, Silas rides along. Every third relative you meet, he says one of these. **⟳ rotates:** there are
twelve now, not six, so the pack lasts thirty-six relatives before it comes round.*

- **[Z-01]** Is that one of ours? I mean yours. I mean ours.
- **[Z-02]** She has my chin. Do you see it? That is my chin.
- **[Z-03]** I had no idea there were so many. Do they all come at Christmas?
- **[Z-04]** I should like to write that one down. In ink. I have given up pencil.
- **[Z-05]** Nobody ever told me families were so loud.
- **[Z-06]** May we stop? I think that gentleman is my great-great-great-uncle and I have nothing to give him.
- **[Z-06a] (new)** That one looked straight at me. Do I wave? What is the done thing?
- **[Z-06b] (new)** I have been practising the word "cousin". Cousin. It still sounds like somebody else's.
- **[Z-06c] (new)** Does everybody have this many grandmothers, or have I been oversupplied?
- **[Z-06d] (new)** I have started a list of birthdays. It is already longer than my client list ever was.
- **[Z-06e] (new)** If anybody asks, what am I to them? Twelfth cousin? Thirteenth? I should like to get the paperwork right.
- **[Z-06f] (new)** Mr Lowe sends his regards. He has taken up bee-keeping. He says the bees worry him less.

**[Z-07] DOROTHY ⟳ rotates** *(at her workbench, once the story is done)*, one of:
- **ALT 1:** Nothing left to prove, dear. Go and visit them. Take your time; you've got all of it.
- **ALT 2:** Still here, dear. Still retired. The kettle's on, if you've a century to spare.
- **ALT 3:** No more grey vans and no more deadlines. Only four hundred years of relatives who'd love a visit. Do take a cake.

## The Foundling File

*One page of Silas's own record is hidden in each era the story visits. Found in this order:*

- **[Y-01]** Parish of {ROOT_TOWN}. Left at the vestry door on a Tuesday: one male infant, about a week old, in a basket. No note. No name.
- **[Y-02]** Entered by the overseers as SILAS, for the saint's day, and HARGREAVES, for the overseer who signed for him.
- **[Y-03]** Apprenticed at nine to a law stationer. Absconded. Returned. Absconded. "The boy reads parish registers as other boys read adventure stories."
- **[Y-04]** A letter, never posted: "To any person of the name of". The name after it has been rubbed out so often the paper has gone through.
- **[Y-05]** A family tree in a child's hand. There is one name on it, his own, drawn very carefully, with room left all round.
- **[Y-06]** A reference in Dorothy's writing: "Quick, exact, and never once late. He asked who the Engines were for. I said, people with somebody to go back to. I have regretted it since."

## Somebody's Son (the last mission, once every page is found)

**[Y-07] DOROTHY:** You found all of it. I never could. A Tuesday, the vestry door, {ROOT_TOWN}, {ROOT_YEAR}: the very year you stood there with {ROOT}.
**[Y-07a] DOROTHY:** He was a week old and forty yards off the whole time.
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

# APPENDIX 1: Where the repeats went

Every line that used to be heard more than once, and how many versions it has now. A full story is six chapters and
the Finale at most, so seven is enough for anything heard once a chapter.

| ID | What it is | Heard | Versions |
|---|---|---|---|
| P3-04 to P3-09 | Era arrival lines | Each arrival in a new era | 3 per era |
| A-02 | Narrator at the grey door | Every chapter after the first | 6 |
| A-02a | Silas's lead-in | Every chapter | 7 |
| A-E | The ancestor at home | Every chapter, by event | 2 per event |
| A-Q / B-Q | The quiz clue, twice over | Every chapter, by question | 2 per question, each |
| A-03 | Dorothy names the page and the scheme | Every chapter | 6 |
| B-01 / B-01a | The frame of Dorothy's note | Every chapter, and the Finale | 8 / 7 |
| V-01, V-02 | Family favours: the greeting and the thanks | Every favour, up to fourteen | 14 / 14 |
| B-02, B-03, B-04 | "Never heard of you" and its two cousins | Every meeting | 6 / 3 / 3 |
| B-09, B-10, B-11 | The ancestor's wary opening | Every meeting | 6 / 3 / 3 |
| B-11a | The challenge | Every meeting | 7 |
| B-12, B-13, B-14 | The quiz replies | Every meeting; B-14 several times | 7 / 7 / 8 |
| B-15, B-16 | "Come home with me" | After every meeting | 6 / 3 |
| C-00 | The day's-work opener | Every chapter | 8 |
| C-01 | The day's-work payoff | Every chapter | 8 |
| C-02 to C-06 | The job goes wrong | Some chapters | 2 each |
| D-x-01, D-x-done and the bit parts | The big mission's ask and Dorothy's verdict | Every chapter, by event | 2 each |
| D-99 | The running total | After every big mission | 7 |
| E-01, E-02, E-03 | Silas fumes, Lowe counts, Silas names the next | Every chapter's close | 7 / 7 / 6 |
| E-04 | The ancestor's farewell | Every chapter's close | 7 |
| Z-01 to Z-06f | Silas in the back seat | Every third relative, after the story | 12 |
| Z-07 | Dorothy at her workbench | Each visit, after the story | 3 |

The search lines (B-06 to B-08, and the three under each big mission) were never exact repeats of themselves, but six
of them were some form of "Not here. Try the next place." Each is now its own small joke.

# APPENDIX 2: The day's work, by trade

*The ancestor's ask for each job, said straight after the C-00 opener. Each is heard at most once, so there are no
ALTs here.*

| Trade | Job | **The ancestor asks** |
|---|---|---|
| Miner, labourer | Three Loads | Three loads from {WORKS} down to {HUB} before the hooter goes. Every one that's late is a day's pay docked, and I've none to spare. That contraption of yours looks strong enough, if ugly. |
| | Runaway Tubs | A string of tubs has broken loose from {WORKS} and gone rattling off down the town. Six of them, loaded. Catch every one before something catches them, and the gaffer need never know. |
| Weaver, tailor | Cut From the Same Cloth | Two pieces of finished cloth to go to the draper in {MARKET}. Finished, mind. One splash of muck and it comes out of my wages, so drive it like it was a christening gown. |
| | The Knocker-Up | Half the street is still abed and the gates shut on the stroke. Anybody locked out loses the day. Go round and rattle every window, then be at {WORKS} before they close. They'll curse you. Take it as thanks. |
| Farmer | Gone Astray | Somebody in a grey coat left the gate open and every beast I own is out on the lane. Round them up, then take the cart to {MARKET} before the dealers go home. The brown one bites. |
| | Market Day | Two churns for {MARKET}, and they'll not keep in this heat. Mind the ruts, mind the dog, and mind you get a fair price. If it's butter when you get there, you went too fast. |
| Servant, cook | Below Stairs | The mistress wants the whole list fetched before she rings for tea, and she rings early when she's vexed. I can't be in four places at once. Can you? |
| | The Mistress Is Out | The mistress is to be driven to church and the coachman's nowhere. A grey stranger stood him a drink, and then several more. She notices every bump, mind. Every one. |
| Fisherman, docker | Fresh Today | Two boxes off the boat and they want to be in {MARKET} while they still smell of the sea and not of Friday. Go on, shift. |
| | Pots and Lines | The pots came adrift on the tide and they're strewn the length of the quay road. Fetch them in before somebody else does. Anything still inside them is supper. |
| Railwayman, postman | The Round | Bags for {POST}, {HALL}, the school and {PUB}, and the timetable waits for nobody. I'll ride along and shout if you're late. I'll shout if you're early, too. It's expected. |
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
