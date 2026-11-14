# Relative Speed

*The story mode of Ancestry 3D. A top-down driving story, in the spirit of the mid-90s city crime games,
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
| **Dot Quill** | County Archivist, retired. Built a time machine into her late husband's estate car because she was "a very bored archivist". Bad hip, so you drive. Rings phone boxes; in years without phones she leaves notes pinned up for you. Keeps a workbench in every century. |
| **The Heirloom** | The car. Mustard yellow (until you respray it), wood trim, a brass dial on the roof. Faster than anything in any century it visits. |
| **Silas Blank** | Of Blank & Void, Probate Genealogists. Grey suit, grey van, grey everything. Was Dot's apprentice, "the brightest I ever had, and the loneliest", until he vanished with her first Engine. Writes you letters on grey paper. |
| **The Erasers** | Blank's men. They drive grey Redaction vans (grey carriages before 1900) with a large pink rubber on the roof. They hunt you during missions, attack convoys, and between jobs can be caught rubbing street names off the map. |
| **Your ancestors** | Up to seven get a chapter each: the best-documented line from your parents back to the earliest person on it, plus up to two "detours" for people off that line who were born abroad, emigrated or served. They speak in the dialect of where they were born. |
| **Their families** | Brothers, sisters, children, husbands and wives of each chapter's ancestor offer optional **family favours** at their own trades. |
| **Everybody else** | The streets of each town are walked by the real people in your file who lived there in that year. Walk up and they are added to your album; talk to them and they tell you their life *so far*, and no further. |

## The story

### Prologue: Final Notice (present day, {home town})

A solicitor's letter arrives. The dormant estate of **{a great-grandparent on your best-documented line}**
will pass to "our client" unless a proven line of descent is lodged by the end of the month. It is signed
*S. Blank*.

The phone box on the corner rings. It is Dot. Blank does not find heirs, she says, he removes them: names
are going out of the registers "like chalk off a slate", and yours is next. She sends you to her lock-up
behind **{the pub}**, hands you the Heirloom, and you race the Erasers to the Records Office. They get
there first. **You ram their van until it drops the {surname} file**, and inside is proof number one:
**your own birth certificate {date, place}**.

Dot's plan: go back one generation at a time and secure one document for each link in the chain, faster
than Blank can erase them. The engine drinks ink and tickets cost money, so first you do an honest
delivery job (*Ink Money*), and then you make the first jump (*Relative Speed*): set the dial, find a
straight road, and do not lift off.

### A chapter for each ancestor ({town}, {year})

Each chapter is set where and when a real event in that person's life happened.

1. **Meeting {name}.** You find your **{relationship}** at home. A grey man has been round asking
   questions and they trust nobody. To prove you are family you must answer something only family would
   know: **{their mother's maiden name / who they married / the year they were born / their trade / where
   they were born}**, with wrong answers taken from elsewhere in your tree.
2. **A day's work** at their real trade. Each trade has two different jobs, so a family of weavers does
   not do the same thing twice.

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
   happened. The game picks whichever kind this person has that the story has used least.

   | What the file has | The mission | The proof you win |
   |---|---|---|
   | a marriage | *Get Me to the Church*: get **{the groom}** to the church before the bells stop, then chase down the carriage that has snatched the register. | Marriage of **{groom}** and **{bride}**, **{date, place}** |
   | the birth of the child you descend from | *Special Delivery*: **{child}** is due and somebody has lamed the midwife's pony. | Birth of **{child}**, **{date, place}** |
   | three or more children | *Watch the Birdie*: the photographer has come and the children have scattered. Round up **{each child, by name}**, fetch the photographer, rescue the glass plate. | Photograph of the **{surname}** family, **{year}** |
   | an emigration, or a birth in one country and a family in another | *The Last Boat* (*Final Call* after 1950): trunks, then the traveller, to the quay or the airport. | Passage of **{name}**, bound for **{country}** |
   | a parent, husband or wife buried in their lifetime | *Set in Stone*: carry the headstone to the churchyard, gently, then catch the Eraser who has come with a chisel. | Burial of **{name}**, **{date, place}** |
   | a census or residence entry | *Count Me In*: do the enumerator's round before midnight and get the book back. | Census entry, **{year, place}** |
   | military service | *The King's Shilling*: run the dispatches and get **{name}** to the transport. | Service record |
   | a baptism | *Wet the Baby's Head*: the register "fell open in the night" in a locked vestry. | Baptism of **{name}**, **{date, place}** |
   | none of these | *Struck Out*: run down the clerk with the page under his coat, then the van. | Parish entry |

