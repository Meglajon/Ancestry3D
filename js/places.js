// Turns a GEDCOM place ("Pemberton, Wigan, Lancashire, England") into what the game needs to know about it:
// which region it is (for speech), which country, and the typical colouring of people born there.
// Matching is by whole words against each comma-separated part, most specific part first.

// ---- Regions: dialect (interpreted in dialogue.js) ----
export const REGIONS = {
  lancashire:   { label: 'Lancashire', country: 'England', dialect: 'lancs', house: 'mill', tone: 'nweu' },
  manchester:   { label: 'Manchester', country: 'England', dialect: 'manc', house: 'mill', tone: 'nweu' },
  liverpool:    { label: 'Liverpool', country: 'England', dialect: 'scouse', house: 'cityterrace', tone: 'nweu' },
  yorkshire:    { label: 'Yorkshire', country: 'England', dialect: 'yorks', house: 'pennine', tone: 'nweu' },
  sheffield:    { label: 'Sheffield', country: 'England', dialect: 'yorks', house: 'mill', tone: 'nweu' },
  hull:         { label: 'Hull', country: 'England', dialect: 'yorks', house: 'cityterrace', tone: 'nweu' },
  northeast:    { label: 'the North East', country: 'England', dialect: 'geordie', house: 'colliery', tone: 'nweu' },
  cumbria:      { label: 'Cumberland', country: 'England', dialect: 'cumbria', house: 'lakeland', tone: 'nweu' },
  cheshire:     { label: 'Cheshire', country: 'England', dialect: 'northwest', house: 'timber', tone: 'nweu' },
  potteries:    { label: 'the Potteries', country: 'England', dialect: 'potteries', house: 'mill', tone: 'nweu' },
  blackcountry: { label: 'the Black Country', country: 'England', dialect: 'brummie', house: 'mill', tone: 'nweu' },
  midlands:     { label: 'the Midlands', country: 'England', dialect: 'midlands', house: 'midbrick', tone: 'nweu' },
  eastmidlands: { label: 'the East Midlands', country: 'England', dialect: 'eastmids', house: 'midbrick', tone: 'nweu' },
  lincolnshire: { label: 'Lincolnshire', country: 'England', dialect: 'eastmids', house: 'midbrick', tone: 'nweu' },
  cotswolds:    { label: 'the Cotswolds', country: 'England', dialect: 'glos', house: 'cotswold', tone: 'nweu' },
  westcountry:  { label: 'the West Country', country: 'England', dialect: 'west', house: 'cob', tone: 'nweu' },
  cornwall:     { label: 'Cornwall', country: 'England', dialect: 'cornish', house: 'granite', tone: 'nweu' },
  bristol:      { label: 'Bristol', country: 'England', dialect: 'west', house: 'cityterrace', tone: 'nweu' },
  london:       { label: 'London', country: 'England', dialect: 'cockney', house: 'london', tone: 'nweu' },
  southeast:    { label: 'the South East', country: 'England', dialect: 'south', house: 'timber', tone: 'nweu' },
  eastanglia:   { label: 'East Anglia', country: 'England', dialect: 'norfolk', house: 'flint', tone: 'nweu' },
  england:      { label: 'England', country: 'England', dialect: 'english', house: 'midbrick', tone: 'nweu' },
  wales:        { label: 'Wales', country: 'Wales', dialect: 'welsh', house: 'welsh', tone: 'nweu' },
  southwales:   { label: 'the Valleys', country: 'Wales', dialect: 'welsh', house: 'valleys', tone: 'nweu' },
  lowlands:     { label: 'the Lowlands', country: 'Scotland', dialect: 'scots', house: 'scotstone', tone: 'nweu' },
  glasgow:      { label: 'Glasgow', country: 'Scotland', dialect: 'glaswegian', house: 'tenement', tone: 'nweu' },
  edinburgh:    { label: 'Edinburgh', country: 'Scotland', dialect: 'scots', house: 'tenement', tone: 'nweu' },
  highlands:    { label: 'the Highlands', country: 'Scotland', dialect: 'highland', house: 'blackhouse', tone: 'nweu' },
  ireland:      { label: 'Ireland', country: 'Ireland', dialect: 'irish', house: 'irishcottage', tone: 'nweu' },
  dublin:       { label: 'Dublin', country: 'Ireland', dialect: 'dublin', house: 'cityterrace', tone: 'nweu' },
  ulster:       { label: 'Ulster', country: 'Ireland', dialect: 'ulster', house: 'irishcottage', tone: 'nweu' },
  isleofman:    { label: 'the Isle of Man', country: 'Isle of Man', dialect: 'english', house: 'irishcottage', tone: 'nweu' },
  channel:      { label: 'the Channel Islands', country: 'Channel Islands', dialect: 'south', house: 'granite', tone: 'nweu' },
  // ---- beyond the British Isles (country level) ----
  usa:          { label: 'America', country: 'the United States', dialect: 'american', house: 'clapboard', tone: 'settler' },
  canada:       { label: 'Canada', country: 'Canada', dialect: 'canadian', house: 'clapboard', tone: 'settler' },
  australia:    { label: 'Australia', country: 'Australia', dialect: 'aussie', house: 'veranda', tone: 'settler' },
  newzealand:   { label: 'New Zealand', country: 'New Zealand', dialect: 'aussie', house: 'veranda', tone: 'settler' },
  southafrica:  { label: 'South Africa', country: 'South Africa', dialect: 'english', house: 'veranda', tone: 'settler' },
  germany:      { label: 'Germany', country: 'Germany', dialect: 'german', house: 'fachwerk', tone: 'nweu' },
  netherlands:  { label: 'the Netherlands', country: 'the Netherlands', dialect: 'dutch', house: 'dutch', tone: 'nweu' },
  belgium:      { label: 'Belgium', country: 'Belgium', dialect: 'french', house: 'dutch', tone: 'nweu' },
  france:       { label: 'France', country: 'France', dialect: 'french', house: 'stucco', tone: 'nweu' },
  scandinavia:  { label: 'Scandinavia', country: 'Scandinavia', dialect: 'nordic', house: 'nordic', tone: 'nweu' },
  italy:        { label: 'Italy', country: 'Italy', dialect: 'italian', house: 'med', tone: 'seu' },
  spain:        { label: 'Spain', country: 'Spain', dialect: 'spanish', house: 'med', tone: 'seu' },
  portugal:     { label: 'Portugal', country: 'Portugal', dialect: 'spanish', house: 'med', tone: 'seu' },
  greece:       { label: 'Greece', country: 'Greece', dialect: 'greek', house: 'med', tone: 'seu' },
  easteurope:   { label: 'Eastern Europe', country: 'Eastern Europe', dialect: 'easteu', house: 'wooden', tone: 'nweu' },
  russia:       { label: 'Russia', country: 'Russia', dialect: 'easteu', house: 'wooden', tone: 'nweu' },
  mena:         { label: 'the Middle East', country: 'the Middle East', dialect: 'mena', house: 'flatroof', tone: 'mena' },
  northafrica:  { label: 'North Africa', country: 'North Africa', dialect: 'mena', house: 'flatroof', tone: 'mena' },
  southasia:    { label: 'India', country: 'India', dialect: 'southasia', house: 'flatroof', tone: 'sasia' },
  eastasia:     { label: 'East Asia', country: 'East Asia', dialect: 'eastasia', house: 'tileroof', tone: 'easia' },
  seasia:       { label: 'South East Asia', country: 'South East Asia', dialect: 'eastasia', house: 'stilt', tone: 'seasia' },
  westafrica:   { label: 'West Africa', country: 'West Africa', dialect: 'africa', house: 'roundhouse', tone: 'africa' },
  africa:       { label: 'Africa', country: 'Africa', dialect: 'africa', house: 'roundhouse', tone: 'africa' },
  caribbean:    { label: 'the Caribbean', country: 'the Caribbean', dialect: 'caribbean', house: 'chattel', tone: 'caribbean' },
  latinamerica: { label: 'Latin America', country: 'Latin America', dialect: 'spanish', house: 'med', tone: 'latam' },
  unknown:      { label: '', country: '', dialect: 'english', house: 'midbrick', tone: 'unknown' },
};

