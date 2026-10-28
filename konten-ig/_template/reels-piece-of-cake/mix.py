import subprocess, pathlib
here = pathlib.Path(__file__).resolve().parent
B = lambda k: 0.39 + 0.6735 * k
DUR = 35.6
# (file, onset offset in file, gain, max length)
SFX = {'pop': ('sfx/pop.mp3', 0.196, 0.55, 0.6), 'whoosh': ('sfx/whoosh.mp3', 0.25, 0.6, 0.6),
       'bite': ('sfx/bite.mp3', 0.052, 0.9, 0.4), 'ding': ('sfx/ding.mp3', 0.063, 0.8, 1.6),
       'thud': ('sfx/thud.mp3', 0.331, 0.6, 0.9)}
EVENTS = [('pop', B(0)), ('pop', B(1)), ('pop', B(2)), ('pop', B(4)), ('pop', B(6)),
          ('whoosh', B(10)), ('thud', B(11)), ('pop', B(13)),
          ('bite', B(14.5)), ('bite', B(15)), ('bite', B(15.5)),
          ('thud', B(17)), ('whoosh', B(23)), ('pop', B(24)), ('ding', B(26)),
          ('whoosh', B(31)), ('pop', B(34)), ('pop', B(35)), ('pop', B(36)), ('pop', B(37)), ('pop', B(38)),
          ('ding', B(39)), ('pop', B(40)),
          ('whoosh', B(44)), ('thud', B(45)), ('pop', B(47))]
inputs = ['-i', str(here / 'music.mp3')]
filt = ['[0:a]atrim=0:%.2f,volume=0.8,afade=t=out:st=%.2f:d=1[m]' % (DUR, DUR - 1)]
labels = ['[m]']
for i, (name, t) in enumerate(EVENTS, 1):
    f, on, g, ln = SFX[name]
    inputs += ['-i', str(here / f)]
    d = max(0, int((t - on) * 1000))
    filt.append(f'[{i}:a]atrim=0:{ln},afade=t=out:st={ln-0.15}:d=0.15,volume={g},aformat=channel_layouts=stereo,adelay={d}|{d}[s{i}]')
    labels.append(f'[s{i}]')
filt.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0,alimiter=limit=0.95[out]')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(filt),
                '-map', '[out]', '-t', str(DUR), '-ar', '44100', str(here / 'mix.wav')], check=True)
print('ok')
