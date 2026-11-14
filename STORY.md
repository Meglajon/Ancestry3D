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
| **Dot Quill** | County Archivist, retired. Built a time machine into her late husband's estate car because she was "a very bored archivist". Bad hip, so you drive. Rings phone boxes; in years without phones she leaves notes pinned up for you. |
| **The Heirloom** | The car. Mustard yellow, wood trim, a brass dial on the roof. Faster than anything in any century it visits. |
| **Silas Blank** | Of Blank & Void, Probate Genealogists. Grey suit, grey van, grey everything. Has Dot's first, stolen, prototype engine. |
| **The Erasers** | Blank's men. They drive grey Redaction vans (grey carriages before 1900) with a large pink rubber on the roof. |
| **Your ancestors** | Up to seven of them get a chapter each: the best-documented line from your parents back to the earliest person on it, plus up to two "detours" for people off that line who were born abroad, emigrated or served in the forces. They speak in the dialect of where they were born, as in the rest of the game. |
| **Everybody else** | The streets of each town are walked by the real people in your file who lived there in that year. Walk up to them and their names appear. |

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

Each chapter is set where and when a real event in that person's life happened, and has three missions.

1. **Meeting {name}.** You find your **{relationship}** at home. They introduce themselves as they do in
   the main game, but a grey man has been round asking questions and they trust nobody. To prove you are
   family you must answer something only family would know: **{their mother's maiden name / who they
   married / the year they were born / their trade / where they were born}**, picked from the file, with
   wrong answers taken from elsewhere in your tree.
2. **A day's work.** They put you to work at their real trade:

   | Their occupation | The job |
   |---|---|
   | miner, quarryman, ironworker, potter, labourer | *Three Loads*: haul coal, iron, stone or pots to the quay against the hooter. Second time: *Runaway Tubs*. |
   | weaver, spinner, tailor, dressmaker | *Cut From the Same Cloth*: finished cloth to the draper without one bump. Second time: *The Knocker-Up*. |
   | farmer, farm labourer, shepherd | *Gone Astray*: round up the animals a man in a grey coat let out, then get to market. |
   | servant, cook, laundress | *Below Stairs*: the whole shopping list before the mistress rings for tea. |
   | fisherman, sailor, docker | *Fresh Today*: the catch from the quay to the market before it turns. |
   | railwayman, postman, carter, coachman | *The Round*: every drop on the timetable. |
   | grocer, baker, publican, shopkeeper | *Orders Out*: five orders to five doors before dinner. |
   | smith, joiner, mason, electrician, engineer | *Made to Last*: a week's work delivered to the church in one piece. |
   | nurse, midwife, doctor | *On Call*: an injured man from the farm to the infirmary, quick but smooth. |
   | teacher, clergy | *Truants*: round up the class before the inspector arrives. |
   | soldier, sailor RN, constable | *Dispatches*: orders round the town at the double. |
   | clerk, solicitor, anything with a desk | *In Triplicate*: stamped, countersigned and witnessed before the office shuts. |
   | gentleman, landowner | *Driving the Quality*: you may drive them. You may not jolt them. |

3. **The proof.** The chapter's big mission is built on a real event, and the chapter is set in the year
   and the place it happened. The game picks whichever kind this person has that the story has used least.

   | What the file has | The mission | The proof you win |
   |---|---|---|
   | a marriage | *Get Me to the Church*: the Erasers have had the wheels off every cart in the street. Get **{the groom}** to the church before the bells stop, then chase down the carriage that has snatched the register. | Marriage of **{groom}** and **{bride}**, **{date, place}** |
   | the birth of the child you descend from | *Special Delivery*: **{child}** is due and somebody has lamed the midwife's pony. Rush her to the house, then gather the scattered pages of the birth register. | Birth of **{child}**, **{date, place}** |
   | an emigration, or a birth in one country and a family in another | *The Last Boat* (*Final Call* after 1950): trunks, then the traveller, to the quay or the airport before it leaves for **{country}**; then get the passenger list back. | Passage of **{name}**, bound for **{country}** |
   | a census or residence entry | *Count Me In*: the enumerator has been knocked flat and robbed of his schedules. Do his round before midnight and get the book back. | Census entry, **{year, place}** |
   | military service | *The King's Shilling*: the muster roll is missing. Run the dispatches and get **{name}** to the transport. | Service record |
   | a baptism | *Wet the Baby's Head*: the register "fell open in the night" in a locked vestry. Gather the pages; chase the last one. | Baptism of **{name}**, **{date, place}** |
   | none of these | *Struck Out*: Blank's men are at the register with a bottle of ink remover. | Parish entry |

