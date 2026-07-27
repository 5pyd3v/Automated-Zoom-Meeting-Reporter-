<div align="center">

# 🎥 Zoom Meeting Reporter

### Turn Zoom transcripts into beautifully formatted meeting reports — automatically.

<p align="center">
  <strong>Upload ➜ Analyze ➜ Summarize ➜ Generate Word Report</strong>
</p>

<p align="center">
No Zoom API • No Browser Automation • No Database • Cross Platform
</p>

<p align="center">

![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)

</p>

---

<img width="100%" src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png">

</div>

# ✨ Overview

**Zoom Meeting Reporter** is a lightweight desktop application that transforms manually downloaded **Zoom transcript files** into a professionally formatted **Microsoft Word meeting report**.

Simply:

1. 📥 Download your Zoom transcript
2. 📂 Drag it into the application
3. ⏰ Select the meeting ending time
4. 🤖 Let AI generate the meeting summary
5. 📄 Instantly append everything to **Meetings.docx**

No APIs.

No browser automation.

No cloud storage.

Everything stays on your computer.

---

# 🚀 Features

## 📂 Smart Transcript Upload

- Drag & Drop support
- File picker support
- Upload one or multiple transcripts
- Automatic meeting detection

---

## 🧹 Clean Transcript Parsing

Automatically removes:

- WEBVTT headers
- Cue numbers
- Metadata
- Timestamps

Keeps only clean speaker-attributed conversation.

---

## ⏱ Automatic Start Time Calculation

Instead of guessing meeting duration, the application calculates it accurately.

It:

- Finds the first **Support** message
- Finds the transcript ending timestamp
- Calculates actual meeting duration
- Subtracts it from your entered ending time

Result:

✅ Accurate meeting start time

---

## 👤 Automatic Meeting Title

No manual typing required.

The application automatically uses:

> **First speaker who is NOT "Support"**

Example:

| Speaker Order | Result |
|---------------|--------|
| Support | Ignored |
| Roger | ✅ Meeting Title |
| TK | Ignored |
| Jaya | Ignored |

---

## 🤖 AI Meeting Summary

Powered by **Google Gemini**

Each meeting receives:

- Professional summary
- Discussion overview
- Important decisions
- Action items

Maximum **120 words** for readability.

---

## 📄 Word Report Generation

Every processed meeting is automatically appended into:

```
Meetings.docx
```

Nothing gets overwritten.

Previous meetings remain intact.

---

## 🌙 Beautiful Desktop Experience

✔ Dark Mode

✔ Responsive Layout

✔ Clean Interface

✔ Cross Platform

✔ Native Desktop Application

---

## 🛡 Robust Error Handling

The application gracefully handles:

- Invalid transcripts
- AI failures
- File write errors
- Missing information

Without crashing.

---

# 🖥 Tech Stack

| Technology | Purpose |
|------------|---------|
| Electron | Desktop Application |
| Node.js | Backend Runtime |
| JavaScript ES Modules | Application Logic |
| Google Gemini | AI Summaries |
| docx | Word Document Generation |
| dotenv | Environment Variables |

---

# 📁 Project Structure

```text
zoom-meeting-reporter/
│
├── src/
│   ├── main.js
│   ├── preload.js
│   │
│   ├── ui/
│   │   ├── index.html
│   │   ├── styles.css
│   │   ├── renderer.js
│   │   └── components/
│   │
│   ├── services/
│   │   ├── parser/
│   │   ├── gemini/
│   │   └── word/
│   │
│   └── utils/
│
├── assets/
├── .env.example
├── package.json
└── README.md
```

---

# ⚡ Installation

## Clone Repository

```bash
git clone <repository-url>
cd zoom-meeting-reporter
```

Install dependencies

```bash
npm install
```

Create environment file

```bash
cp .env.example .env
```

Add your Gemini API key

```env
GEMINI_API_KEY=your_api_key_here
```

---

# ▶ Running

Development

```bash
npm start
```

Development with DevTools

```bash
npm run dev
```

Build installer

```bash
npm run dist
```

---

# 📖 How It Works

```text
Download Zoom Transcript
            │
            ▼
Upload .vtt File(s)
            │
            ▼
Choose Ending Time
            │
            ▼
Transcript Parsing
            │
            ▼
Calculate Start Time
            │
            ▼
Detect Meeting Participant
            │
            ▼
Generate AI Summary
            │
            ▼
Append to Meetings.docx
```

---

# 📌 Usage

### Step 1

Download transcript from Zoom.

### Step 2

Open **Zoom Meeting Reporter**.

### Step 3

Drag one or more transcript files into the application.

### Step 4

Select the ending time for each meeting.

### Step 5

Click **Generate Report**.

### Step 6

Done 🎉

The report is automatically appended to:

```
Meetings.docx
```

---

# 🧠 Start Time Calculation

The application never estimates meeting duration.

Instead it performs:

```
Duration
=
Last Transcript Timestamp
-
First Support Timestamp
```

Then

```
Meeting Start Time
=
Meeting End Time
-
Duration
```

### Example

| Item | Value |
|------|------|
| Ending Time | 11:27 PM |
| First Support | 00:01:35 |
| Transcript End | 00:48:35 |
| Duration | 47 Minutes |
| Calculated Start | 10:40 PM |

---

# 📝 Word Report Format

Every meeting is appended using the following layout.

```text
28-07-2026

Roger

Starting Time

10:40 PM PKT

Ending Time

11:27 PM PKT

Meeting Details

Today's meeting focused on...
```

No tables.

No unnecessary formatting.

Just a clean professional report.

---

# 📂 Output Location

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\zoom-meeting-reporter\output\Meetings.docx` |
| macOS | `~/Library/Application Support/zoom-meeting-reporter/output/Meetings.docx` |
| Linux | `~/.config/zoom-meeting-reporter/output/Meetings.docx` |

The application also provides an **Open Output Folder** button.

---

# 💾 How Reports Are Stored

Since `.docx` files cannot be edited directly, the application maintains a hidden history file:

```
.Meetings.index.json
```

Whenever a new meeting is generated:

- Existing history is loaded
- New meetings are added
- Word document is rebuilt

This guarantees:

- ✅ Nothing is overwritten
- ✅ Complete report history
- ✅ No database required

---

# ⚠ Error Handling

| Situation | Behavior |
|-----------|----------|
| Invalid Transcript | Only that meeting fails |
| Gemini Error | Automatic retries |
| Word File Open | Friendly error message |
| Multiple Uploads | Valid meetings still process |

---

# 🌍 Cross Platform

| Platform | Supported |
|----------|-----------|
| Windows | ✅ |
| macOS | ✅ |
| Linux | ✅ |

---

# 📜 License

Released under the **MIT License**.

Feel free to use, modify and distribute.

---

<div align="center">

### ⭐ If this project helps you, consider giving it a Star!

Made with ❤️ using Electron, Node.js and Google Gemini

</div>