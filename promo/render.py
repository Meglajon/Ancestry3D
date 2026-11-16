# Renders compose.html a frame at a time and joins the frames to the music with ffmpeg.
#   python promo/render.py <footage-dir> <music.wav> <out.mp4>              the whole 20 seconds
#   python promo/render.py <footage-dir> --stills <sheet.jpg> 30 90 ...     a contact sheet of chosen frames
#   add --v to either for the 9:16 phone cut
import asyncio, pathlib, subprocess, sys, tempfile
from playwright.async_api import async_playwright
import imageio_ffmpeg

HERE = pathlib.Path(__file__).resolve().parent
FRAMES = 600
# --v renders the 9:16 phone cut (1080x1920) instead of the 16:9 one
VERT = '--v' in sys.argv
ARGS = [a for a in sys.argv if a != '--v']
SIZE = (1080, 1920) if VERT else (1920, 1080)


async def render(footage, frames, out_dir):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--allow-file-access-from-files'])
        page = await (await b.new_context(viewport={'width': SIZE[0], 'height': SIZE[1]})).new_page()
        page.on('pageerror', lambda e: print('PAGEERROR', e))
        page.on('console', lambda m: print('console', m.text) if m.type == 'error' else None)
        await page.goto((HERE / 'compose.html').as_uri() + '?base=' + pathlib.Path(footage).resolve().as_uri() + '/' + ('&v=1' if VERT else ''))
        await page.evaluate('window.ready')
        paths = []
        for n in frames:
            await page.evaluate(f'renderFrame({n})')
            path = out_dir / f'{n:05d}.png'
            await page.screenshot(path=str(path))
            paths.append(path)
            if n % 60 == 0: print('frame', n, flush=True)
        await b.close()
        return paths


def main():
    footage = ARGS[1]
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    if ARGS[2] == '--stills':
        from PIL import Image
        sheet, nums = ARGS[3], [int(x) for x in ARGS[4:]]
        with tempfile.TemporaryDirectory() as d:
            paths = asyncio.run(render(footage, nums, pathlib.Path(d)))
            tw, th = (360, 640) if VERT else (960, 540)
            cols = min(len(paths), 5 if VERT else 2)
            rows = (len(paths) + cols - 1) // cols
            c = Image.new('RGB', (tw * cols, th * rows))
            for i, pth in enumerate(paths): c.paste(Image.open(pth).convert('RGB').resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
            c.save(sheet, quality=88)
        return
    music, out = ARGS[2], ARGS[3]
    frames_dir = pathlib.Path(out).parent / ('frames_v' if VERT else 'frames')
    frames_dir.mkdir(parents=True, exist_ok=True)
    asyncio.run(render(footage, range(FRAMES), frames_dir))
    subprocess.run([ff, '-y', '-framerate', '30', '-i', str(frames_dir / '%05d.png'), '-i', music,
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
    print('wrote', out)


main()