4. **Family favours** (optional). Up to two of the ancestor's **{brothers, sisters, children, husband or
   wife}**, alive and grown in that year, stand outside their own doors with a green question mark and a
   job at their own trade.

Getting to each chapter is part of the game. If it is in another town you buy a ticket at the airport (a
steamer or a sailing packet in earlier years) and watch the journey on a map; then you set the dial and
drive.

### Grey Area ({first chapter's town and year})

After the first proof, a note from Dot: follow one of the grey vans home. "Not so close they notice, not so
far you lose it." You tail it round the town to a brass plate reading **BLANK & VOID. EST. {40 years
earlier}**. He has a branch office in every century. No wonder he is always ahead.

### The Paper Convoy ({a middle chapter's town and year})

Half way back, the parish sends every old register it has to be rebound, by **{wagon, lorry or van}**,
by way of the farm to the quay. Dot has counted five grey vans in town. You ride shotgun: every Eraser that
reaches the convoy rams it, and it can only take so much.

### Blank's letters

Under the wiper, on grey paper, in grey ink. First: *"You are costing me a great deal of rubber. Kindly
stop."* Later: *"You have so very many of them. Mothers, grandfathers, aunts by the dozen. You would hardly
miss one. I should have noticed one."*

### Interlude: The Golden Door (New York, 1907)

*Only if nobody in your file ever left the home country.* Blank has "gone wholesale": Ellis Island, twelve
million names on the manifests. You collect the manifest pages blowing along the waterfront and stop the
van on its way to the incinerator.

### Interlude: Blank & Void (present day, {home town}, at night)

You visit head office, uninvited. They throw the ledger out of the windows a page at a time; you grab the
pages and lose the police.

Dot confesses that Silas was her apprentice. And page one of the ledger, in his own hand: *"BLANK, Silas.
Foundling. Left at the door of the parish of **{the town of your earliest known ancestor}**. No name
given."* He is not only erasing your family. He has been looking for his own. The last entry is **{your
earliest known ancestor}**: he is going for the root.

### Finale: The Blank Page ({earliest ancestor's town}, {year}, at dusk)

**{The earliest person on your line}** is your brick wall: nobody above them in any record. If their entry
never goes in the book, every name under it goes blank, down to yours. A grey gentleman is at the church,
they tell you, and he said the queerest thing: *"Somebody has to be nobody."*

