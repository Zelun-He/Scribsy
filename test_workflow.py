#!/usr/bin/env python3
"""
Test script for end-to-end workflow: auth -> transcribe -> create note
"""

import requests
import json
import os
import time
from pathlib import Path

BASE_URL = "http://127.0.0.1:8002"  # Updated to use port 8002

def test_user_registration():
    """Test user registration"""
    print("Testing user registration...")
    
    url = f"{BASE_URL}/auth/register"
    data = {
        "username": "test_doctor",
        "password": "testpassword123"
    }
    
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        print("User registration successful")
        return response.json()
    elif response.status_code == 400 and "already registered" in response.text:
        print("User already exists, continuing...")
        return {"username": "test_doctor"}
    else:
        print(f"Registration failed: {response.text}")
        return None

def test_user_login():
    """Test user login and get JWT token"""
    print("\nTesting user login...")
    
    url = f"{BASE_URL}/auth/token"
    data = {
        "username": "test_doctor",
        "password": "testpassword123"
    }
    
    response = requests.post(url, data=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        token_data = response.json()
        print("Login successful")
        return token_data["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def create_test_audio_file():
    """Create a simple test audio file (mock)"""
    print("\nCreating test audio file...")
    
    test_audio_path = Path("test_audio.wav")
    # Create a simple mock audio file for testing
    with open(test_audio_path, "wb") as f:
        # Write a simple WAV header (mock)
        f.write(b"RIFF")
        f.write(b"\x00\x00\x00\x00")  # File size placeholder
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(b"\x10\x00\x00\x00")  # Format chunk size
        f.write(b"\x01\x00")  # Audio format (PCM)
        f.write(b"\x01\x00")  # Number of channels
        f.write(b"\x40\x1f\x00\x00")  # Sample rate (8000 Hz)
        f.write(b"\x80\x3e\x00\x00")  # Byte rate
        f.write(b"\x02\x00")  # Block align
        f.write(b"\x10\x00")  # Bits per sample
        f.write(b"data")
        f.write(b"\x00\x00\x00\x00")  # Data chunk size
        # Add some dummy audio data
        f.write(b"\x00" * 1000)
    
    print(f"Created test audio file: {test_audio_path}")
    return test_audio_path

def test_create_note(token):
    """Test creating a note with audio file"""
    print("\nTesting create note endpoint...")
    
    # Create test audio file
    audio_file = create_test_audio_file()
    
    url = f"{BASE_URL}/notes/"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        with open(audio_file, "rb") as f:
            files = {"audio_file": ("test_audio.wav", f, "audio/wav")}
            data = {
                "patient_id": "123",
                "visit_id": "456",
                "note_type": "SOAP",
                "content": "Test note content from workflow test",
                "status": "draft"
            }
            response = requests.post(url, headers=headers, files=files, data=data)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Note creation successful")
            print(f"Note ID: {result.get('id')}")
            print(f"Audio file: {result.get('audio_file')}")
            return result
        else:
            print(f"Note creation failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"Error during note creation: {str(e)}")
        return None
    finally:
        # Clean up test file
        if audio_file.exists():
            audio_file.unlink()

def test_get_notes(token):
    """Test getting list of notes"""
    print("\nTesting get notes endpoint...")
    
    url = f"{BASE_URL}/notes/"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        notes = response.json()
        print(f"Retrieved {len(notes)} notes")
        return notes
    else:
        print(f"Failed to get notes: {response.text}")
        return None

def main():
    """Run complete end-to-end test"""
    print("Starting end-to-end workflow test...")
    print("="*50)
    
    # Step 1: Register user
    user = test_user_registration()
    if not user:
        print("Test failed at registration")
        return
    
    # Step 2: Login and get token
    token = test_user_login()
    if not token:
        print("Test failed at login")
        return
    
    # Step 3: Create note with audio file
    note = test_create_note(token)
    if not note:
        print("Test failed at note creation")
        return
    
    # Step 4: Retrieve notes
    notes = test_get_notes(token)
    if notes is None:
        print("Test failed at note retrieval")
        return
    
    print("\n" + "="*50)
    print("SUCCESS: End-to-end workflow test completed!")
    print(f"User registered/logged in")
    print(f"Note created with ID: {note.get('id')}")
    print(f"Audio file attached: {note.get('audio_file')}")
    print(f"Retrieved {len(notes)} notes")

if __name__ == "__main__":
    main()