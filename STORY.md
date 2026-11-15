# Ancestry: A Battle in Time

*The story mode of Ancestry. A top-down driving story, in the spirit of the mid-90s city crime games,
played through the towns and the years of your own family tree.*

The plot below is the same for every family. Everything in **{braces}** is filled in from the GEDCOM file
you load: the people, where they lived, when, what they did for a living, who they married and what
happened to them. `js/storyplot.js` does the filling in; `tests/story.test.mjs` checks that every person
in a file can be the hero.

## The pitch

A crooked heir hunter is rubbing your ancestors out of the parish registers, one generation at a time, so
that an unclaimed family estate falls to him. The only thing fast enough to catch him is a clapped-out
estate car that runs on register ink and turns back the years when you put your foot down.

You have one family tree, one car and all of history to drive it in.

## The cast

| Who | |
|---|---|
| **You** | **{the person you choose on the menu}**. You start outside your own front door in **{your home town}**, in the present day, with £40. |
| **Dorothy Pickering** | County Archivist, retired. Built a time machine into her late husband's estate car because she was "a very bored archivist". Bad hip, so you drive. Rings phone boxes; in years without phones she leaves notes pinned up for you. Keeps a workbench in every century. |
| **The Heirloom** | The car. Mustard yellow (until you respray it), wood trim, a brass dial on the roof. Faster than anything in any century it visits. |
| **Silas Hargreaves** | Of Hargreaves & Lowe, Probate Genealogists. Grey suit, grey van, grey everything. Was Dorothy's apprentice, "the brightest I ever had, and the loneliest", until he vanished with her first Engine. Writes you letters on grey paper. |
| **The men in grey** | Hargreaves's men. They drive grey vans (grey carriages before 1900) with a pink stripe. They hunt you during missions, attack convoys, and between jobs can be caught rubbing street names off the map. |
| **Your ancestors** | Up to seven get a chapter each: the best-documented line from your parents back to the earliest person on it, plus up to two "detours" for people off that line who were born abroad, emigrated or served. They speak in the dialect of where they were born. |
| **Their families** | Brothers, sisters, children, husbands and wives of each chapter's ancestor offer optional **family favours** at their own trades. |
| **Everybody else** | The streets of each town are walked by the real people in your file who lived there in that year. Walk up and they are added to your album; talk to them and they tell you their life *so far*, and no further. |

## The story

### Prologue: Final Notice (present day, {home town})

A solicitor's letter arrives. The dormant estate of **{a great-grandparent on your best-documented line}**
will pass to "our client" unless a proven line of descent is lodged by the end of the month. It is signed
*S. Hargreaves*.

The phone box on the corner rings. It is Dorothy. Hargreaves does not find heirs, she says, he removes them: names
are going out of the registers "like chalk off a slate", and yours is next. She sends you to her lock-up
behind **{the pub}**, hands you the Heirloom, and you race the men in grey to the Records Office. They get
there first. Before Dorothy lets you take the car anywhere, she gives you **a driving lesson** round the streets,
one move at a time, each checked from what the car actually does: flat out, brake to a stop, reverse, a handbrake
skid (Space, or BRAKE on a phone) and a handbrake turn to face back the way you came. Then **you ram their van
until it drops the {surname} file**, and inside is proof number one: **your own birth certificate {date, place}**.

Dorothy's plan: go back one generation at a time and secure one document for each link in the chain, faster
than Hargreaves can erase them. But the Heirloom's time engine is dead, and the **time dial is locked** until it has
three parts. *Spare Parts* sends you round town for them, and each one teaches a different job: the valve has
come apart in the works yard (**pick up** the four pieces), a grey van is **racing** you to the last clock spring
at the market, the ink money is earned carrying two crates of bottles to the pub **without a bump**, and a man
in grey runs off with the register ink and has to be **caught on foot**. Press T at any time to see which parts are still missing. Take all three back to Dorothy
and the dial lights up: **time travel unlocked**. Then you make the first jump (*Relative Speed*): set the
dial, find a straight road, and do not lift off.

### Cut scenes

The opening (Hargreaves and Lowe plotting at night, Dorothy listening in the lock-up) sets the style for the
rest: black bars, a caption, and big faces showing what each speaker thinks. A scene plays at:

- **the end of the Prologue**: the first jump, and Dorothy delighted the car works;
- **the start of every chapter**, the moment you arrive in its town and year: Hargreaves and Lowe in that
  century's office, naming the very record they mean to erase; then **{the ancestor}** at home, busy with the
  event the chapter is about (a wedding on Saturday, a baby any day, the enumerator tonight, two trunks packed);
  then Dorothy setting you on;
