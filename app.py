import json
import os
import random
from pathlib import Path
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Load quotes from JSON file
BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "quotes.json"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    QUOTES = json.load(f)


def filter_quotes(author=None, category=None, query=None):
    results = QUOTES
    if author:
        author_lower = author.strip().lower()
        results = [
            q for q in results
            if author_lower in q["author"].lower()
        ]
    if category:
        cat_lower = category.strip().lower()
        results = [
            q for q in results
            if q["category"].lower() == cat_lower
        ]
    if query:
        q_lower = query.strip().lower()
        results = [
            q for q in results
            if q_lower in q["quote"].lower() or q_lower in q["author"].lower()
        ]
    return results


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/quotes/random")
def get_random_quote():
    author = request.args.get("author")
    category = request.args.get("category")
    matches = filter_quotes(author=author, category=category)
    if not matches:
        return jsonify({"error": "No quotes found matching criteria"}), 404
    return jsonify(random.choice(matches))


@app.route("/api/quotes")
def get_quotes():
    author = request.args.get("author")
    category = request.args.get("category")
    q = request.args.get("q")
    matches = filter_quotes(author=author, category=category, query=q)
    return jsonify({
        "count": len(matches),
        "quotes": matches
    })


@app.route("/api/categories")
def get_categories():
    categories = sorted(list({q["category"] for q in QUOTES}))
    return jsonify(categories)


@app.route("/api/authors")
def get_authors():
    authors = sorted(list({q["author"] for q in QUOTES}))
    return jsonify(authors)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
