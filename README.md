# Cat Arcade

A small Flask arcade with three browser games:

- Flappy Flask: a Flappy Bird clone rendered on a canvas
- Block Blast Lite: an 8x8 block puzzle with row and column clears
- Cat Dash Rally: a lane-based driving game with traffic dodging and score chasing

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
- `/driving` Cat Dash Rally

## Controls

- Flappy Flask:
	`Space`, `Arrow Up`, or mouse/tap to flap, `R` to restart
- Block Blast Lite:
	click a piece, then click the board to place it, `R` or the restart button to reset
- Cat Dash Rally:
	`A` / `D` or `Arrow Left` / `Arrow Right` to steer, `Enter` or click to start, `R` to reset