# Smart AI Study Assistant

An intelligent study companion built with Next.js that helps you take notes, summarize content, generate quizzes, and track your study progress — all in one place.

## Features

- **Dashboard** — Overview of your study stats: total time, sessions, and notes
- **Notes** — Write and manage your study notes with a clean editor
- **AI Summarizer** — Paste your notes and get a concise summary with key points (ready for OpenAI/Anthropic integration)
- **Quiz Generator** — Auto-generate multiple choice questions from your notes to test your knowledge
- **Study Tracker** — Log study sessions and visualize your progress over time
- **Settings** — Customize your experience including light/dark theme

## Tech Stack

- [Next.js 16](https://nextjs.org/) — React framework
- [Tailwind CSS v4](https://tailwindcss.com/) — Styling
- [Radix UI](https://www.radix-ui.com/) — Accessible UI primitives
- [Framer Motion](https://www.framer.com/motion/) — Animations
- [Recharts](https://recharts.org/) — Study progress charts
- [Zustand / localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — Persistent local state
- [Vercel Analytics](https://vercel.com/analytics) — Usage analytics (production only)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) (recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/tsedeysolomons/smart-ai-study-assistant.git
cd smart-ai-study-assistant

# Install dependencies
cd frontend
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
pnpm build
pnpm start
```

## AI Integration

The AI features (summarizer and quiz generator) currently use mock implementations. To connect a real AI provider, edit `frontend/lib/ai.ts` and replace the placeholder functions with your API calls.

Example with OpenAI is included as a comment in that file.

```env
OPENAI_API_KEY=your_api_key_here
```

## Project Structure

```
frontend/
├── app/              # Next.js app router (layout, pages, global styles)
├── components/       # Feature components and shadcn/ui primitives
│   └── ui/           # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Utilities, AI functions, and local storage store
└── public/           # Static assets and icons
```

## License

MIT