- **the end of every chapter**: Hargreaves furious that the record is lodged, Lowe counting the links proven,
  Hargreaves naming the next ancestor he will go for, and **{the ancestor}** seeing you off;
- **the start of the Finale** (the root of the tree, at dusk), **its reveal** in the churchyard, and **the start
  of the Epilogue**.

Each plays once; Esc (or tapping through) skips it.

### A chapter for each ancestor ({town}, {year})

Each chapter is set where and when a real event in that person's life happened.

1. **Meeting {name}.** Hargreaves never tries the same trick twice. Every chapter gets one of seven schemes, all
   different, and the way you find your ancestor depends on it (no two chapters in a row play the same way, and
   the meeting never plays like that chapter's day's work):

   | His scheme | How the meeting plays |
   |---|---|
   | *The false alarm*: a man in grey shouts "fire" and {name} runs off | **search** the places they might be |
   | *The bought clerk*: the parish clerk is paid to cut the page out | beat him to the Records Office **against the clock**, **catch** him on foot, take the page home |
   | *The lift*: {name} accepted a lift in a grey van | **chase** the van down, then drive {name} home **gently** |
   | *The scattered letters*: the family's letters thrown into the street | **pick up** the letters, then go where the last one says |
   | *The rumour*: everybody has been told {name} is dead | **rounds** of the pub, market and church to put it right |
   | *The forger*: a copy of the register with {name} left out | **tail** the forger to the church, then **catch** him |
   | *The siege*: grey vans round the house since dawn | **defend** {name}'s cart of family papers to the church |

   The scheme is in Dorothy's note, in Hargreaves's own words in the chapter's opening scene, and in what {name}
   says when you arrive. Then, to prove you are family, you must answer something only family would
   know: **{their mother's maiden name / who they married / the year they were born / their trade / where
   they were born}**, with wrong answers taken from elsewhere in your tree. The finale's meeting is always a
   search.
2. **A day's work** at their real trade. Each trade has two different jobs, so a family of weavers does
   not do the same thing twice. A job that is over in one act gets a second, never the same kind as the job
   or the meeting: a pickpocket with the day's pay (**catch**), a grey van that rammed the load (**chase**), a
   rival after tomorrow's work (**race him**), the tailboard coming down (**pick up** the load) or the law
   taking an interest (**lose them**).

   | Their occupation | First time | Second time |
   |---|---|---|
   | miner, quarryman, ironworker, potter, labourer | *Three Loads*: haul against the hooter | *Runaway Tubs* |
   | weaver, spinner, tailor, dressmaker | *Cut From the Same Cloth*: not one bump | *The Knocker-Up* |
   | farmer, farm labourer, shepherd | *Gone Astray*: round up the animals | *Market Day* |
   | servant, cook, laundress | *Below Stairs*: the whole list before tea | *The Mistress Is Out* |
   | fisherman, sailor, docker | *Fresh Today*: the catch before it turns | *Pots and Lines* |
   | railwayman, postman, carter, coachman | *The Round*: every drop on the timetable | *The Night Mail*: defend the mail |
   | grocer, baker, publican, shopkeeper | *Orders Out*: five doors before dinner | *Five-Finger Discount*: catch the thief on foot |
   | smith, joiner, mason, electrician, engineer | *Made to Last*: a week's work in one piece | *Tools of the Trade* |
   | nurse, midwife, doctor | *On Call*: quick but smooth | *The Rounds* |
   | teacher, clergy | *Truants* | *The Treat* |
   | soldier, sailor RN, constable | *Dispatches* | *Absent Without Leave*: catch the deserter |
   | clerk, solicitor, anything with a desk | *In Triplicate* | *Due Process*: tail the grey gentleman |
   | gentleman, landowner | *Driving the Quality* | *Leaving Cards* |

