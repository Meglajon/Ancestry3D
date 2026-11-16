# The promo's score, synthesised from scratch: four moods on one 120 bpm grid (a bar is two seconds).
#   0.0 - 5.0   THE THREAT   a clock ticking in time, a low drone, a heartbeat, and names being rubbed out
#   5.0 - 8.0   THE ALLY     a braam, then a plucky, determined ostinato for Dorothy and the Heirloom revving
#   8.0 - 15.0  THE CHASE    drums, driving octave bass, a saw arpeggio, time-jump whooshes, a police two-tone
#  15.0 - 20.0  THE CALL     an impact into D major: a warm pad, bells climbing, and a held chord to finish
# python music.py out.wav
import sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 20.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
mix = np.zeros((N, 2))
verb_send = np.zeros((N, 2))
BEAT = 0.5


def t_(d): return np.arange(int(SR * d)) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)   # MIDI note to frequency


def put(buf, x, at, gain=1.0, pan=0.0):
    """Add a mono or stereo sound into buf at time `at` (seconds)."""
    i = int(at * SR)
    if i >= N: return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l, x * r], 1) * np.sqrt(2)
    x = x[: N - i]
    buf[i:i + len(x)] += x * gain


def add(x, at, gain=1.0, pan=0.0, verb=0.0):
    put(mix, x, at, gain, pan)
    if verb: put(verb_send, x, at, gain * verb, pan)


def env(n, a=0.005, d=0.1, s=0.0, r=0.05, hold=None):
    """ADSR over n samples; hold is when release starts (seconds)."""
    t = np.arange(n) / SR
    hold = hold if hold is not None else n / SR - r
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = np.clip(1 - (t - hold) / max(r, 1e-6), 0, 1)
    return e * np.where(t > hold, rel, 1)


def saw(f, t, ph=0.0):
    # band-limited enough: a sum of harmonics up to 12 kHz
    out = np.zeros_like(t)
    fmax = np.max(f) if np.ndim(f) else f
    k = 1
    phase = 2 * np.pi * (np.cumsum(f) / SR if np.ndim(f) else f * t) + ph
    while k * fmax < 12000 and k < 60:
        out += np.sin(k * phase) / k
        k += 1
    return out * 0.6


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low', output='sos')
    return signal.sosfilt(sos, x, axis=0)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc / (SR / 2), 'high', output='sos')
    return signal.sosfilt(sos, x, axis=0)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos')
    return signal.sosfilt(sos, x, axis=0)


def sweep_lp(x, f0, f1, block=256):
    """A low-pass whose cutoff glides from f0 to f1 (exponentially) over the sound."""
    out = np.zeros_like(x)
    zi = None
    nb = int(np.ceil(len(x) / block))
    for b in range(nb):
        fc = f0 * (f1 / f0) ** (b / max(1, nb - 1))
        sos = signal.butter(2, min(fc, SR / 2 - 200) / (SR / 2), 'low', output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        seg = x[b * block:(b + 1) * block]
        out[b * block:b * block + len(seg)], zi = signal.sosfilt(sos, seg, zi=zi)
    return out


def noise(d): return rng.standard_normal(int(SR * d))


# ---------------- instruments ----------------
def kick(gain=1.0):
    t = t_(0.45)
    f = 48 + 110 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = hp(noise(0.45), 2000) * np.exp(-t * 300) * 0.3
    return np.tanh((body + click) * 1.6) * gain


def snare(gain=1.0):
    t = t_(0.3)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30)
    nz = bp(noise(0.3), 1500, 9000) * np.exp(-t * 16)
    return (tone * 0.5 + nz * 0.9) * gain


def hat(open_=False):
    d = 0.25 if open_ else 0.06
    t = t_(d)
    return hp(noise(d), 7000) * np.exp(-t * (14 if open_ else 70)) * 0.35


def tick(hi=True):
    t = t_(0.05)
    x = bp(noise(0.05), 2500 if hi else 1700, 6000 if hi else 4200) * np.exp(-t * 160)
    x += np.sin(2 * np.pi * (3100 if hi else 2300) * t) * np.exp(-t * 220) * 0.6
    return x


def heartbeat():
    t = t_(0.35)
    f = 38 + 30 * np.exp(-t * 20)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)


