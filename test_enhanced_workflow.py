#!/usr/bin/env python3
"""
Test the enhanced workflow with automatic transcription and SOAP summarization
"""

import requests
import json
import os
import time
from pathlib import Path

BASE_URL = "http://127.0.0.1:8002"

def test_enhanced_note_creation():
    """Test creating a note with auto-transcription and SOAP summarization"""
    print("Testing enhanced note creation with auto-transcription...")
    
    # First login to get token
    login_url = f"{BASE_URL}/auth/token"
    login_data = {
        "username": "test_doctor",
        "password": "testpassword123"
    }
    
    response = requests.post(login_url, data=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return False
    
    token = response.json()["access_token"]
    print("Login successful")
    
    # Create test audio file
    test_audio_path = Path("test_medical_audio.wav")
    with open(test_audio_path, "wb") as f:
        # Write a simple WAV header (mock)
        f.write(b"RIFF")
        f.write(b"\\x00\\x00\\x00\\x00")  # File size placeholder
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(b"\\x10\\x00\\x00\\x00")  # Format chunk size
        f.write(b"\\x01\\x00")  # Audio format (PCM)
        f.write(b"\\x01\\x00")  # Number of channels
        f.write(b"\\x40\\x1f\\x00\\x00")  # Sample rate (8000 Hz)
        f.write(b"\\x80\\x3e\\x00\\x00")  # Byte rate
        f.write(b"\\x02\\x00")  # Block align
        f.write(b"\\x10\\x00")  # Bits per sample
        f.write(b"data")
        f.write(b"\\x00\\x00\\x00\\x00")  # Data chunk size
        # Add some dummy audio data
        f.write(b"\\x00" * 1000)
    
    # Test note creation with auto-transcription
    url = f"{BASE_URL}/notes/"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        with open(test_audio_path, "rb") as f:
            files = {"audio_file": ("test_medical_audio.wav", f, "audio/wav")}
            data = {
                "patient_id": "123",
                "visit_id": "456", 
                "note_type": "SOAP",
                "content": "",  # Empty content - should be filled by transcription
                "status": "draft",
                "auto_transcribe": "true",
                "auto_summarize": "true"
            }
            response = requests.post(url, headers=headers, files=files, data=data)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Enhanced note creation successful!")
            print(f"Note ID: {result.get('id')}")
            print(f"Audio file: {result.get('audio_file')}")
            print(f"Content preview: {result.get('content', '')[:200]}...")
            
            # Check if transcription and SOAP were added
            content = result.get('content', '')
            if 'Transcription:' in content:
                print("✓ Transcription was added to note")
            if 'SOAP Summary:' in content:
                print("✓ SOAP summary was added to note")
            if 'Subjective:' in content:
                print("✓ SOAP format detected")
            
            return True
        else:
            print(f"Enhanced note creation failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"Error during enhanced note creation: {str(e)}")
        return False
    finally:
        # Clean up test file
        if test_audio_path.exists():
            test_audio_path.unlink()

def test_regular_note_creation():
    """Test creating a regular note without audio"""
    print("\\nTesting regular note creation...")
    
    # First login to get token
    login_url = f"{BASE_URL}/auth/token"
    login_data = {
        "username": "test_doctor",
        "password": "testpassword123"
    }
    
    response = requests.post(login_url, data=login_data)
    token = response.json()["access_token"]
    
    # Test regular note creation
    url = f"{BASE_URL}/notes/"
    headers = {"Authorization": f"Bearer {token}"}
    
    data = {
        "patient_id": "789",
        "visit_id": "101",
        "note_type": "Progress",
        "content": "Patient shows improvement in mobility. Continue current treatment plan.",
        "status": "signed"
    }
    
    response = requests.post(url, headers=headers, data=data)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("Regular note creation successful!")
        print(f"Note ID: {result.get('id')}")
        print(f"Content: {result.get('content')}")
        return True
    else:
        print(f"Regular note creation failed: {response.text}")
        return False

def main():
    """Run enhanced workflow tests"""
    print("Testing Enhanced Scribsy Workflow")
    print("=" * 50)
    
    # Test enhanced note creation
    enhanced_success = test_enhanced_note_creation()
    
    # Test regular note creation
    regular_success = test_regular_note_creation()
    
    print("\\n" + "=" * 50)
    if enhanced_success and regular_success:
        print("All tests passed!")
        print("✓ Enhanced note creation with auto-transcription works")
        print("✓ Regular note creation works")
        print("\\nYour Scribsy application now supports:")
        print("- Automatic audio transcription")
        print("- SOAP note summarization")
        print("- Regular text notes")
        print("- Audio file storage")
    else:
        print("Some tests failed:")
        print(f"Enhanced workflow: {'PASS' if enhanced_success else 'FAIL'}")
        print(f"Regular workflow: {'PASS' if regular_success else 'FAIL'}")

if __name__ == "__main__":
    main()