You race to the church, save every page of the torn register, run down his clerk in the churchyard, and
stop Engine No. 1 before Blank can escape to another century. ("You have thousands of them! I only ever
wanted one!") Beaten, he tells you to read the page you were so keen to save. Not the entry. The margin:

> *"Also a second infant of this house, base-born, put out to the parish this day. No name given."*
> And beneath it, in the workhouse clerk's hand: *"Entered as BLANK."*

He was named Blank because the line was blank. He thought that if nobody had a tree he would not mind so
much.

Dot: *"That's not a gap, Silas. That's a sibling. You've spent thirty years trying to erase your own
family."*

### Epilogue: Case Closed (present day, {home town})

You drive Dot and Silas to the Records Office, slowly: her hip, his nerves. The pedigree of **{you}** is
lodged with one more name on it than you started with. The estate goes to its rightful heirs: you, and one
newly discovered cousin, many times removed, who cries all over the paperwork.

The Heirloom is yours, with every town and every year unlocked, and Silas in the back seat. Whenever you
meet a relative he has something to say. ("She has my chin. Do you see it? That is my chin.")

## How it plays

**Getting about**
- **On foot and at the wheel.** Walk anywhere; get into the Heirloom or borrow anything parked or passing
  (the owner will have something to say). Before 1900 that means carts, carriages, wagons and hansom cabs.
- **Tickets.** The airport (a quay before 1950) sells tickets to every town the story has opened; the
  journey is drawn on a map. The Heirloom travels as freight.
- **The time dial.** Pick a year, hold the Heirloom at full speed until the dial fills, and arrive on the
  same street in a different century. Ink is charged by the year.

**Missions**
- Eleven kinds of task: drive there, talk (and be quizzed), carry loads or passengers (sometimes without a
  bump), collect things, race round stops, chase and ram a van, **tail** a van unseen, **defend** a convoy,
  **catch** a runner on foot, travel, and lose the police.
- People speak up while you work. After the first chapter, **Erasers hunt you** whenever a clock is
  running: each ram costs four seconds, and they can be rammed off the road for cash.
- Fail and you can try again on the spot. The pause menu lists the case so far and can make every timer
  generous.

**Money**
- Story missions, family favours, the £ odd-jobs board in every market place, **cab fares** (get into any
  taxi or hansom and you are for hire, with a bonus for every fare in a row), lost photographs, reunion
  bonuses and badges.
- **Dot's workbench** at the lock-up (a motor shed or tithe barn in earlier years): a tuned engine, a brass
  ram bar, an ink economiser, a quick-wind dial, proper tyres, a respray that also loses the police, and a
  flask of tea.

**The world**
- **Drawn like a picture book.** Ink outlines, flat bright colours, windows that light up at night, smoke
  from the chimneys, striped awnings over the shops and cloud shadows drifting across the roofs.
- **Housing that changes with the year**: thatched cottages with cabbage patches and a well, terraces,
  back-to-back courts, semis with front gardens, blocks of flats with a car park. Back gardens have washing
  lines, privies and coal bunkers, or sheds, trampolines and paddling pools, depending on when you look.
- **Street furniture by era**: horse troughs, pumps and barrels; then post boxes, benches and telegraph
  poles; then bus stops, bins, bikes, planters and zebra crossings.
- **A beach** along the east side of every town, with boats, groynes, and nets, deckchairs or parasols
  according to the year; and **farmland** of wheat, cabbages, pasture and plough round the edges.
- **Same streets, every year.** Each town gets a street plan from its name, the same in every era: tarmac
  turns to setts and then to mud, slate to thatch, and the outer blocks back into fields.
- **Streets named after your family.** High Street, Market Street and Church Lane are always there; the
  rest take the commonest surnames in your tree (and local forms abroad: *Rue*, *Via*, *-straße*).
- **Landmarks by era**: a windmill before 1850, gasworks from 1840 to 1975, trams on the High Street from
  1895 to 1958, allotments after 1900, a war memorial after 1920, a supermarket and car park after 1985.
- **Day, night and weather.** A clock runs; at night every lamp, lit window and headlamp cuts its own hole
  in the dark, and before 1810 there are no street lamps at all. It rains (more in Lancashire than in
  Lisbon) and the roads get slippery. Missions set their own hour: the census is at night, the wedding in
  the morning, the finale at dusk.
- **The churchyard.** The graves carry the names of the people in your file buried in that town by that
  year. Walk up to one to pay your respects.
- **Lost photographs**, three in every town and era, with the file's own notes written on the back.
- **Paradoxes.** Run over your own ancestor and history objects.
- **The law.** Police cars after 1900, constables on foot before. If they box you in you are fined.
- **Fourteen badges**, and progress saved on your device for each file and each hero.

## Ideas for later

- Travel with the emigrants: finish *The Last Boat* by sailing with them and arriving in the new country.
- Wills, apprenticeships and school records as further kinds of proof.
- A rival: Engine No. 1 turning up in free roam to race you between centuries.
- Music for each era.
