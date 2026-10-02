# 🎥 10–30 Second Demo Video Recording Guide

The internship assignment asks for:
> *"A 10–30 second demo video showcasing the application's key features"*

Here is a 20-second screen-recording script:

---

### Step-by-Step Recording Script (Total: 22 Seconds)

1. **[00:00 - 00:04] Upload Datasets & Dashboard**
   - Click **"📥 Load Sample Datasets"** in the sidebar.
   - Show the green notification and the active table catalog showing `sales_data` (25 rows) and `customers` (9 rows).

2. **[00:04 - 00:09] Executive Dashboard Tab**
   - Switch to the **"📊 Executive Dashboard & Quality Audit"** tab.
   - Scroll briefly across the KPI cards (Total Records, Completeness 100%, Total Revenue), the Revenue by Region bar chart, and the Data Quality Audit card.

3. **[00:09 - 00:15] Natural Language Q&A & Forecasting**
   - Switch back to the **"💬 Conversational Analyst"** tab.
   - Click the **"🔮 Forecast Sales"** button (or type *"Forecast revenue for next 3 months"*).
   - Show the interactive Plotly forecast chart with historical actuals, dashed projection, and shaded 95% confidence intervals.

4. **[00:15 - 00:20] Anomaly Detection & Execution Transparency**
   - Click the **"🚨 Detect Anomalies"** button.
   - Scroll to show the detected anomaly row ($114,000 enterprise outlier with Tukey's fence explanation).
   - Expand the **"⚙️ Execution Trace & Methodology"** drawer to show the transparent 7-step lifecycle log and generated SQL.

5. **[00:20 - 00:22] Export Report**
   - Click **"📄 Export Executive Report (HTML)"** in the sidebar to download the styled summary report.

---

### Free Tools to Record the Video on Linux:
- **OBS Studio**: `sudo apt install obs-studio` or flatpak.
- **SimpleScreenRecorder**: `simplescreenrecorder`
- **GNOME / KDE Screen Recorder**: Press `Ctrl + Alt + Shift + R` or `Super` screen capture tool.
