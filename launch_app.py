"""
EngineerHub Universal Desktop Launcher
Starts FastAPI backend and launches Electron desktop window concurrently.
"""

import os
import sys
import subprocess
import time
import signal

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")

    print("=" * 60)
    print("       EngineerHub — DME Technical Office Management")
    print("=" * 60)
    print("\n[*] Starting Backend API (Uvicorn / FastAPI)...")

    # Start FastAPI backend
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=root_dir,
    )

    time.sleep(1.5)

    print("[*] Launching Electron Desktop Window...")
    try:
        # Start Electron Next.js desktop app
        subprocess.run(
            ["npm.cmd" if sys.platform == "win32" else "npm", "run", "desktop"],
            cwd=frontend_dir,
            check=True,
        )
    except KeyboardInterrupt:
        print("\n[*] Shutting down...")
    finally:
        print("[*] Terminating backend server...")
        backend_proc.terminate()
        backend_proc.wait()
        print("[+] Application closed cleanly.")

if __name__ == "__main__":
    main()
