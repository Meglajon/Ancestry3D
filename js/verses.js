// Bible verses about generations, family and heritage for the growing tree (New International Version, UK spelling).
// `on` marks the ones shown until someone picks their own in the Visualisation tab.
export const VERSES = [
  { id: 'ps145-4', ref: 'Psalm 145:4', on: true, text: 'One generation commends your works to another; they tell of your mighty acts.' },
  { id: 'joel1-3', ref: 'Joel 1:3', on: true, text: 'Tell it to your children, and let your children tell it to their children, and their children to the next generation.' },
  { id: 'ps16-6', ref: 'Psalm 16:6', on: true, text: 'The boundary lines have fallen for me in pleasant places; surely I have a delightful inheritance.' },
  { id: 'ps100-5', ref: 'Psalm 100:5', on: true, text: 'For the LORD is good and his love endures for ever; his faithfulness continues through all generations.' },
  { id: 'prov17-6', ref: 'Proverbs 17:6', on: true, text: "Children's children are a crown to the aged, and parents are the pride of their children." },
  { id: 'ps78-4', ref: 'Psalm 78:4', on: true, text: 'We will not hide them from their descendants; we will tell the next generation the praiseworthy deeds of the LORD, his power, and the wonders he has done.' },
  { id: 'ps102-18', ref: 'Psalm 102:18', on: true, text: 'Let this be written for a future generation, that a people not yet created may praise the LORD.' },
  { id: 'job8-8', ref: 'Job 8:8', on: true, text: 'Ask the former generation and find out what their ancestors learned.' },
  { id: 'ps90-1', ref: 'Psalm 90:1', on: false, text: 'Lord, you have been our dwelling place throughout all generations.' },
  { id: 'ps103-17', ref: 'Psalm 103:17', on: false, text: "But from everlasting to everlasting the LORD's love is with those who fear him, and his righteousness with their children's children." },
  { id: 'prov13-22', ref: 'Proverbs 13:22', on: false, text: "A good person leaves an inheritance for their children's children, but a sinner's wealth is stored up for the righteous." },
  { id: 'ex20-12', ref: 'Exodus 20:12', on: false, text: 'Honour your father and your mother, so that you may live long in the land the LORD your God is giving you.' },
  { id: 'deut7-9', ref: 'Deuteronomy 7:9', on: false, text: 'Know therefore that the LORD your God is God; he is the faithful God, keeping his covenant of love to a thousand generations of those who love him and keep his commandments.' },
  { id: 'isa46-4', ref: 'Isaiah 46:4', on: false, text: 'Even to your old age and grey hairs I am he, I am he who will sustain you. I have made you and I will carry you; I will sustain you and I will rescue you.' },
  { id: 'ps71-18', ref: 'Psalm 71:18', on: false, text: 'Even when I am old and grey, do not forsake me, my God, till I declare your power to the next generation, your mighty acts to all who are to come.' },
  { id: 'ps127-3', ref: 'Psalm 127:3', on: false, text: 'Children are a heritage from the LORD, offspring a reward from him.' },
  { id: 'prov22-6', ref: 'Proverbs 22:6', on: false, text: 'Start children off on the way they should go, and even when they are old they will not turn from it.' },
  { id: '1tim5-8', ref: '1 Timothy 5:8', on: false, text: 'Anyone who does not provide for their relatives, and especially for their own household, has denied the faith and is worse than an unbeliever.' },
  { id: 'ps1-3', ref: 'Psalm 1:3', on: false, text: 'That person is like a tree planted by streams of water, which yields its fruit in season and whose leaf does not wither—whatever they do prospers.' },
  { id: 'isa51-1', ref: 'Isaiah 51:1', on: false, text: 'Listen to me, you who pursue righteousness and who seek the LORD: Look to the rock from which you were cut and to the quarry from which you were hewn.' },
];
export const VERSE_COPYRIGHT = 'Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.';

/**
 * Reveals verses a word at a time (the whole verse in a second or two): each word fades and rises into place. Then the reference appears, the verse rests on screen,
 * fades away, and after a quiet gap the next one begins.
 */
export class VerseReader {
  constructor(verses) {
    this.list = verses.slice();
    for (let i = this.list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.list[i], this.list[j]] = [this.list[j], this.list[i]]; }
    this.i = 0; this.t = -3; // a short quiet moment before the first verse
    this.plan();
  }
  plan() {
    const v = this.list[this.i % this.list.length];
    this.verse = v;
    const words = v.text.split(/\s+/);
    // the whole verse appears in about 1-2 seconds, a word at a time, with tiny pauses at punctuation
    const step = Math.max(0.05, Math.min(0.14, 1.5 / words.length));
    this.words = [];
    let at = 0;
    for (const w of words) {
      this.words.push({ w, at });
      at += step + (/[,;:]$/.test(w) ? step * 0.8 : /[.!?—]$/.test(w) ? step * 1.2 : 0);
    }
    this.readEnd = at;
    this.refAt = at + 0.3;
    this.fadeAt = at + 3.5 + words.length * 0.18; // time to read it
    this.end = this.fadeAt + 1.2;
    this.gap = 4;
  }
  update(dt) {
    if (!this.list.length) return;
    this.t += dt;
    if (this.t > this.end + this.gap) { this.i++; this.t = 0; this.plan(); }
  }
  /** Draws the verse centred at (cx, y) within maxW. style: { ink, glow, font } */
  draw(ctx, cx, y, maxW, style) {
    if (!this.list.length || this.t < 0 || this.t > this.end) return 0;
    const fade = this.t > this.fadeAt ? Math.max(0, 1 - (this.t - this.fadeAt) / (this.end - this.fadeAt)) : 1;
    const size = Math.max(15, Math.min(21, maxW / 30));
    ctx.font = `italic 500 ${size}px Lora, Georgia, 'Times New Roman', serif`;
    const space = ctx.measureText(' ').width, lh = size * 1.45;
    // lay the words out in lines
    const lines = [[]];
    let lw = 0;
    for (const word of this.words) {
      const w = ctx.measureText(word.w).width;
      if (lw && lw + space + w > maxW) { lines.push([]); lw = 0; }
      lines[lines.length - 1].push({ ...word, width: w });
      lw += (lw ? space : 0) + w;
    }
    ctx.save();
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = style.outline || 'rgba(20,10,30,0.8)';
    lines.forEach((line, li) => {
      const total = line.reduce((s, w) => s + w.width, 0) + space * (line.length - 1);
      let x = cx - total / 2;
      for (const word of line) {
        const k = Math.max(0, Math.min(1, (this.t - word.at) / 0.35));
        if (k > 0) {
          ctx.globalAlpha = fade * k * k * (3 - 2 * k);
          const wy = y + li * lh + (1 - k) * 6;
          ctx.strokeText(word.w, x, wy);
          ctx.fillStyle = style.ink;
          ctx.fillText(word.w, x, wy);
        }
        x += word.width + space;
      }
    });
    const refK = Math.max(0, Math.min(1, (this.t - this.refAt) / 0.8));
    if (refK > 0) {
      ctx.globalAlpha = fade * refK;
      ctx.font = `600 ${Math.round(size * 0.62)}px Nunito, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.fillStyle = style.ink;
      ctx.strokeText(`— ${this.verse.ref}`, cx, y + lines.length * lh + 2);
      ctx.fillText(`— ${this.verse.ref}`, cx, y + lines.length * lh + 2);
    }
    ctx.restore();
    return lines.length * lh + size;
  }
}