// keyword -> region key. Towns first (more specific), then counties, then countries.
const KEYWORDS = {
  // Lancashire & Greater Manchester
  wigan: 'lancashire', bolton: 'lancashire', preston: 'lancashire', blackburn: 'lancashire', burnley: 'lancashire', oldham: 'lancashire', rochdale: 'lancashire',
  bury: 'lancashire', leigh: 'lancashire', chorley: 'lancashire', accrington: 'lancashire', lancaster: 'lancashire', 'st helens': 'lancashire', warrington: 'lancashire',
  atherton: 'lancashire', tyldesley: 'lancashire', ince: 'lancashire', hindley: 'lancashire', pemberton: 'lancashire', ashton: 'lancashire', rossendale: 'lancashire',
  nelson: 'lancashire', colne: 'lancashire', darwen: 'lancashire', blackpool: 'lancashire', heywood: 'lancashire', skelmersdale: 'lancashire', ormskirk: 'lancashire',
  lancashire: 'lancashire', lancs: 'lancashire',
  manchester: 'manchester', salford: 'manchester', stockport: 'manchester', ancoats: 'manchester', 'moss side': 'manchester', chorlton: 'manchester',
  liverpool: 'liverpool', bootle: 'liverpool', birkenhead: 'liverpool', everton: 'liverpool', toxteth: 'liverpool', wallasey: 'liverpool', merseyside: 'liverpool',
  // Yorkshire
  sheffield: 'sheffield', rotherham: 'sheffield', hull: 'hull', 'kingston upon hull': 'hull',
  leeds: 'yorkshire', bradford: 'yorkshire', halifax: 'yorkshire', huddersfield: 'yorkshire', wakefield: 'yorkshire', barnsley: 'yorkshire', doncaster: 'yorkshire',
  york: 'yorkshire', whitby: 'yorkshire', scarborough: 'yorkshire', harrogate: 'yorkshire', keighley: 'yorkshire', dewsbury: 'yorkshire', batley: 'yorkshire',
  'hebden bridge': 'yorkshire', todmorden: 'yorkshire', haworth: 'yorkshire', skipton: 'yorkshire', ripon: 'yorkshire', pontefract: 'yorkshire', saddleworth: 'yorkshire',
  yorkshire: 'yorkshire', 'west riding': 'yorkshire', 'east riding': 'yorkshire', 'north riding': 'yorkshire',
  // North East & Cumbria
  newcastle: 'northeast', 'newcastle upon tyne': 'northeast', gateshead: 'northeast', sunderland: 'northeast', durham: 'northeast', 'south shields': 'northeast',
  'north shields': 'northeast', tynemouth: 'northeast', jarrow: 'northeast', hartlepool: 'northeast', middlesbrough: 'northeast', stockton: 'northeast',
  darlington: 'northeast', northumberland: 'northeast', 'county durham': 'northeast', tyneside: 'northeast', ashington: 'northeast', morpeth: 'northeast',
  carlisle: 'cumbria', kendal: 'cumbria', whitehaven: 'cumbria', workington: 'cumbria', penrith: 'cumbria', keswick: 'cumbria', barrow: 'cumbria',
  'barrow in furness': 'cumbria', cumberland: 'cumbria', westmorland: 'cumbria', cumbria: 'cumbria',
  // Cheshire, Potteries, Midlands
  chester: 'cheshire', macclesfield: 'cheshire', crewe: 'cheshire', nantwich: 'cheshire', congleton: 'cheshire', cheshire: 'cheshire',
  stoke: 'potteries', 'stoke on trent': 'potteries', burslem: 'potteries', hanley: 'potteries', longton: 'potteries', tunstall: 'potteries', fenton: 'potteries', staffordshire: 'midlands',
  birmingham: 'blackcountry', dudley: 'blackcountry', wolverhampton: 'blackcountry', walsall: 'blackcountry', 'west bromwich': 'blackcountry', tipton: 'blackcountry',
  bilston: 'blackcountry', smethwick: 'blackcountry', 'cradley heath': 'blackcountry', halesowen: 'blackcountry', wednesbury: 'blackcountry', oldbury: 'blackcountry',
  coventry: 'midlands', warwick: 'midlands', warwickshire: 'midlands', worcester: 'midlands', worcestershire: 'midlands', shropshire: 'midlands', shrewsbury: 'midlands',
  hereford: 'midlands', herefordshire: 'midlands', northampton: 'midlands', northamptonshire: 'midlands', leicester: 'eastmidlands', leicestershire: 'eastmidlands',
  nottingham: 'eastmidlands', nottinghamshire: 'eastmidlands', derby: 'eastmidlands', derbyshire: 'eastmidlands', chesterfield: 'eastmidlands', mansfield: 'eastmidlands',
  rutland: 'eastmidlands', lincoln: 'lincolnshire', lincolnshire: 'lincolnshire', grimsby: 'lincolnshire', boston: 'lincolnshire',
  // Cotswolds & West Country
  cotswolds: 'cotswolds', gloucestershire: 'cotswolds', gloucester: 'cotswolds', cheltenham: 'cotswolds', cirencester: 'cotswolds', stroud: 'cotswolds',
  tewkesbury: 'cotswolds', tetbury: 'cotswolds', 'chipping campden': 'cotswolds', 'chipping norton': 'cotswolds', 'stow on the wold': 'cotswolds', burford: 'cotswolds',
  'bourton on the water': 'cotswolds', painswick: 'cotswolds', winchcombe: 'cotswolds', 'moreton in marsh': 'cotswolds', bibury: 'cotswolds', witney: 'cotswolds',
  oxfordshire: 'cotswolds', oxford: 'cotswolds', 'forest of dean': 'cotswolds', banbury: 'cotswolds',
  bristol: 'bristol', bath: 'westcountry', somerset: 'westcountry', devon: 'westcountry', exeter: 'westcountry', plymouth: 'westcountry', dorset: 'westcountry',
  wiltshire: 'westcountry', swindon: 'westcountry', salisbury: 'westcountry', taunton: 'westcountry', yeovil: 'westcountry', barnstaple: 'westcountry', torquay: 'westcountry',
  cornwall: 'cornwall', truro: 'cornwall', penzance: 'cornwall', 'st ives': 'cornwall', falmouth: 'cornwall', bodmin: 'cornwall', redruth: 'cornwall', camborne: 'cornwall', 'st austell': 'cornwall',
  // London & South
  london: 'london', middlesex: 'london', westminster: 'london', southwark: 'london', lambeth: 'london', stepney: 'london', whitechapel: 'london', 'bethnal green': 'london',
  shoreditch: 'london', islington: 'london', hackney: 'london', poplar: 'london', bermondsey: 'london', 'st pancras': 'london', marylebone: 'london', kensington: 'london',
  chelsea: 'london', fulham: 'london', camberwell: 'london', deptford: 'london', greenwich: 'london', woolwich: 'london', clerkenwell: 'london', holborn: 'london',
  'west ham': 'london', 'east ham': 'london', stratford: 'london', walthamstow: 'london', croydon: 'london', wandsworth: 'london', battersea: 'london', 'city of london': 'london',
  kent: 'southeast', sussex: 'southeast', surrey: 'southeast', hampshire: 'southeast', essex: 'southeast', berkshire: 'southeast', buckinghamshire: 'southeast',
  hertfordshire: 'southeast', bedfordshire: 'southeast', 'isle of wight': 'southeast', brighton: 'southeast', portsmouth: 'southeast', southampton: 'southeast',
  canterbury: 'southeast', reading: 'southeast', maidstone: 'southeast', dover: 'southeast', colchester: 'southeast', chelmsford: 'southeast',
  norfolk: 'eastanglia', suffolk: 'eastanglia', norwich: 'eastanglia', ipswich: 'eastanglia', cambridgeshire: 'eastanglia', cambridge: 'eastanglia',
  'kings lynn': 'eastanglia', 'great yarmouth': 'eastanglia', lowestoft: 'eastanglia', huntingdonshire: 'eastanglia', ely: 'eastanglia',
  england: 'england', 'great britain': 'england', 'united kingdom': 'england', uk: 'england', britain: 'england',
  // Wales
  merthyr: 'southwales', 'merthyr tydfil': 'southwales', rhondda: 'southwales', aberdare: 'southwales', pontypridd: 'southwales', 'ebbw vale': 'southwales',
  tredegar: 'southwales', caerphilly: 'southwales', glamorgan: 'southwales', glamorganshire: 'southwales', monmouthshire: 'southwales', cardiff: 'southwales',
  swansea: 'southwales', newport: 'southwales', neath: 'southwales', llanelli: 'southwales', bridgend: 'southwales', blaenavon: 'southwales', 'mountain ash': 'southwales',
  wales: 'wales', carmarthenshire: 'wales', cardiganshire: 'wales', pembrokeshire: 'wales', gwynedd: 'wales', caernarfonshire: 'wales', caernarvonshire: 'wales',
  anglesey: 'wales', denbighshire: 'wales', flintshire: 'wales', montgomeryshire: 'wales', merionethshire: 'wales', brecknockshire: 'wales', breconshire: 'wales',
  radnorshire: 'wales', aberystwyth: 'wales', bangor: 'wales', wrexham: 'wales', caernarfon: 'wales', carmarthen: 'wales', powys: 'wales', dyfed: 'wales', clwyd: 'wales',
  // Scotland
  glasgow: 'glasgow', paisley: 'glasgow', govan: 'glasgow', clydebank: 'glasgow', greenock: 'glasgow', lanarkshire: 'lowlands', renfrewshire: 'glasgow',
  motherwell: 'lowlands', hamilton: 'lowlands', airdrie: 'lowlands', coatbridge: 'lowlands', ayrshire: 'lowlands', kilmarnock: 'lowlands', ayr: 'lowlands',
  dumfries: 'lowlands', dumfriesshire: 'lowlands', galloway: 'lowlands', borders: 'lowlands', roxburghshire: 'lowlands', berwickshire: 'lowlands',
  fife: 'lowlands', dundee: 'lowlands', angus: 'lowlands', forfarshire: 'lowlands', stirling: 'lowlands', stirlingshire: 'lowlands', falkirk: 'lowlands',
  perth: 'lowlands', perthshire: 'lowlands', aberdeen: 'lowlands', aberdeenshire: 'lowlands', banffshire: 'lowlands', kincardineshire: 'lowlands',
  edinburgh: 'edinburgh', leith: 'edinburgh', midlothian: 'edinburgh', lothian: 'edinburgh', 'west lothian': 'lowlands', 'east lothian': 'lowlands',
  inverness: 'highlands', 'inverness-shire': 'highlands', highland: 'highlands', highlands: 'highlands', ross: 'highlands', 'ross and cromarty': 'highlands',
  sutherland: 'highlands', caithness: 'highlands', argyll: 'highlands', argyllshire: 'highlands', skye: 'highlands', 'isle of skye': 'highlands', lewis: 'highlands',
  harris: 'highlands', 'outer hebrides': 'highlands', hebrides: 'highlands', mull: 'highlands', islay: 'highlands', orkney: 'highlands', shetland: 'highlands', nairn: 'highlands',
  scotland: 'lowlands',
  // Ireland
  dublin: 'dublin', belfast: 'ulster', antrim: 'ulster', down: 'ulster', armagh: 'ulster', tyrone: 'ulster', fermanagh: 'ulster', londonderry: 'ulster', derry: 'ulster',
  donegal: 'ulster', monaghan: 'ulster', cavan: 'ulster', ulster: 'ulster', 'northern ireland': 'ulster',
  cork: 'ireland', kerry: 'ireland', limerick: 'ireland', clare: 'ireland', galway: 'ireland', mayo: 'ireland', sligo: 'ireland', roscommon: 'ireland', leitrim: 'ireland',
  tipperary: 'ireland', waterford: 'ireland', wexford: 'ireland', wicklow: 'ireland', kildare: 'ireland', meath: 'ireland', westmeath: 'ireland', louth: 'ireland',
  kilkenny: 'ireland', carlow: 'ireland', laois: 'ireland', "queen's county": 'ireland', offaly: 'ireland', "king's county": 'ireland', longford: 'ireland', westport: 'ireland',
  ireland: 'ireland', eire: 'ireland', 'county cork': 'ireland', 'county mayo': 'ireland',
  'isle of man': 'isleofman', douglas: 'isleofman', jersey: 'channel', guernsey: 'channel',
  // Elsewhere
  usa: 'usa', 'united states': 'usa', 'united states of america': 'usa', america: 'usa', 'new york': 'usa', pennsylvania: 'usa', massachusetts: 'usa', ohio: 'usa',
  illinois: 'usa', chicago: 'usa', california: 'usa', texas: 'usa', virginia: 'usa', 'new jersey': 'usa', michigan: 'usa', utah: 'usa', boston_ma: 'usa',
  connecticut: 'usa', maryland: 'usa', georgia_us: 'usa', carolina: 'usa', 'north carolina': 'usa', 'south carolina': 'usa', kentucky: 'usa', tennessee: 'usa',
  canada: 'canada', ontario: 'canada', quebec: 'canada', 'nova scotia': 'canada', 'new brunswick': 'canada', manitoba: 'canada', 'british columbia': 'canada', toronto: 'canada', montreal: 'canada',
  australia: 'australia', 'new south wales': 'australia', victoria_au: 'australia', queensland: 'australia', sydney: 'australia', melbourne: 'australia', tasmania: 'australia', adelaide: 'australia',
  'western australia': 'australia', 'south australia': 'australia', 'northern territory': 'australia', 'new zealand': 'newzealand', auckland: 'newzealand', otago: 'newzealand', canterbury_nz: 'newzealand', 'south africa': 'southafrica', 'cape colony': 'southafrica', natal: 'southafrica',
  germany: 'germany', prussia: 'germany', bavaria: 'germany', hamburg: 'germany', berlin: 'germany', deutschland: 'germany', austria: 'germany', switzerland: 'germany',
  netherlands: 'netherlands', holland: 'netherlands', amsterdam: 'netherlands', belgium: 'belgium', flanders: 'belgium', france: 'france', paris: 'france', normandy: 'france', brittany: 'france',
  norway: 'scandinavia', sweden: 'scandinavia', denmark: 'scandinavia', finland: 'scandinavia', iceland: 'scandinavia',
  italy: 'italy', italia: 'italy', sicily: 'italy', naples: 'italy', rome: 'italy', spain: 'spain', españa: 'spain', portugal: 'portugal', greece: 'greece', cyprus: 'greece', malta: 'italy',
  poland: 'easteurope', lithuania: 'easteurope', latvia: 'easteurope', estonia: 'easteurope', ukraine: 'easteurope', hungary: 'easteurope', czech: 'easteurope', bohemia: 'easteurope',
  slovakia: 'easteurope', romania: 'easteurope', bulgaria: 'easteurope', serbia: 'easteurope', croatia: 'easteurope', yugoslavia: 'easteurope', galicia: 'easteurope', russia: 'russia', belarus: 'easteurope',
  turkey: 'mena', 'ottoman empire': 'mena', syria: 'mena', lebanon: 'mena', iraq: 'mena', iran: 'mena', persia: 'mena', israel: 'mena', palestine: 'mena', jordan: 'mena', yemen: 'mena', 'saudi arabia': 'mena',
  egypt: 'northafrica', morocco: 'northafrica', algeria: 'northafrica', tunisia: 'northafrica', libya: 'northafrica',
  india: 'southasia', pakistan: 'southasia', bangladesh: 'southasia', 'sri lanka': 'southasia', ceylon: 'southasia', bengal: 'southasia', punjab: 'southasia', calcutta: 'southasia',
  kolkata: 'southasia', bombay: 'southasia', mumbai: 'southasia', madras: 'southasia', delhi: 'southasia', gujarat: 'southasia', kerala: 'southasia', nepal: 'southasia',
  china: 'eastasia', 'hong kong': 'eastasia', japan: 'eastasia', korea: 'eastasia', taiwan: 'eastasia', shanghai: 'eastasia', canton: 'eastasia',
  philippines: 'seasia', vietnam: 'seasia', thailand: 'seasia', siam: 'seasia', malaysia: 'seasia', malaya: 'seasia', singapore: 'seasia', indonesia: 'seasia', burma: 'seasia', myanmar: 'seasia',
  nigeria: 'westafrica', ghana: 'westafrica', 'gold coast': 'westafrica', 'sierra leone': 'westafrica', gambia: 'westafrica', senegal: 'westafrica', cameroon: 'westafrica',
  kenya: 'africa', uganda: 'africa', tanzania: 'africa', zimbabwe: 'africa', rhodesia: 'africa', zambia: 'africa', ethiopia: 'africa', somalia: 'africa', congo: 'africa', angola: 'africa', mozambique: 'africa', sudan: 'africa',
  jamaica: 'caribbean', barbados: 'caribbean', trinidad: 'caribbean', tobago: 'caribbean', grenada: 'caribbean', 'st lucia': 'caribbean', 'saint lucia': 'caribbean',
  dominica: 'caribbean', antigua: 'caribbean', guyana: 'caribbean', 'british guiana': 'caribbean', bahamas: 'caribbean', bermuda: 'caribbean', 'st kitts': 'caribbean', montserrat: 'caribbean',
  'west indies': 'caribbean', haiti: 'caribbean', cuba: 'caribbean', 'puerto rico': 'caribbean',
  mexico: 'latinamerica', brazil: 'latinamerica', argentina: 'latinamerica', chile: 'latinamerica', peru: 'latinamerica', colombia: 'latinamerica', venezuela: 'latinamerica', uruguay: 'latinamerica',
};