3. **The proof.** The chapter's big mission is built on a real event, in the year and the place it
   happened, and runs to three or four acts. The game picks whichever kind this person has that the story
   has used least. Fail an act and you try again from that act, not from the beginning.

   | What the file has | The mission, act by act | The proof you win |
   |---|---|---|
   | a marriage | *Get Me to the Church*: find **{the groom}**, who has lost his nerve somewhere in town (or the best man, who has the ring). Race him to the church against a grey carriage coming from the other side. Chase down the van that snatches the register. Drive the happy couple to the wedding breakfast without a bump. | Marriage of **{groom}** and **{bride}**, **{date, place}** |
   | the birth of the child you descend from | *Special Delivery*: find the midwife, who is out on her rounds. Rush her to the house round an man in grey roadblock. Gather the scattered birth register while they hunt you. Beat Hargreaves's clerk back to the register office. | Birth of **{child}**, **{date, place}** |
   | three or more children | *Watch the Birdie*: round up **{each child, by name}**. Find the photographer (try the pub). Bring him and his camera back in one piece. Rescue the glass plate. | Photograph of the **{surname}** family, **{year}** |
   | an emigration, or a birth in one country and a family in another | *The Last Boat* (*Final Call* after 1950): both trunks to the quay, and mind they stay on. Then **{the traveller}**, who remembers halfway there that the tickets are at the post office. Then the gangway, past a roadblock. Then the van with the passenger list. | Passage of **{name}**, bound for **{country}** |
   | a parent, husband or wife buried in their lifetime | *Set in Stone*: carry the headstone gently, see the funeral safe to the church, then catch the man in grey who has come with a chisel. | Burial of **{name}**, **{date, place}** |
   | a census or residence entry | *Count Me In*: the enumerator's round before midnight. One lodger is dodging the count: find where he has gone to ground and run him down. Then get the schedules back. | Census entry, **{year, place}** |
   | military service | *The King's Shilling*: the dispatches, then **{name}** to the transport ahead of a rival, then the clerk striking names off the muster roll. | Service record |
   | a baptism | *Wet the Baby's Head*: gather the pages, find the parson (he is visiting the sick), race him to the church, stop the van. | Baptism of **{name}**, **{date, place}** |
   | none of these | *Struck Out*: through a roadblock to the hall, run down the clerk, stop the van, lose the law, put the book back. | Parish entry |

4. **Family favours** (optional). Up to two of the ancestor's **{brothers, sisters, children, husband or
   wife}**, alive and grown in that year, stand outside their own doors with a green question mark and a
   job at their own trade.

Getting to each chapter is part of the game. If it is in another town you buy a ticket at the airport (a
steamer or a sailing packet in earlier years) and watch the journey on a map; then you set the dial and
drive.

### Grey Area ({first chapter's town and year})

After the first proof, a note from Dorothy: follow one of the grey vans home. "Not so close they notice, not so
far you lose it." You tail it round the town to a brass plate reading **BLANK & VOID. EST. {40 years
earlier}**. He has a branch office in every century. No wonder he is always ahead.

### The Paper Convoy ({a middle chapter's town and year})

Half way back, the parish sends every old register it has to be rebound, by **{wagon, lorry or van}**,
by way of the farm to the quay. Dorothy has counted five grey vans in town. You ride shotgun: every man in grey that
reaches the convoy rams it, and it can only take so much.

### Hargreaves's letters

Under the wiper, on grey paper, in grey ink. First: *"You are costing me a great deal of rubber. Kindly
stop."* Later: *"You have so very many of them. Mothers, grandfathers, aunts by the dozen. You would hardly
miss one. I should have noticed one."*

### Interlude: The Golden Door (New York, 1907)

*Only if nobody in your file ever left the home country.* Hargreaves has "gone wholesale": Ellis Island, twelve
million names on the manifests. You collect the manifest pages blowing along the waterfront and stop the
van on its way to the incinerator.

### Interlude: The Break-In (present day, {home town}, at night)

You visit head office, uninvited. They throw the ledger out of the windows a page at a time; you grab the
pages and lose the police.

Dorothy confesses that Silas was her apprentice. And page one of the ledger, in his own hand: *"BLANK, Silas.
Foundling. Left at the door of the parish of **{the town of your earliest known ancestor}**. No name
given."* He is not only erasing your family. He has been looking for his own. The last entry is **{your
earliest known ancestor}**: he is going for the root.

### Finale: The Last Page ({earliest ancestor's town}, {year}, at dusk)

**{The earliest person on your line}** is your brick wall: nobody above them in any record. If their entry
never goes in the book, every name under it goes blank, down to yours. A grey gentleman is at the church,
they tell you, and he said the queerest thing: *"Somebody has to be nobody."*

