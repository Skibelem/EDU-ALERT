import os
import sys

sys.path.append(os.path.dirname(__file__))

import uvicorn
from main import app

if __name__ == "__main__":
    print("Starting EDU-ALERT AI server on http://127.0.0.1:8000 ...", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