// Two-letter US state codes as last part ("Boston, Suffolk, MA, USA" is handled by "usa"; "Boston, MA" by this)
const US_STATES = new Set(['al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy']);

const cache = new Map();
const norm = s => s.toLowerCase().replace(/[.']/g, '').replace(/^(the|county|co)\s+/, '').replace(/\s+/g, ' ').trim();

/** Resolve a GEDCOM PLAC string. Returns { key, ...REGIONS[key], town } */
export function resolvePlace(plac) {
  if (!plac) return { key: 'unknown', ...REGIONS.unknown, town: '' };
  if (cache.has(plac)) return cache.get(plac);
  const parts = plac.split(',').map(p => p.trim()).filter(Boolean);
  const town = parts[0] || '';
  let key = null;
  // Countries named last can override (e.g. "Boston, Lincolnshire, England" vs "Boston, Massachusetts, USA").
  const last = norm(parts[parts.length - 1] || '');
  const country = KEYWORDS[last];
  const nonUK = country && !['england', 'wales', 'lowlands', 'ireland', 'ulster', 'isleofman', 'channel'].includes(country) ? country : null;
  if (US_STATES.has(last)) key = 'usa';
  for (let i = 0; i < parts.length && !key; i++) {
    const p = norm(parts[i]);
    let k = KEYWORDS[p];
    if (!k) {
      // allow "Wigan, Lancashire" in one part, or "Merthyr Tydfil Glamorgan"
      for (const word of Object.keys(KEYWORDS)) if (word.includes(' ') && p.includes(word)) { k = KEYWORDS[word]; break; }
    }
    if (k) {
      // a non-UK country at the end wins over an English-sounding town name
      key = nonUK && REGIONS[k].country !== REGIONS[nonUK].country && ['England', 'Wales', 'Scotland', 'Ireland'].includes(REGIONS[k].country) ? nonUK : k;
    }
  }
  if (!key) {
    for (const part of parts.map(norm)) for (const w of part.split(' ')) { const k = KEYWORDS[w]; if (k && REGIONS[k].tone !== 'nweu' || ['australia', 'usa', 'canada'].includes(k)) { key = k; break; } }
  }
  if (!key) key = nonUK || 'unknown';
  // Refine Scotland/Wales/Ireland country-level hits that came from the last part only
  const res = { key, ...REGIONS[key], town };
  cache.set(plac, res);
  return res;
}

// Typical skin tones (index into a 9-step light→dark ramp) for people born in a region whose parents are unknown.
export const TONE_RAMP = ['#f6dcc6', '#efcfb4', '#e6bf9e', '#d9ab84', '#c79467', '#ad7a52', '#8f5f3e', '#6e472d', '#52331f'];
export const TONE_GROUPS = {
  nweu: [0, 1, 1, 2],
  seu: [1, 2, 2, 3],
  mena: [2, 3, 3, 4],
  sasia: [3, 4, 5, 5, 6],
  easia: [1, 2, 2],
  seasia: [3, 3, 4, 4],
  africa: [6, 7, 7, 8],
  caribbean: [5, 6, 6, 7],
  latam: [2, 3, 4, 5],
  settler: [0, 1, 1, 2],
  unknown: [0, 1, 1, 2],
};
// East Asian skin reads warmer/yellower at the same lightness; small hue nudge applied in traits.
export const TONE_TINT = { easia: '#f0d2a8', seasia: null };

export const HAIR_BY_GROUP = {
  nweu: ['#2a1c14', '#3a2414', '#5a3418', '#7a4a20', '#a8742c', '#c89a50', '#8a2c14', '#1c1410'],
  seu: ['#1c1410', '#2a1c14', '#3a2414', '#5a3418'],
  mena: ['#140e0a', '#1c1410', '#2a1c14'],
  sasia: ['#0e0a08', '#140e0a', '#1c1410'],
  easia: ['#0e0a08', '#140e0a'],
  seasia: ['#0e0a08', '#140e0a'],
  africa: ['#0e0a08', '#140e0a'],
  caribbean: ['#0e0a08', '#140e0a', '#1c1410'],
  latam: ['#0e0a08', '#140e0a', '#2a1c14'],
  settler: ['#2a1c14', '#3a2414', '#5a3418', '#7a4a20', '#a8742c', '#c89a50', '#8a2c14'],
  unknown: ['#2a1c14', '#3a2414', '#5a3418', '#7a4a20', '#a8742c', '#c89a50', '#8a2c14'],
};