def pluck(f, d=0.5, bright=0.5):
    """Karplus-Strong: a pizzicato string."""
    n = int(SR * d)
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p)
    buf = lp(buf, 1500 + 6000 * bright)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return out * np.exp(-np.arange(n) / SR * 3)


def bell(f, d=2.5):
    t = t_(d)
    x = np.zeros_like(t)
    for ratio, amp, dec in ((1, 1, 1.6), (2.0, 0.35, 2.4), (2.76, 0.4, 3.5), (5.4, 0.18, 6), (8.93, 0.08, 9)):
        x += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * dec)
    return x * np.minimum(1, t / 0.002) * 0.4


def pad(notes, d, cutoff=1800, attack=0.6, release=1.2, detune=0.12):
    t = t_(d)
    x = np.zeros((len(t), 2))
    for m in notes:
        for c, det in enumerate((-detune, detune)):
            for k, dd in enumerate((0, 0.07)):
                x[:, c] += saw(hz(m + det + dd * (k - 0.5)), t, ph=rng.uniform(0, 6))
    x = lp(x, cutoff)
    e = np.clip(t / attack, 0, 1) * np.clip((d - t) / release, 0, 1)
    return x * e[:, None] / max(1, len(notes))


def braam(d=2.8):
    t = t_(d)
    x = np.zeros_like(t)
    for m, a in ((26, 1.0), (38, 0.8), (45, 0.55), (50, 0.4), (51, 0.18)):   # D1 D2 A2 D3 and a sour Eb3
        x += saw(hz(m) * (1 + 0.003 * np.sin(2 * np.pi * 0.7 * t)), t, ph=rng.uniform(0, 6)) * a
    x = sweep_lp(x, 2600, 180)
    x = np.tanh(x * 2.2) * np.exp(-t * 0.9) * np.minimum(1, t / 0.01)
    return x


def impact(d=3.0, depth=1.0):
    t = t_(d)
    f = 30 + 70 * np.exp(-t * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    crack = lp(noise(d), 5000) * np.exp(-t * 18)
    return np.tanh((sub * 1.2 + crack * 0.6) * depth * 1.4)


def riser(d, f0=200, f1=6000):
    x = noise(d)
    x = sweep_lp(x, f0, f1)
    x = hp(x, 150)
    t = t_(d)
    tone = np.sin(2 * np.pi * np.cumsum(220 * (8 ** (t / d))) / SR) * 0.15
    return (x * 0.7 + tone) * (t / d) ** 2


def reverse_swell(d):
    t = t_(d)
    x = hp(noise(d), 3000) * np.exp(-t * 4)
    return x[::-1] * 0.6


def whoosh(d=0.7, up=True):
    t = t_(d)
    x = noise(d)
    lo, hi = (300, 7000) if up else (7000, 300)
    x = sweep_lp(x, lo, hi)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return hp(x, 200) * e


def engine_rev(d=1.0):
    t = t_(d)
    f = 34 + 70 * (t / d) ** 1.6
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = saw(f, t) + 0.5 * np.sign(np.sin(ph)) * 0.4
    x *= 0.6 + 0.4 * np.sin(ph * 0.5)
    x = sweep_lp(x, 300, 2400)
    return np.tanh(x * 1.8) * np.minimum(1, t / 0.08) * np.clip((d - t) / 0.08, 0, 1)


def siren(d):
    t = t_(d)
    f = np.where((t * 1.1) % 1 < 0.5, 950, 760)   # the British two-tone
    f = lp(f.astype(float), 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25


def eraser_scratch(d=0.35):
    """A rubber dragged across paper: filtered noise with a scrubbing wobble."""
    t = t_(d)
    x = bp(noise(d), 900, 4500)
    wob = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * t))
    return x * wob * np.sin(np.pi * t / d) * 0.6


# =========================================================
# 1. THE THREAT  (0.0 - 5.0)  D minor, bleak
# =========================================================
for i in range(10):   # tick, tock: the clock is the tempo
    add(tick(i % 2 == 0), i * BEAT, 0.32 + 0.03 * i, pan=-0.25 if i % 2 else 0.25, verb=0.5)
for b in (0.0, 1.0, 2.0, 3.0, 4.0):
    add(heartbeat(), b, 0.75)
    add(heartbeat(), b + 0.22, 0.45)
