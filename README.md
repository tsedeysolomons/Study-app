# Smart AI Study Assistant

A modern, AI-powered study companion built with Next.js 15, React, and Tailwind CSS. Features an intuitive dashboard for note-taking, AI summarization, quiz generation, and study session tracking.

![Smart AI Study Assistant](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Features

### Note Input
- Full-featured text editor with word and character count
- Auto-save to local storage
- Copy to clipboard functionality
- Clean, distraction-free writing experience

### AI Summarizer
- Generate concise summaries from your notes
- Extract key points automatically
- Adjustable summary length (short, medium, detailed)
- Ready for OpenAI/Claude API integration

### Quiz Generator
- Auto-generate quiz questions from your study material
- Multiple choice format with instant feedback
- Progress tracking and score display
- Detailed explanations for each answer

### Study Tracker
- Beautiful circular countdown timer
- Start, pause, and reset controls
- Session history with timestamps
- Statistics dashboard (total time, daily time, session count)
- Data persisted to local storage

### Modern UI/UX
- Dark and light theme support
- Smooth animations with Framer Motion
- Fully responsive (mobile + desktop)
- Sidebar navigation with mobile bottom nav
- Clean, professional SaaS-style design

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Theme:** next-themes
- **State:** React Hooks + Local Storage

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- pnpm (recommended), npm, or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/smart-ai-study-assistant.git
cd smart-ai-study-assistant
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── globals.css          # Global styles and theme tokens
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Main dashboard page
├── components/
│   ├── app-header.tsx       # Header with theme toggle
│   ├── app-sidebar.tsx      # Navigation sidebar
│   ├── dashboard-cards.tsx  # Overview stat cards
│   ├── notes-section.tsx    # Note input component
│   ├── quiz-section.tsx     # Quiz generator component
│   ├── settings-section.tsx # Settings panel
│   ├── study-tracker.tsx    # Timer and tracking
│   ├── summarizer-section.tsx # AI summarizer
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── ai.ts                # AI integration functions
│   ├── store.ts             # Local storage utilities
│   └── utils.ts             # Helper functions
└── hooks/
    └── use-mobile.tsx       # Mobile detection hook
```

## AI Integration

The app includes placeholder functions for AI integration in `lib/ai.ts`:

```typescript
// Ready to connect to your preferred AI provider
export async function summarizeText(text: string, length: 'short' | 'medium' | 'detailed')
export async function generateQuestions(text: string, count: number)
```

To integrate with OpenAI or another provider:

1. Install the AI SDK:

```bash
pnpm add ai @ai-sdk/openai
```

2. Add your API key to `.env.local`:

```
OPENAI_API_KEY=your_api_key_here
```

3. Update the functions in `lib/ai.ts` to use real API calls.

## Customization

### Theme Colors

Edit the CSS variables in `app/globals.css` to customize the color scheme:

```css
:root {
  --primary: oklch(0.7 0.15 165);      /* Teal accent */
  --background: oklch(0.98 0.01 165);  /* Light background */
  --foreground: oklch(0.2 0.02 165);   /* Dark text */
}

.dark {
  --primary: oklch(0.75 0.15 165);
  --background: oklch(0.12 0.02 165);
  --foreground: oklch(0.95 0.01 165);
}
```

### Adding New Sections

1. Create a new component in `components/`
2. Add navigation item in `app-sidebar.tsx`
3. Add the section to the page rendering logic in `app/page.tsx`

## Scripts

| Command | Description |
|---------|-------------|
| `npm dev` | Start development server |
| `npm build` | Build for production |
| `npm start` | Start production server |
| `npm lint` | Run ESLint |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Lucide](https://lucide.dev/) for the icon set
- [Framer Motion](https://www.framer.com/motion/) for animations
- [Vercel](https://vercel.com/) for hosting and deployment
