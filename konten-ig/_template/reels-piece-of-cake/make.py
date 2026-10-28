import sys, subprocess, pathlib, shutil
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent
mode = sys.argv[1]  # 'keys' or 'video'
RFPS, DUR = 60, 35.6  # render at 60 fps, blend pairs into 30 fps for motion blur
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    pg.goto(f'file://{here}/reel.html'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(500)
    if mode == 'keys':
        for t in [float(x) for x in sys.argv[2:]] or [4.47, 7.85, 10.55, 14.6]:
            pg.evaluate(f'render({t})'); pg.screenshot(path=str(here / f'key-{t}.png'))
    else:
        fr = here / 'frames'
        shutil.rmtree(fr, ignore_errors=True); fr.mkdir()
        for i in range(int(RFPS * DUR)):
            pg.evaluate(f'render({i / RFPS})')
            pg.screenshot(path=str(fr / f'{i:05d}.jpg'), type='jpeg', quality=93)
    b.close()
if mode == 'video':
    out = sys.argv[2]
    subprocess.run([sys.executable, str(here / 'mix.py')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(RFPS), '-i', str(here / 'frames/%05d.jpg'),
                    '-i', str(here / 'mix.wav'), '-vf', "tmix=frames=2:weights='1 1',fps=30",
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '160k', '-t', str(DUR), '-movflags', '+faststart', out], check=True)
print('ok')
