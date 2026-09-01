"""
SWARAKSHA — Video Processor Module
Optimized video sampling with frame grabbing acceleration and smart scaling.
"""

import cv2
import os
import numpy as np


def extract_video_metadata(video_path: str) -> dict:
    """
    Extracts metadata from a video file using OpenCV.
    
    Args:
        video_path (str): The path to the video file.
        
    Returns:
        dict: Metadata containing width, height, fps, total_frames, duration.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found at {video_path}")
        
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise ValueError(f"Could not open video file {video_path}")
        
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if fps > 0:
        duration = total_frames / fps
    else:
        duration = 0.0
        
    capture.release()
    
    return {
        "width": width,
        "height": height,
        "fps": fps,
        "total_frames": total_frames,
        "duration": round(duration, 2)
    }


def sample_video_frames(video_path: str, interval_sec: float = 2.0, max_dim: int = 720):
    """
    Yields sampled frames from a video at a specified interval.
    Uses fast frame grabbing to skip unnecessary decodes and auto-resizes to 720p for fast AI inference.
    
    Args:
        video_path (str): The path to the video file.
        interval_sec (float): The interval in seconds to sample frames.
        max_dim (int): Maximum height/width for sampled frames (default 720 for optimal speed/accuracy).
        
    Yields:
        dict: A dictionary containing frame_number, timestamp, and the frame as a numpy array.
    """
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise ValueError(f"Could not open video file {video_path}")
        
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    if fps <= 0:
        fps = 30.0 # fallback
        
    sample_every_n_frames = max(1, int(round(fps * interval_sec)))
    frame_index = 0
    
    while True:
        # Fast grab: avoid decoding frames that won't be sampled
        if frame_index % sample_every_n_frames != 0:
            grabbed = capture.grab()
            if not grabbed:
                break
            frame_index += 1
            continue

        ok, frame = capture.read()
        if not ok or frame is None:
            break
            
        timestamp = frame_index / fps

        # Fast downscale if video is 1080p / 4K
        h, w = frame.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / float(max(h, w))
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        yield {
            "frame_number": frame_index,
            "timestamp": round(timestamp, 2),
            "frame": frame
        }
        frame_index += 1
        
    capture.release()
