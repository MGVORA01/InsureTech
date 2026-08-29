import runpy
from pathlib import Path

if __name__ == "__main__":
    seed_file = Path(__file__).parent / "seed" / "seed.py"
    runpy.run_path(str(seed_file), run_name="__main__")