You race to the church through a barricade, save every page of the torn register with two grey vans on
your tail, run down his clerk in the churchyard, and then go after Engine No. 1. Every few knocks Hargreaves
jumps to another century and drags you with him: the same streets in **{a middle chapter's year}**, then
the present day, then **{your first chapter's year}**, and back to where it started. ("You have thousands of them! I only ever
wanted one!") Beaten, he tells you to read the page you were so keen to save. Not the entry. The margin:

> *"Also a second infant of this house, base-born, put out to the parish this day. No name given."*
> And beneath it, in the workhouse clerk's hand: *"Entered as HARGREAVES, for the overseer who signed for him."*

He was given another man's name because nobody gave him his own. He thought that if nobody had a tree he would not mind so
much.

Dorothy: *"That's not a gap, Silas. That's a sibling. You've spent thirty years trying to erase your own
family."*

### Epilogue: Case Closed (present day, {home town})

You drive Dorothy and Silas to the Records Office, slowly: her hip, his nerves. The pedigree of **{you}** is
lodged with one more name on it than you started with. The estate goes to its rightful heirs: you, and one
newly discovered cousin, many times removed, who cries all over the paperwork.

The Heirloom is yours, with every town and every year unlocked, and Silas in the back seat. Whenever you
meet a relative he has something to say. ("She has my chin. Do you see it? That is my chin.")

### After the end: the Foundling File and *Somebody's Son*

In every era the story visits, one page of Silas's own record is lying somewhere near the church, the
infirmary, the school, the post office, the hall or the farm: the basket at the vestry door, the name the
overseers gave him, the apprenticeship he kept running from, a letter never posted, a family tree with one
name on it, and a reference in Dorothy's writing. After the raid on Hargreaves & Lowe they show on the map in pink.

Find them all and finish the case, and Dorothy has one more job. The file says where and when: a Tuesday, the
vestry door, **{earliest ancestor's town}**, **{year}**. *"We have a machine that goes to Tuesdays. He
won't ask. So I'm asking for him."* You collect Silas (he has brought sandwiches), take him back, ask
round the town after a girl with a basket, and drive him up to the church. Slowly. He only wants to see.

## How it plays

**Getting about**
- **On foot and at the wheel.** Walk anywhere; get into the Heirloom or borrow anything parked or passing
  (the owner will have something to say). Before 1900 that means carts, carriages, wagons and hansom cabs.
- **Tickets.** The airport (a quay before 1950) sells tickets to every town the story has opened; the
  journey is drawn on a map. The Heirloom travels as freight.
- **The handbrake.** Space lets the back of the car go: hold it into a corner and slide round, leaving
  skid marks. Quick cars slide a long way; vans and buses hardly at all. Every kind of vehicle has its own
  engine note and changes gear.
- **Crashes.** A glancing touch slides along the wall. A head-on one takes four fifths of your speed,
  throws the car back and spins it. Anything going fast enough goes straight through a tree, which comes
  down ("TIMBER!") and costs a third of your speed.
- **Sound.** Crashes, pick-ups, sirens, a tyre squeal, an engine voice for every kind of vehicle, and a
  blip for every word anybody says, pitched to who is talking. Two original eight-bit tunes: a jaunty one
  for getting about and a driving one in the minor when a clock is running or somebody is after you; the
  instruments and pace change with the year. Music and sound effects each have a switch in the pause menu.
- **Time-jump fire.** The tyres catch as the dial winds up, and you land in the new year with two lines
  of fire on the road behind you.
- **The time dial.** Locked until *Spare Parts* is done. Then: pick a year, hold the Heirloom at full speed until the dial fills, and arrive on the
  same street in a different century. Ink is charged by the year.

**Missions**
- Thirteen kinds of task: the driving lesson, drive there, talk (and be quizzed), **search** the places somebody might be, carry
  loads or passengers (sometimes without a bump), collect things, race round stops, chase and ram a van,
  **tail** a van unseen, **defend** a convoy, **catch** a runner on foot, travel, and lose the police.
- Twists on top: a **rival** racing you to the same door from the far side of town, **roadblocks** of
  grey vans, **clocks** lying in the road worth five seconds each, loads that **fall off** if you hit
  something hard, and passengers who change their minds about where they are going.
- People speak up while you work. After the first chapter, **men in grey hunt you** whenever a clock is
  running: each ram costs three seconds, and they can be rammed off the road for cash.
- **Checkpoints.** Fail and you can try again on the spot, from the act you failed.
- **Medals.** Bronze, silver or gold for how briskly you did it, with a cash bonus. Any finished mission
  can be replayed from the case file in the pause menu, which also keeps a completion percentage and can
  make every timer generous.

**Side jobs**
- **Family favours**, the **£ odd-jobs board** and **cab fares**, as before.
- **Smash-Up.** After the first chapter there is a pink marker in the road outside the Hargreaves & Lowe
  office in every town. Drive over it: sixty seconds, every man in grey you ram off the road is £20, and they
  ram back.
- **The Heirloom Cup.** Stop on the chequered flag by the lock-up for a timed lap of the town, in any
  year. Your best lap is kept for each town and year.
- **The Foundling File** (above).

**Money**
- Story missions, family favours, the £ odd-jobs board in every market place, **cab fares** (get into any
  taxi or hansom and you are for hire, with a bonus for every fare in a row), lost photographs, reunion
  bonuses and badges.
- **Dorothy's workbench** at the lock-up (a motor shed or tithe barn in earlier years): a tuned engine (the
  Heirloom starts out a little slow and earns its speed: fully tuned, it is the quickest thing in any century), a brass
  ram bar, an ink economiser, a quick-wind dial, proper tyres, luggage straps, Dorothy's stopwatch (every
  timer runs a little long), a klaxon that clears the road, a police-band wireless, a respray that also
  loses the police, and a flask of tea.

**The world**
- **Drawn like a picture book.** Ink outlines, flat bright colours, windows that light up at night, smoke
  from the chimneys, striped awnings over the shops and cloud shadows drifting across the roofs.
- **The real streets of the real town.** The first time you arrive anywhere, the game looks the town up
  by name and downloads its actual street plan, street names, rivers and parks from OpenStreetMap, then
  draws them in its own style: in Leeds you drive up Briggate and along The Headrow, over Leeds Bridge.
  Each town is fetched once and kept on your device; only the town's name is sent. The free map servers
  can be slow, so the first start offers "play now with made-up streets" while it waits. A switch in the
  pause menu turns the whole thing off. Map data © OpenStreetMap contributors.
- **Or a town drawn from its name.** Offline, or for a place that cannot be found, the town is made up
  the way British market towns grew: a market place, old roads winding out of it in every direction,
  lanes joining them in broken rings, closes off the newer streets, and a river with a bridge wherever a
  road meets it. No grid, and about a kilometre across.
- **Housing that changes with the year**: thatched cottages with cabbage patches, terraces, semis with
  gaps between and blocks of flats, facing every built-up street. Back gardens have washing lines, privies
  and coal bunkers, or sheds, trampolines and paddling pools, depending on when you look.
- **Street furniture by era**: horse troughs, pumps and barrels; then post boxes, benches and telegraph
  poles; then bus stops, bins, bikes and planters.
- **Farmland** of wheat, cabbages, pasture and plough round the edge of town, and woods beyond.
- **Same streets, every year.** A town keeps its street plan in every era: tarmac turns to setts and then
  to mud, slate to thatch, and the outer streets lose their houses to the fields.
- **Street names.** Real towns keep their real names. Made-up towns have a High Street, a Market Street
  and a Church Lane, and the rest take the commonest surnames in your tree (and local forms abroad: *Rue*,
  *Via*, *-straße*).
- **Landmarks by era**: a windmill before 1850, trams along the main street from 1895 to 1958, a war
  memorial after 1920; an airport after 1950 and a quay or coach yard before.
- **Day, night and weather.** A clock runs; at night every lamp, lit window and headlamp cuts its own hole
  in the dark, and before 1810 there are no street lamps at all. It rains (more in Lancashire than in
  Lisbon) and the roads get slippery. Missions set their own hour: the census is at night, the wedding in
  the morning, the finale at dusk.
- **The churchyard.** The graves carry the names of the people in your file buried in that town by that
  year. Walk up to one to pay your respects.
- **Lost photographs**, three in every town and era, with the file's own notes written on the back.
- **Paradoxes.** Run over your own ancestor and history objects.
- **The law.** Police cars after 1900, constables on foot before, once you have earned a star. If they
  box you in you are fined. People on the pavement jump clear of anything short of flat out.
- **Eighteen badges**, and progress saved on your device for each file and each hero.

## Ideas for later

- Travel with the emigrants: finish *The Last Boat* by sailing with them and arriving in the new country.
- Wills, apprenticeships and school records as further kinds of proof.
- Engine No. 1 turning up in free roam to race you between centuries.
- *Seven Ages*: meet one relative as a child, in their prime and in old age, in three different years.
- Music for each era.
