# Voxread — Talk to your PDF

Real-time voice AI reading companion. Upload books, organize them into
folders, and read with an AI agent that can see your page, explain
sections under your mouse, visualize concepts, and take notes — all
by voice.

## Stack
- **Frontend:** React (Vite) + Tailwind CSS + React Router + PDF.js
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Voice:** Browser Web Speech API (STT + TTS)
- **AI:** Anthropic API (Claude) for the agent's reasoning + tool calls

## Project structure
```
pdf-voice-reader/
├── server/           # Express API
│   ├── config/        # DB connection
│   ├── models/        # User, Folder, Book, Note
│   ├── controllers/    # Route logic
│   ├── routes/          # API routes
│   ├── middleware/       # Auth (JWT) + file upload (multer)
│   └── uploads/pdfs/      # Uploaded PDF files stored here
└── client/            # React app
    └── src/
        ├── pages/       # Home, Login, Register, Library, Reader
        ├── components/   # Navbar, Modal, ProtectedRoute
        ├── context/       # AuthContext
        └── api/            # axios instance
```

## Setup

### 1. Backend
```bash
cd server
cp .env.example .env    # fill in MONGO_URI, JWT_SECRET, ANTHROPIC_API_KEY
npm install
npm run dev              # runs on http://localhost:5000
```
Requires MongoDB running locally (or set MONGO_URI to Atlas).

### 2. Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev               # runs on http://localhost:5173
```

## Progress
- [x] Backend scaffold: auth, folders, books (upload + PDF page count), notes
- [x] Frontend scaffold: Home, Login, Register, Library (folders + upload)
- [ ] Reader page: PDF.js rendering with text layer, chapter sidebar, bookmarks
- [ ] Notes/board workspace panel
- [ ] Voice agent: Web Speech API integration (STT + TTS)
- [ ] Agent "sees" current page + mouse-hovered text as context
- [ ] Tool calling: explain section, turn page, generate image, save to notes
- [ ] Image generation for "picturise it" requests
