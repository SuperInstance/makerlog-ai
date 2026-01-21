# Makerlog.ai - Contributor Onboarding

**Welcome to Makerlog.ai!** This guide will help you get started contributing to our voice-first development assistant.

---

## Quick Start

### Prerequisites
- Node.js 20+
- Cloudflare account (free tier works)
- Wrangler CLI: `npm install -g wrangler`
- Git

### 1. Clone and Install
```bash
git clone https://github.com/SuperInstance/makerlog-ai.git
cd makerlog-ai
npm install
cd workers/api && npm install && cd ../..
```

### 2. Authenticate with Cloudflare
```bash
wrangler login
```

### 3. Start Development Servers
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Worker API
npm run api:dev
```

Visit http://localhost:5173 to see the application.

---

## Project Architecture

### High-Level Structure
```
makerlog-ai/
├── src/                    # React frontend
│   ├── main.tsx           # App entry point
│   ├── VoiceChat.tsx      # Voice interface
│   └── Dashboard.tsx      # Quota dashboard
├── workers/api/           # Cloudflare Worker
│   └── src/index.ts       # API endpoints
├── docs/                  # Documentation
├── CLAUDE.md             # AI assistant guidance
└── ROADMAP.md            # Production roadmap
```

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Cloudflare Workers, Hono framework
- **Database**: Cloudflare D1 (SQLite)
- **AI**: Cloudflare Workers AI (Whisper, Llama, SDXL)
- **Search**: Cloudflare Vectorize (embeddings)

---

## Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes
- Edit files in your editor
- Test locally with `npm run dev` and `npm run api:dev`
- Run tests: `npm run test` (once configured)

### 3. Commit Changes
```bash
git add .
git commit -m "feat: add feature description"
# or
git commit -m "fix: fix bug description"
```

**Commit Message Conventions**:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build/process changes

### 4. Push and Create PR
```bash
git push origin feature/your-feature-name
```
Create a pull request on GitHub.

---

## Key Concepts

### Voice Processing Pipeline
1. **Recording**: User pushes button → MediaRecorder captures audio
2. **Upload**: Audio sent to `/api/voice/transcribe`
3. **Transcription**: Whisper model converts to text
4. **AI Response**: Llama generates contextual response
5. **Embeddings**: BGE creates vector for semantic search
6. **Storage**: Audio in R2, metadata in D1, vectors in Vectorize

### Opportunity Detection
The system analyzes conversations to detect generative tasks:
- **Explicit**: "Generate an icon for my app"
- **Implicit**: "I need a landing page" → Detects opportunity

Detected opportunities appear in the UI for user approval.

### Task Queue
Approved opportunities are queued for batch execution:
1. User reviews and queues opportunities
2. Tasks executed overnight (quota optimization)
3. Results available in morning
4. User reviews and keeps/discards

---

## Common Tasks

### Adding a New API Endpoint
1. Edit `workers/api/src/index.ts`
2. Add route to Hono app:
```typescript
app.post('/api/your-endpoint', async (c) => {
  const { param } = await c.req.json()
  // Your logic
  return c.json({ result })
})
```
3. Test locally with `npm run api:dev`
4. Update API documentation

### Adding a New Frontend Component
1. Create component file in `src/`
2. Use TypeScript and functional components
3. Style with Tailwind CSS classes
4. Import in `src/main.tsx` if needed

### Database Schema Changes
1. Create migration file in `packages/db/migrations/`
2. Test locally: `npm run db:migrate`
3. Update TypeScript types if needed
4. Document schema change in CLAUDE.md

### Adding a New AI Model
1. Check model availability in Workers AI
2. Add model constant in `workers/api/src/index.ts`
3. Implement error handling for that model
4. Add timeout configuration
5. Test with various inputs

---

## Testing

### Frontend Tests (Vitest)
```bash
npm run test:unit
```

### Worker Tests
```bash
npm run test:worker
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Voice chat records and transcribes
- [ ] AI responses are relevant
- [ ] Opportunities are detected
- [ ] Tasks can be queued and executed
- [ ] Dashboard shows correct quota
- [ ] All navigation works

---

## Deployment

### Deploy Worker API
```bash
npm run api:deploy
```

### Deploy Frontend
```bash
npm run build
wrangler pages deploy dist --project-name makerlog-dashboard
```

### Full Stack Deploy
```bash
npm run deploy:all
```

---

## Code Style

### TypeScript
- Use strict mode
- Avoid `any` types
- Use interfaces for object shapes
- Add JSDoc comments for exports

### React
- Functional components with hooks
- Props interfaces
- Avoid prop drilling (use context for deep props)
- Memoize expensive computations

### General
- Descriptive variable names
- Functions under 50 lines
- File naming: PascalCase for components, camelCase for utilities
- Add comments for complex logic

---

## Accessibility Guidelines

Our goal is WCAG 2.2 Level AA compliance.

### Required Practices
- **Keyboard Navigation**: All features must work without mouse
- **Screen Reader**: ARIA labels on interactive elements
- **Color Contrast**: WCAG AA minimum (4.5:1 for text)
- **Text Alternatives**: Transcripts for all voice content
- **Audio Control**: Users can pause/stop all audio

### Testing
- Test with VoiceOver (macOS) or TalkBack (Android)
- Navigate with Tab key only
- Use Lighthouse accessibility audit
- Test with high contrast mode

---

## Security Best Practices

### Input Validation
- Validate all user inputs
- Sanitize outputs to prevent XSS
- Use parameterized queries for D1

### AI Security
- Implement prompt injection protection
- Use Llama Guard for content moderation
- Never log user audio transcripts
- Redact PII before AI calls

### API Security
- Rate limit per user/IP
- CORS configuration
- Authentication for protected endpoints
- Never expose API keys in frontend code

---

## Getting Help

### Documentation
- **CLAUDE.md**: AI assistant guidance and architecture
- **ROADMAP.md**: Production roadmap and phases
- **README.md**: Project overview and quick start

### Communication
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and ideas
- **Discord**: [Join our community](#)

### Team Contacts
- **Tech Lead**: @tech-lead
- **Maintainers**: See README.md

---

## First Contribution Ideas

### Good First Issues
- Add unit tests for existing components
- Improve error messages
- Add ARIA labels to components
- Fix accessibility issues
- Update documentation
- Add loading states
- Improve mobile responsiveness

### Feature Ideas
- Dark mode toggle
- Voice speed controls
- Export conversation transcripts
- Keyboard shortcuts
- Achievement notifications
- Multi-language support

---

## Resources

### Cloudflare
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [Vectorize](https://developers.cloudflare.com/vectorize/)
- [R2 Storage](https://developers.cloudflare.com/r2/)

### React & TypeScript
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

### Testing
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright](https://playwright.dev/)

---

## Checklist Before Submitting PR

- [ ] Code follows project style guidelines
- [ ] Tests added/updated for new functionality
- [ ] Documentation updated (CLAUDE.md, ROADMAP.md)
- [ ] Accessibility reviewed (keyboard, screen reader)
- [ ] Manual testing completed
- [ ] No console errors or warnings
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Commit messages follow conventions

---

**Thank you for contributing to Makerlog.ai!** 🎤

If you have any questions, don't hesitate to reach out. We're happy to help new contributors get started.