Getting to each chapter is part of the game. If it is in another town you buy a ticket at the airport (a
steamer or a sailing packet in earlier years); if it is in another country it costs more. Then you set the
dial and drive.

### Interlude: The Golden Door (New York, 1907)

*Only if nobody in your file ever left the home country.* Blank has "gone wholesale": Ellis Island, twelve
million names on the manifests. Not your family's, perhaps, but somebody's. You collect the manifest pages
blowing along the waterfront and stop the van on its way to the incinerator.

### Interlude: Blank & Void (present day, {home town})

Blank is always a step ahead, and Dot wants to know how. You visit his offices, uninvited. They throw the
ledger out of the windows a page at a time; you grab the pages and then lose the police.

Page one of the ledger, in his own hand: *"BLANK, Silas. Foundling. Left at the door of the parish of
**{the town of your earliest known ancestor}**. No name given."* He is not only erasing your family. He
has been looking for his own. And the last entry is **{your earliest known ancestor}**: he is going for
the root.

### Finale: The Blank Page ({earliest ancestor's town}, {year})

**{The earliest person on your line}** is your brick wall: nobody above them in any record. If their entry
never goes in the book, every name under it goes blank, down to yours.

They tell you a grey gentleman is at the church, turning the parson's book to their page, and that he
said the queerest thing: *"Somebody has to be nobody."*

You race to the church, save every page of the torn register, and run down Engine No. 1 before Blank can
escape to another century. Beaten, he tells you to read the page you were so keen to save. Not the entry.
The margin:

> *"Also a second infant of this house, base-born, put out to the parish this day. No name given."*
> And beneath it, in the workhouse clerk's hand: *"Entered as BLANK."*

He was named Blank because the line was blank. Four hundred years of your people in every book he opens,
and his whole family is a gap in a margin. He thought that if nobody had a tree he would not mind so much.

Dot: *"That's not a gap, Silas. That's a sibling. You've spent thirty years trying to erase your own
family."*

### Epilogue: Case Closed (present day, {home town})

You drive Dot and Silas to the Records Office, slowly: her hip, his nerves. The pedigree of **{you}** is
lodged and stamped with one more name on it than you started with. The estate goes to its rightful heirs:
you, and one newly discovered cousin, many times removed, who cries all over the paperwork.

Silas would like to meet his great-great-aunts. He asks to borrow the car. He may not. But you might
drive him: the Heirloom is yours now, with every town and every year unlocked.

## How it plays

- **On foot and at the wheel.** Walk anywhere; get into the Heirloom or borrow anything parked or passing
  (the owner will have something to say). Before 1900 that means carts, carriages and wagons.
- **Missions for cash.** Story missions pay more each chapter. The £ board in every market place gives a
  never-ending supply of odd jobs, in every year, for when you are short of the fare.
- **Tickets.** The airport (a quay before 1950) sells tickets to every town the story has opened. Another
  country costs more, another continent more again. The Heirloom travels as freight.
- **The time dial.** Pick a year, then hold the Heirloom at full speed until the dial fills. You arrive on
  the same street in a different century; the further back, the more of the town is still fields. Ink is
  charged by the year.
- **The law.** Knock people over or drive like it is 2026 in 1871 and you pick up stars. Police cars after
  1900, constables on foot before. If they box you in you are fined and walk home from the station.
- **Same streets, every year.** Each town gets a street plan from its name. The plan is the same in every
  era: tarmac turns to setts and then to mud, slate to thatch, and the outer blocks back into fields.
- **Saved on your device**, separately for each file and each hero.

## Ideas for later

- Travel with the emigrants: finish *The Last Boat* by sailing with them and arriving in the new country.
- Lost photographs hidden in each town that unlock the NOTE text from the file.
- Side missions for siblings, cousins and in-laws (the file has them; the story so far only uses the
  direct line).
- Weather and time of day; night missions by gaslight.
- A rival: Engine No. 1 turning up in free roam to race you between centuries.
