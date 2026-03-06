# Flask Arcade

A small Flask arcade with two browser games:

- Flappy Flask: a Flappy Bird clone rendered on a canvas
- Block Blast Lite: an 8x8 block puzzle with row and column clears

## Run

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000` in your browser.

## Games

- `/` arcade home screen
- `/flappy` Flappy Flask
- `/block-blast` Block Blast Lite

## Controls

- Flappy Flask:
	`Space`, `Arrow Up`, or mouse/tap to flap, `R` to restart
- Block Blast Lite:
	click a piece, then click the board to place it, `R` or the restart button to reset