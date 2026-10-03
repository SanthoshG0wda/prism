# 🎥 10–30 Second Demo Video Recording Guide (React SPA + FastAPI)

The internship assignment asks for:
> *"A 10–30 second demo video showcasing the application's key features"*

App entry: `http://localhost:8000` (FastAPI serves the built React SPA;
`http://localhost:5173` in Vite dev mode). Sessions start **empty** per the
assignment — upload a CSV via the paperclip button (or click **"load sample
datasets"** for the bundled `sales_data` / `customers` samples, explicit opt-in
only, never auto-loaded); each browser gets an isolated session
via `X-Session-Id`.

Here is a 20-second screen-recording script:

---

### Step-by-Step Recording Script (Total: 22 Seconds)

1. **[00:00 - 00:04] Upload Datasets & Catalog**
   - Upload a CSV with the paperclip button (or click **"load sample datasets"**
     for the bundled samples — explicit opt-in, nothing is pre-loaded).
   - Show the active-table indicator with row/column counts.

2. **[00:04 - 00:09] Executive Dashboard Artifact**
   - Ask *"Generate an Executive Dashboard"* in chat.
   - Show the Claude-style artifact panel: KPI cards, completeness score, automated breakdowns, quality audit.

3. **[00:09 - 00:15] Natural Language Q&A & Forecasting**
   - Type *"Forecast revenue for next 3 months"*.
   - Show the interactive Plotly forecast chart with historical actuals, dashed projection, and shaded 95% confidence intervals.

4. **[00:15 - 00:20] Anomaly Detection & Execution Transparency**
   - Ask *"Detect anomalies in revenue and explain why they were flagged."*
   - Scroll to show the flagged outlier row with Tukey-fence explanation.
   - Expand the thinking-process trace to show the 7-step lifecycle log and generated SQL/Pandas code.

5. **[00:20 - 00:22] Export Report**
   - Click the export/download action to open `/api/export-report` (HTML executive summary).

---

### Free Tools to Record the Video on Linux:
- **OBS Studio**: `sudo apt install obs-studio` or flatpak.
- **SimpleScreenRecorder**: `simplescreenrecorder`
- **GNOME / KDE Screen Recorder**: Press `Ctrl + Alt + Shift + R` or `Super` screen capture tool.
