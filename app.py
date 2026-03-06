from flask import Flask, render_template, send_from_directory


app = Flask(__name__)


@app.route("/")
def home() -> str:
    return render_template("home.html")


@app.route("/flappy")
def flappy() -> str:
    return render_template("flappy.html")


@app.route("/block-blast")
def block_blast() -> str:
    return render_template("block_blast.html")


@app.route("/driving")
def driving() -> str:
    return render_template("driving.html")


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(app.static_folder, "favicon.svg", mimetype="image/svg+xml")


if __name__ == "__main__":
    app.run(debug=True)