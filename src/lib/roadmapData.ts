/**
 * The complete Signal build-and-run process, in order, in one place.
 * Rendered as an interactive checklist in the Roadmap tab.
 */

export interface Step {
  id: string;
  text: string;
  cmd?: string;
  go?: string; // "where to go" for this step
  note?: string;
}

export interface Phase {
  id: string;
  num: string;
  title: string;
  where: string;
  steps: Step[];
}

export const PHASES: Phase[] = [
  {
    id: "p0",
    num: "00",
    title: "Set up your workspace",
    where: "Your computer",
    steps: [
      { id: "p0-1", text: "Open a Terminal window", go: "macOS: Spotlight → “Terminal” · Windows: Start → “Windows Terminal”", note: "Keep this window open the whole time." },
      { id: "p0-2", text: "Create the project folder and enter it", cmd: "mkdir music-analyzer && cd music-analyzer" },
      { id: "p0-3", text: "Open the folder in your code editor", cmd: "code .", go: "Any editor works — VS Code, Cursor, Sublime…" },
      { id: "p0-4", text: "Create two subfolders: backend/ and frontend/" },
    ],
  },
  {
    id: "p1",
    num: "01",
    title: "Install the tools",
    where: "Terminal + a browser for downloads",
    steps: [
      { id: "p1-1", text: "Check you have Python 3.10 or newer", cmd: "python3 --version", go: "Missing or old? → python.org/downloads", note: "On Windows the command may be “py --version”." },
      { id: "p1-2", text: "Install FFmpeg (needed for MP3 / M4A / OGG decoding)", go: "macOS: brew.sh first, then the command below · Windows: ffmpeg.org → add to PATH · Linux: your package manager", cmd: "brew install ffmpeg", note: "Linux: sudo apt install ffmpeg" },
      { id: "p1-3", text: "Restart the Terminal after installing", note: "So the new tools are on your PATH." },
    ],
  },
  {
    id: "p2",
    num: "02",
    title: "Add the project files",
    where: "Your code editor",
    steps: [
      { id: "p2-1", text: "In backend/, place the corrected files: main.py · audio_analysis.py · lyrics_analysis.py · report.py · transcription.py · requirements.txt" },
      { id: "p2-2", text: "Verify the fixes landed: “from __future__ import annotations”, “0.693”, “if __name__ == \"__main__\":”, and trimmed keys like \"tempo\" (no trailing spaces)" },
      { id: "p2-3", text: "In frontend/, place index.html (or use this Signal workbench instead)" },
    ],
  },
  {
    id: "p3",
    num: "03",
    title: "Build the Python environment",
    where: "Terminal — inside backend/",
    steps: [
      { id: "p3-1", text: "Go into the backend folder", cmd: "cd backend" },
      { id: "p3-2", text: "Create a virtual environment", cmd: "python3 -m venv venv" },
      { id: "p3-3", text: "Activate it", cmd: "source venv/bin/activate", note: "Windows: venv\\Scripts\\activate — your prompt should now show (venv)." },
      { id: "p3-4", text: "Install the backend dependencies", cmd: "pip install -r requirements.txt" },
      { id: "p3-5", text: "Optional: install vocal transcription support", cmd: "pip install faster-whisper", note: "Only needed for “No lyrics — transcribe vocals” to work." },
    ],
  },
  {
    id: "p4",
    num: "04",
    title: "Start the backend",
    where: "Terminal 1 — leave it running",
    steps: [
      { id: "p4-1", text: "Make sure you’re in backend/ with (venv) active" },
      { id: "p4-2", text: "Start the API server", cmd: "uvicorn main:app --reload --port 8000" },
      { id: "p4-3", text: "Health-check it", go: "Browser → http://localhost:8000/api/health", note: "You should see {\"status\":\"ok\"}" },
    ],
  },
  {
    id: "p5",
    num: "05",
    title: "Start the frontend",
    where: "Terminal 2 — a second window",
    steps: [
      { id: "p5-1", text: "Open a second Terminal, go to the project, then into frontend/", cmd: "cd music-analyzer/frontend" },
      { id: "p5-2", text: "Serve the page locally", cmd: "python3 -m http.server 3000" },
      { id: "p5-3", text: "Open the app", go: "Browser → http://localhost:3000" },
      { id: "p5-4", text: "Or skip this folder entirely: switch this Signal workbench to BACKEND mode with endpoint http://localhost:8000" },
    ],
  },
  {
    id: "p6",
    num: "06",
    title: "Test in this exact order",
    where: "The app in your browser",
    steps: [
      { id: "p6-1", text: "Test 1 — no audio, no lyrics → expect an explicit “unavailable” report, not a crash" },
      { id: "p6-2", text: "Test 2 — audio only → expect BPM, key, structure, energy, texture" },
      { id: "p6-3", text: "Test 3 — audio + pasted lyrics → also expect rhyme, flow and hook metrics" },
      { id: "p6-4", text: "Test 4 — tick “transcribe vocals” → works if faster-whisper is installed, otherwise a clear transcription_error (first run downloads a model — wait, then retry)" },
      { id: "p6-5", text: "Use a small WAV / MP3 / FLAC file under 50 MB for the first pass" },
    ],
  },
  {
    id: "p7",
    num: "07",
    title: "Troubleshooting",
    where: "Back to the terminals",
    steps: [
      { id: "p7-1", text: "Backend won’t start → confirm (venv) is active and re-run", cmd: "pip install -r requirements.txt" },
      { id: "p7-2", text: "Port 8000 busy → run on another port and point the frontend at it", cmd: "uvicorn main:app --reload --port 8001" },
      { id: "p7-3", text: "Port 3000 busy → serve the frontend elsewhere", cmd: "python3 -m http.server 4000" },
      { id: "p7-4", text: "MP3 / M4A upload fails → install FFmpeg, restart Terminal, restart the backend" },
      { id: "p7-5", text: "Frontend can’t reach the API → check window.MUSIC_ANALYZER_API in index.html matches the port" },
      { id: "p7-6", text: "Done for the day → press Ctrl + C in each Terminal to stop the servers" },
    ],
  },
  {
    id: "p8",
    num: "08",
    title: "Next build layer (after it runs)",
    where: "This workbench + the backend",
    steps: [
      { id: "p8-1", text: "Repetition-aware section labeling — similarity matrix, real chorus/verse detection", note: "The timeline above is ready for it." },
      { id: "p8-2", text: "Hook panel v2 — combine repeated lyric fragments with repeated audio sections" },
      { id: "p8-3", text: "Background processing for long tracks (job queue + polling)" },
      { id: "p8-4", text: "Deployment prep — env vars, tighter CORS, upload limits, HTTPS" },
    ],
  },
];

export const TOTAL_STEPS = PHASES.reduce((n, p) => n + p.steps.length, 0);
