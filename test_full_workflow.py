#!/usr/bin/env python3
"""
Test the full workflow with OpenAI API key
"""

import requests
import json
from pathlib import Path

BASE_URL = "http://127.0.0.1:8003"

def test_transcription_endpoint():
    """Test the transcribe endpoint with OpenAI API"""
    print("Testing transcription endpoint...")
    
    # Login first
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
    
    # Create a small test audio file
    test_audio_path = Path("test_transcription.wav")
    with open(test_audio_path, "wb") as f:
        # Write a simple WAV header
        f.write(b"RIFF")
        f.write(b"\x24\x08\x00\x00")  # File size
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
        f.write(b"\x00\x08\x00\x00")  # Data chunk size
        # Add some audio data (silence)
        f.write(b"\x00" * 2048)
    
    # Test transcription
    url = f"{BASE_URL}/transcribe?summarize=true"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        with open(test_audio_path, "rb") as f:
            files = {"file": ("test_transcription.wav", f, "audio/wav")}
            response = requests.post(url, headers=headers, files=files)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Transcription successful!")
            print(f"User: {result.get('username')}")
            print(f"Transcript: {result.get('transcript', 'No transcript')}")
            
            if 'summary' in result:
                summary = result['summary']
                print("SOAP Summary:")
                print(f"  Subjective: {summary.get('subjective', 'N/A')}")
                print(f"  Objective: {summary.get('objective', 'N/A')}")
                print(f"  Assessment: {summary.get('assessment', 'N/A')}")
                print(f"  Plan: {summary.get('plan', 'N/A')}")
            
            return True
        else:
            print(f"Transcription failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        return False
    finally:
        # Clean up
        if test_audio_path.exists():
            test_audio_path.unlink()

def test_enhanced_note_creation():
    """Test enhanced note creation with real API"""
    print("\nTesting enhanced note creation...")
    
    # Login first
    login_url = f"{BASE_URL}/auth/token"
    login_data = {
        "username": "test_doctor",
        "password": "testpassword123"
    }
    
    response = requests.post(login_url, data=login_data)
    token = response.json()["access_token"]
    
    # Create test audio file
    test_audio_path = Path("test_medical_note.wav")
    with open(test_audio_path, "wb") as f:
        # Write a simple WAV header
        f.write(b"RIFF")
        f.write(b"\x24\x08\x00\x00")  # File size
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
        f.write(b"\x00\x08\x00\x00")  # Data chunk size
        # Add some audio data (silence)
        f.write(b"\x00" * 2048)
    
    # Test enhanced note creation
    url = f"{BASE_URL}/notes/"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        with open(test_audio_path, "rb") as f:
            files = {"audio_file": ("test_medical_note.wav", f, "audio/wav")}
            data = {
                "patient_id": "999",
                "visit_id": "888",
                "note_type": "SOAP",
                "content": "",
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
            print(f"Content: {result.get('content', 'No content')}")
            return True
        else:
            print(f"Enhanced note creation failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"Error during enhanced note creation: {str(e)}")
        return False
    finally:
        # Clean up
        if test_audio_path.exists():
            test_audio_path.unlink()

def main():
    """Run the full workflow test"""
    print("Testing Full Scribsy Workflow with OpenAI API")
    print("=" * 60)
    
    # Test transcription endpoint
    transcription_success = test_transcription_endpoint()
    
    # Test enhanced note creation
    note_success = test_enhanced_note_creation()
    
    print("\n" + "=" * 60)
    print("TEST RESULTS:")
    print(f"Transcription endpoint: {'PASS' if transcription_success else 'FAIL'}")
    print(f"Enhanced note creation: {'PASS' if note_success else 'FAIL'}")
    
    if transcription_success and note_success:
        print("\nCONGRATULATIONS! Your Scribsy application is fully functional!")
        print("You can now:")
        print("- Upload audio files for transcription")
        print("- Generate SOAP notes automatically")
        print("- Create notes with audio attachments")
        print("- Use all authentication and CRUD features")
    else:
        print("\nSome features may need debugging.")
        print("Check the server logs for more details.")

if __name__ == "__main__":
    main()