drone = pad([38, 45, 50, 51], 5.4, cutoff=700, attack=1.2, release=0.5, detune=0.18)   # D2 A2 D3 Eb3: unease
add(drone, 0.0, 0.55, verb=0.6)
wind = sweep_lp(noise(5.2), 300, 1400) * np.linspace(0.2, 1, int(SR * 5.2))
add(hp(wind, 120), 0.0, 0.16, verb=0.4)
for k, at in enumerate((0.45, 0.85, 1.25)):   # three names rubbed out as the register burns
    add(eraser_scratch(), at, 0.38, pan=(-0.4, 0.3, -0.1)[k], verb=0.35)
add(bell(hz(74), 3.0), 1.6, 0.18, verb=0.9)   # a cold high D as Silas appears
add(bell(hz(75), 3.0), 3.1, 0.12, verb=0.9)   # and its sour neighbour
add(reverse_swell(1.4), 3.6, 0.9, verb=0.3)
add(riser(1.6, 150, 4000), 3.4, 0.35)

# =========================================================
# 2. THE ALLY  (5.0 - 8.0)  determined, a little eccentric
# =========================================================
add(braam(3.0), 5.0, 0.55, verb=0.5)
add(impact(2.5), 5.0, 0.8, verb=0.4)
# a pizzicato ostinato on eighths: D minor with a cheeky raised fourth
ost = [62, 69, 65, 69, 62, 69, 68, 69, 62, 70, 65, 70, 62, 72, 70, 69]
for i, m in enumerate(ost[:11]):
    at = 5.25 + i * 0.25
    add(pluck(hz(m), 0.45, 0.6), at, 0.42, pan=(-0.3 if i % 2 else 0.3), verb=0.25)
    if i % 2 == 0: add(pluck(hz(m - 24), 0.5, 0.3), at, 0.3, verb=0.15)
for i in range(6):   # timpani-ish pulse
    add(heartbeat(), 5.5 + i * 0.5, 0.55)
roll = np.zeros(int(SR * 1.0))
for k in range(16):
    s = snare(0.15 + 0.6 * k / 16)
    i0 = int(k * SR / 16)
    roll[i0:i0 + len(s)] += s[: len(roll) - i0]
add(roll, 7.0, 0.55, verb=0.2)
add(engine_rev(1.05), 7.0, 0.5, verb=0.1)
add(riser(1.0, 400, 9000), 7.0, 0.35)

# =========================================================
# 3. THE CHASE  (8.0 - 15.0)  four on the floor, octave bass, saw arp
# =========================================================
CH = {0: [50, 53, 57], 1: [46, 50, 53], 2: [48, 52, 55], 3: [45, 49, 52]}   # Dm  Bb  C  A
roots = [38, 34, 36, 33]
for beat in range(14):
    at = 8.0 + beat * BEAT
    bar = beat // 4 if beat < 12 else 3
    if beat < 13: add(kick(), at, 0.95)
    if beat % 2 == 1: add(snare(), at, 0.6, verb=0.25)
    for s16 in range(4 if beat < 13 else 2):
        add(hat(open_=(s16 == 2)), at + s16 * BEAT / 4, 0.55 if s16 % 2 else 0.35, pan=0.3)
    # driving octave bass, eighths
    for e in range(2):
        m = roots[bar] + (12 if e else 0)
        t = t_(0.24)
        bass = lp(saw(hz(m), t), 900) * env(len(t), 0.003, 0.15, 0.6, 0.04)
        add(np.tanh(bass * 2.0), at + e * BEAT / 2, 0.5)
    # sixteenth-note saw arpeggio over the chord
    chord = CH[bar]
    for s16 in range(4):
        m = chord[(beat * 4 + s16) % 3] + 12 + (12 if s16 == 3 else 0)
        t = t_(0.12)
        ar = lp(saw(hz(m), t), 3200) * env(len(t), 0.002, 0.06, 0.2, 0.03)
        add(ar, at + s16 * BEAT / 4, 0.16, pan=(-0.5 if s16 % 2 else 0.5), verb=0.3)
