"""
Simple test file for basic app functionality
"""
import pytest
from fastapi.testclient import TestClient
from app import app

def test_health_check():
    """Test that the health endpoint works"""
    with TestClient(app) as client:
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.text == "ok"

def test_cors_headers():
    """Test that CORS headers are properly set"""
    with TestClient(app) as client:
        response = client.get("/healthz", headers={"Origin": "https://dogyenta.com"})
        assert response.status_code == 200
        
        # Check for CORS headers
        headers = response.headers
        assert "access-control-allow-origin" in str(headers).lower()
        
def test_app_import():
    """Test that the app can be imported without errors"""
    from app import app as test_app
    assert test_app is not None
    
def test_main_import():
    """Test that main module can be imported"""
    from main import fetch_all_animals, search_animals, get_animal_by_id
    assert callable(fetch_all_animals)
    assert callable(search_animals) 
    assert callable(get_animal_by_id)
