import unittest
import requests
import os
import time

API_URL = "http://localhost:8000/api"

class TestVideoPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # We assume the server is running on localhost:8000
        pass

    def test_health_check(self):
        try:
            res = requests.get("http://localhost:8000/")
            self.assertEqual(res.status_code, 200)
        except requests.ConnectionError:
            self.skipTest("Backend server is not running on localhost:8000")

    def test_video_upload_validation(self):
        # Create a dummy text file and try to upload it as a video
        with open("dummy.txt", "w") as f:
            f.write("Not a video")
            
        with open("dummy.txt", "rb") as f:
            files = {"file": ("dummy.txt", f, "text/plain")}
            res = requests.post(f"{API_URL}/scan-video", files=files)
            
        os.remove("dummy.txt")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported video format", res.json()["detail"])

if __name__ == "__main__":
    unittest.main()