for bar in range(4):   # a pad stab on each bar, so it feels big
    d = 2.0 if bar < 3 else 1.0
    add(pad(CH[bar], d, cutoff=2400, attack=0.02, release=0.4), 8.0 + bar * 2.0, 0.3, verb=0.4)
add(impact(1.6, 0.8), 8.0, 0.55, verb=0.3)
for at, up in ((10.3, True), (11.98, True)):   # the Heirloom's jump back to 1844, and the cut to the finale
    add(whoosh(0.8, up), at - 0.4, 0.55, pan=-0.6 if up else 0.6, verb=0.4)
    add(bell(hz(86), 1.4), at, 0.08, verb=1.0)
for k, at in enumerate((12.59, 12.98, 13.75, 14.14)):   # Engine No. 1 hopping centuries: 1937, 2026, 1989, 1791
    add(whoosh(0.4, k % 2 == 0), at - 0.25, 0.4, pan=(-0.5, 0.5)[k % 2], verb=0.4)
    add(impact(0.8, 0.6), at, 0.3)
    add(bell(hz((86, 81, 84, 79)[k]), 1.2), at, 0.07, verb=1.0)
add(siren(1.6), 10.6, 0.25, pan=0.5, verb=0.3)
# build to the drop: snare roll into silence, then the hit
roll = np.zeros(int(SR * 1.0))
for k in range(24):
    s = snare(0.2 + 0.8 * k / 24)
    i0 = int(k * SR / 24)
    roll[i0:i0 + len(s)] += s[: len(roll) - i0]
add(roll, 13.9, 0.5, verb=0.3)
add(riser(1.35, 300, 12000), 13.75, 0.5)

# =========================================================
# 4. THE CALL  (15.0 - 20.0)  D major at last
# =========================================================
add(impact(3.5, 1.2), 15.0, 1.0, verb=0.6)
add(reverse_swell(0.6), 14.42, 0.5)
add(pad([38, 50, 57, 62, 66, 69], 5.0, cutoff=2600, attack=0.25, release=1.4, detune=0.1), 15.0, 0.75, verb=0.7)   # D major, wide
add(pad([26, 38], 5.0, cutoff=300, attack=0.05, release=1.5), 15.0, 0.6)
# bells climbing, the family coming back one name at a time
for i, m in enumerate([74, 78, 81, 86, 83, 85, 86]):
    add(bell(hz(m), 3.0), 15.6 + i * 0.36, 0.2 - 0.01 * i, pan=-0.5 + i / 6, verb=0.8)
for i, m in enumerate([62, 66, 69, 74]):   # a soft rising pluck figure underneath
    add(pluck(hz(m), 1.2, 0.35), 16.0 + i * 0.5, 0.25, verb=0.6)
add(pad([45, 57, 61, 64, 69], 1.6, cutoff=2400, attack=0.4, release=1.0), 17.6, 0.35, verb=0.7)   # A: wanting home
add(pad([38, 50, 54, 57, 62, 66], 2.0, cutoff=3000, attack=0.15, release=1.6), 18.2, 0.55, verb=0.8)   # home: D major
add(bell(hz(74), 2.5), 18.2, 0.25, verb=0.9)
add(bell(hz(81), 2.5), 18.2, 0.12, verb=0.9)
add(kick(0.8), 18.2, 0.6)

# ---------------- reverb, mixdown, mastering ----------------
ir_len = int(SR * 2.4)
tt = np.arange(ir_len) / SR
ir = rng.standard_normal((ir_len, 2)) * np.exp(-tt * 2.8)[:, None]
ir = lp(ir, 6000)
wet = np.stack([signal.fftconvolve(verb_send[:, c], ir[:, c])[:N] for c in range(2)], 1)
wet /= np.max(np.abs(wet)) + 1e-9
out = mix + wet * 0.35 * np.max(np.abs(mix))
out = hp(out, 25)
fade = np.ones(N)
fade[-int(SR * 0.6):] = np.linspace(1, 0, int(SR * 0.6)) ** 1.5
out *= fade[:, None]
out /= np.max(np.abs(out)) + 1e-9
out = np.tanh(out * 1.6) / np.tanh(1.6)   # gentle saturation as a limiter
out *= 0.93
wavfile.write(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', SR, (out * 32767).astype(np.int16))
print('wrote', DUR, 's')
