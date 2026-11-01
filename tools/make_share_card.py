"""Share card of the personal site (og:image / twitter:image, 1200x630): photo, name, one line, the address.
Drawn as a small HTML page in the site's colours and font stack, photographed by headless Firefox, saved as
MyPage/static/img/share-card.jpg (config.yml params.images).

    PYTHONPATH=<selenium lib> python3 make_share_card.py
"""
import base64, io, os
from PIL import Image
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..")
PHOTO = os.path.join(SITE, "assets", "my_profile_square.jpg")
OUT = os.path.join(SITE, "static", "img", "share-card.jpg")

photo = base64.b64encode(open(PHOTO, "rb").read()).decode()
page = """<!doctype html><meta charset="utf-8"><style>
html, body { margin: 0; background: #fff; }
.card { position: relative; width: 1200px; height: 630px; box-sizing: border-box; background: #f5f5f5; color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        display: flex; align-items: center; gap: 56px; padding: 0 80px 70px; }
.photo { flex: none; width: 280px; height: 280px; border-radius: 50%; border: 6px solid #fff; object-fit: cover; }
h1 { margin: 0; font-size: 64px; white-space: nowrap; line-height: 1.05; font-weight: 700; letter-spacing: -0.01em; }
.greek { margin: 10px 0 0; color: #5b6b80; font-size: 30px; }
.line { margin: 34px 0 0; font-size: 34px; line-height: 1.3; }
.bar { position: absolute; left: 0; right: 0; bottom: 0; height: 70px; background: #1e3a8a; color: #fff;
       display: flex; align-items: center; padding: 0 80px; font-size: 26px; letter-spacing: 0.02em; }
</style>
<div class="card" id="card">
  <img class="photo" src="data:image/jpeg;base64,PHOTO" alt="">
  <div>
    <h1>Florias Papadopoulos</h1>
    <p class="greek">Φλωριάς Παπαδόπουλος</p>
    <p class="line">Cryptography researcher,<br>University of St. Gallen</p>
  </div>
  <div class="bar">florias-papadopoulos.github.io</div>
</div>""".replace("PHOTO", photo)

o = Options(); o.add_argument("-headless")
d = webdriver.Firefox(options=o, service=Service("/snap/bin/geckodriver"))
try:
    d.set_window_size(1400, 900)
    d.get("about:blank")      # the snap Firefox cannot open files under /tmp: write the page in instead
    d.execute_script("document.open(); document.write(arguments[0]); document.close();", page)
    d.execute_script("return document.fonts.ready.then(function () { return document.querySelector('.photo').decode(); })")
    png = d.find_element(By.ID, "card").screenshot_as_png
finally:
    d.quit()
img = Image.open(io.BytesIO(png)).convert("RGB")
assert img.size == (1200, 630), img.size
img.save(OUT, quality=90, optimize=True, progressive=True)
print(OUT, img.size, os.path.getsize(OUT), "bytes")
