import json
from pathlib import Path
import pytest
from app import app, QUOTES


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_quotes_dataset_structure():
    assert len(QUOTES) == 100, f"Expected 100 quotes, found {len(QUOTES)}"
    
    seen_ids = set()
    for item in QUOTES:
        assert "id" in item and isinstance(item["id"], int)
        assert item["id"] not in seen_ids, f"Duplicate id: {item['id']}"
        seen_ids.add(item["id"])
        
        assert "quote" in item and isinstance(item["quote"], str) and len(item["quote"].strip()) > 0
        assert "author" in item and isinstance(item["author"], str) and len(item["author"].strip()) > 0
        assert "category" in item and isinstance(item["category"], str) and len(item["category"].strip()) > 0


def test_index_page(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"Timeless Quotes" in response.data
    assert b"quote-card" in response.data


def test_api_categories(client):
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) >= 5
    assert "Philosophy" in data
    assert "Science" in data
    assert data == sorted(data)


def test_api_authors(client):
    response = client.get("/api/authors")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) >= 20
    assert "Albert Einstein" in data
    assert "Socrates" in data
    assert data == sorted(data)


def test_api_random_quote(client):
    response = client.get("/api/quotes/random")
    assert response.status_code == 200
    data = response.get_json()
    assert "id" in data
    assert "quote" in data
    assert "author" in data
    assert "category" in data


def test_api_random_quote_with_filters(client):
    # Filter by category
    response = client.get("/api/quotes/random?category=Science")
    assert response.status_code == 200
    data = response.get_json()
    assert data["category"].lower() == "science"

    # Filter by author
    response = client.get("/api/quotes/random?author=Einstein")
    assert response.status_code == 200
    data = response.get_json()
    assert "Einstein" in data["author"]

    # Filter with no match
    response = client.get("/api/quotes/random?author=NonExistentAuthorXYZ")
    assert response.status_code == 404


def test_api_quotes_search_and_filter(client):
    # All quotes
    res = client.get("/api/quotes")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] == 100
    assert len(data["quotes"]) == 100

    # Search by author
    res = client.get("/api/quotes?author=Socrates")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] >= 1
    assert all("socrates" in q["author"].lower() for q in data["quotes"])

    # Filter by category
    res = client.get("/api/quotes?category=Philosophy")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] >= 1
    assert all(q["category"] == "Philosophy" for q in data["quotes"])

    # Search by keyword
    res = client.get("/api/quotes?q=wisdom")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] >= 1
    assert all("wisdom" in q["quote"].lower() or "wisdom" in q["author"].lower() for q in data["quotes"])

    # Combined filters
    res = client.get("/api/quotes?category=Science&author=Einstein")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] >= 1
    for q in data["quotes"]:
        assert q["category"] == "Science"
        assert "einstein" in q["author"].lower()
