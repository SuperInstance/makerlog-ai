# CI/CD Setup Quick Start

This guide provides the quick setup instructions for implementing CI/CD for Makerlog.ai.

## Files Created

1. **Research Document**: `/home/eileen/projects/makerlog-ai/docs/CICD-AUTOMATION-PATTERNS.md` (62KB)
   - Comprehensive CI/CD patterns for Cloudflare Workers/Pages
   - GitHub Actions workflow examples
   - Quality gates and monitoring setup

2. **Documentation Updates**:
   - `/home/eileen/projects/makerlog-ai/CLAUDE.md` - Added CI/CD guidance section
   - `/home/eileen/projects/makerlog-ai/ROADMAP.md` - Added CI/CD implementation phases

## GitHub Actions Workflows

The following workflow files need to be created in `.github/workflows/`:

### 1. CI Workflow (`.github/workflows/ci.yml`)

This workflow runs on every push and PR:
- Linting (ESLint, Prettier)
- Type checking (TypeScript)
- Unit tests (frontend + worker)
- Integration tests
- E2E tests (Playwright)
- Security scanning
- Build verification

**Key Features**:
- Parallel job execution for faster feedback
- Code coverage reporting to Codecov
- Trivy vulnerability scanning
- Worker bundle size verification (< 1MB)

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

This workflow handles deployments:
- Preview deployments for PRs (automatic)
- Staging deployments (develop branch)
- Production deployments (main branch)

**Key Features**:
- Automatic preview URL commenting on PRs
- Database migration automation
- Smoke tests after deployment
- Health check verification
- Automatic rollback on failure

### 3. Test Workflow (`.github/workflows/test.yml`)

This workflow runs scheduled and manual tests:
- Voice feature testing
- AI model regression testing
- Performance testing
- Quota monitoring tests
- Security scanning

**Triggers**:
- Schedule: Daily at 6 AM UTC
- Manual: Choose test type to run

## Setup Instructions

### 1. Create GitHub Secrets

Navigate to: **Repository Settings → Secrets and variables → Actions**

Add the following secrets:

```bash
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

Optional (for notifications):
```bash
SLACK_WEBHOOK_URL=your_slack_webhook_url
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

### 2. Get Cloudflare API Token

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Get your account ID
wrangler whoami

# Create API token with:
# - Account > Cloudflare Pages > Edit
# - Account > Workers Scripts > Edit
# - Zone > Zone > Read
# - Account > Account Settings > Read
```

### 3. Copy Workflow Files

Copy the workflow examples from `docs/CICD-AUTOMATION-PATTERNS.md` section "GitHub Actions Workflows" to:
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/test.yml`

### 4. Configure Branch Protection

Navigate to: **Repository Settings → Branches → Add rule**

For `main` branch:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass (ci.yml)
- ✅ Require branches to be up to date
- ❌ Do not allow bypassing

Required status checks:
- `Lint Frontend`
- `Test Frontend`
- `Test Worker`
- `Build Verify`

### 5. Enable Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10

  - package-ecosystem: 'npm'
    directory: '/workers/api'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
```

### 6. Optional: Enable CodeQL

Navigate to: **Repository Settings → Security → Code scanning**

Click **Set up CodeQL** to enable security scanning.

## Environment Configuration

### Wrangler.toml Setup

Update `workers/api/wrangler.toml` with your environments:

```toml
name = "makerlog-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "makerlog-api-prod"
vars = { ENVIRONMENT = "production" }

[env.staging]
name = "makerlog-api-staging"
vars = { ENVIRONMENT = "staging" }

[env.preview]
name = "makerlog-api-preview"
vars = { ENVIRONMENT = "preview" }
```

### Environment Variables

Create `.env` files for each environment:

**`.env.production`**:
```bash
ENVIRONMENT=production
VITE_API_URL=https://api.makerlog.ai
```

**`.env.staging`**:
```bash
ENVIRONMENT=staging
VITE_API_URL=https://api-staging.makerlog.ai
```

**`.env.preview`**:
```bash
ENVIRONMENT=preview
VITE_API_URL=https://makerlog-api-preview.workers.dev
```

## Testing Your CI/CD

### 1. Test CI Pipeline

Create a test branch and push a commit:

```bash
git checkout -b test/ci-pipeline
echo "# Test" >> README.md
git commit -am "Test CI pipeline"
git push origin test/ci-pipeline
```

Check the Actions tab to see CI running.

### 2. Test Preview Deployment

Create a PR from your test branch:

```bash
gh pr create --title "Test CI/CD" --body "Testing preview deployment"
```

Verify preview URL appears in PR comments.

### 3. Test Staging Deployment

Merge to develop branch:

```bash
git checkout develop
git merge test/ci-pipeline
git push origin develop
```

Check staging deployment at `https://staging.makerlog.ai`.

### 4. Test Production Deployment

Merge to main branch:

```bash
git checkout main
git merge test/ci-pipeline
git push origin main
```

Check production deployment at `https://makerlog.ai`.

## Monitoring

### Check Deployment Status

```bash
# List recent deployments
wrangler deployments list --env production

# View deployment logs
wrangler tail --env production
```

### Health Check Endpoints

- `/health` - Basic health status
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### Monitoring Dashboard

Access Cloudflare dashboard:
- **Workers Analytics**: https://dash.cloudflare.com/?to=/:account:/workers/analytics
- **Pages Analytics**: https://dash.cloudflare.com/?to=/:account:/pages/view

## Troubleshooting

### CI Failures

**Linting errors**:
```bash
npm run lint -- --fix
npm run format -- --write
```

**Type errors**:
```bash
npx tsc --noEmit
```

**Test failures**:
```bash
npm run test:unit
npm run test:e2e
```

### Deployment Failures

**Worker deployment fails**:
- Check bundle size (< 1MB)
- Verify wrangler.toml configuration
- Check Cloudflare API token permissions

**Pages deployment fails**:
- Verify build output exists in `dist/`
- Check Cloudflare Pages project exists
- Verify API token has Pages permissions

### Rollback

```bash
# Worker rollback
wrangler rollback <deployment-id> --env production

# Pages rollback (via dashboard)
# Navigate to Pages → makerlog-dashboard → Deployments → Rollback
```

## Next Steps

1. ✅ Set up GitHub secrets
2. ✅ Create workflow files
3. ✅ Configure branch protection
4. ✅ Test CI pipeline
5. ✅ Test preview deployments
6. ✅ Test staging deployment
7. ✅ Test production deployment (in staging environment first!)

For comprehensive documentation, see `docs/CICD-AUTOMATION-PATTERNS.md`.
