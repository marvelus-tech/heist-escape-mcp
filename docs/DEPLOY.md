# Deployment Guide

This guide covers deploying the Heist Escape demo to production.

## Overview

The system has two components:
1. **Stage (Demo Client)** - Static site deployed to GitHub Pages
2. **MCP Server** - Cloudflare Worker with Durable Objects + D1

---

## Part 1: Deploy Cloudflare Worker (MCP Server)

### Prerequisites
- Cloudflare account (free tier works)
- Wrangler CLI installed: `npm install -g wrangler`
- Authenticated: `wrangler login`

### Step 1: Create D1 Database

```bash
cd packages/mcp-server
wrangler d1 create heist-db
```

Copy the `database_id` from the output.

### Step 2: Update wrangler.jsonc

Edit `packages/mcp-server/wrangler.jsonc` and replace the `database_id`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "heist-db",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ]
}
```

### Step 3: Seed Remote Database

```bash
npm run seed:remote
```

This creates tables and populates game content.

### Step 4: Deploy Worker

```bash
npm run deploy
```

Your MCP server will be available at:
```
https://heist-escape-mcp.<your-account>.workers.dev
```

**Save this URL!** You'll need it for the demo client.

---

## Part 2: Deploy Demo Client (GitHub Pages)

### Prerequisites
- GitHub repository
- Repository must be **public** (or org with Pages enabled)

### Step 1: Configure Environment Variables

Two options:

#### Option A: GitHub Secrets (Recommended)

Go to: Settings → Secrets and variables → Actions → New repository secret

Add:
- `VITE_API_BASE` = `https://heist-escape-mcp.<your-account>.workers.dev`
- `VITE_MCP_URL` = `https://heist-escape-mcp.<your-account>.workers.dev/mcp`

#### Option B: Edit Workflow File

Edit `.github/workflows/deploy-pages.yml` and replace the default URLs in the build step.

### Step 2: Enable GitHub Pages

1. Go to: Settings → Pages
2. Source: "GitHub Actions"
3. Save

### Step 3: Deploy

Push to `main` branch:

```bash
git push origin main
```

Or manually trigger: Actions → Deploy GitHub Pages → Run workflow

### Step 4: Access Demo

Your demo will be at:
```
https://<username>.github.io/heist-escape-mcp/
```

---

## Part 3: Test the Flow

### Test Locally First

1. Start MCP server:
```bash
cd packages/mcp-server
npm run dev
```

2. Start demo client:
```bash
cd apps/demo-client
npm run dev
```

3. Open: `http://localhost:3000`
4. Click "Start Demo"
5. Scan QR codes or click links to test Examiner/Operator pages

### Test Production

1. Go to your GitHub Pages URL
2. Click "Start Demo"
3. Scan Operator QR with your phone
4. Copy Examiner link to your MCP client (Claude Desktop, Cursor)
5. Use the MCP config on the Examiner page

---

## Part 4: MCP Client Setup (for Agents)

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "heist-escape": {
      "command": "npx",
      "args": ["mcp-remote", "https://heist-escape-mcp.<your-account>.workers.dev/mcp"]
    }
  }
}
```

Restart Claude Desktop.

### Cursor

Settings → Features → Model Context Protocol

Add the same config as above.

---

## Troubleshooting

### Worker Deploy Issues

**"Database not found"**
- Run `wrangler d1 create heist-db` first
- Update `database_id` in `wrangler.jsonc`

**"Migration failed"**
- Check D1 bindings are correct
- Try `wrangler d1 migrations list heist-db` to see status

### Pages Deploy Issues

**"Build failed"**
- Check secrets are set correctly
- Ensure `VITE_BASE_PATH` is `/heist-escape-mcp/` (with slashes)

**"404 on assets"**
- Verify base path matches repo name
- Check vite.config.ts `base` setting

### QR Codes Not Working

**"Can't scan QR"**
- Use a different QR service or install `qrcode` npm package locally
- Links should work directly even if QR fails

### MCP Connection Issues

**"Can't connect to MCP endpoint"**
- Verify Worker URL is correct
- Check CORS is enabled (it should be by default)
- Test with: `curl https://your-worker.workers.dev/`

---

## Optional: GitHub Actions for Worker Deploy

To enable automated Worker deploys:

1. Get Cloudflare API token: Dashboard → My Profile → API Tokens → Create Token
2. Add GitHub secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Use workflow: Actions → Deploy Cloudflare Worker → Run workflow

---

## Updating the Game

### Update Content (Rooms/Puzzles)

1. Edit `packages/mcp-server/seed.sql`
2. Re-seed remote DB: `npm run seed:remote`
3. No redeploy needed (DB is separate)

### Update Worker Code

```bash
cd packages/mcp-server
npm run deploy
```

### Update Demo Client

Push to main:
```bash
git commit -am "Update stage UI"
git push origin main
```

GitHub Actions will rebuild automatically.

---

## Making Repository Public

**Required for GitHub Pages on free accounts:**

```bash
gh repo edit --visibility public
```

Or: Settings → Danger Zone → Change visibility → Public

---

## Cost Estimate

- **Cloudflare Workers**: Free tier (100k requests/day, D1 included)
- **GitHub Pages**: Free (unlimited for public repos)
- **Total**: $0/month for demo purposes

---

## Production Checklist

- [ ] D1 database created and seeded
- [ ] Worker deployed and accessible
- [ ] Environment variables configured
- [ ] GitHub Pages enabled
- [ ] Demo client builds successfully
- [ ] QR codes generate correctly
- [ ] Examiner MCP config works
- [ ] Operator controls functional
- [ ] Repository public (if needed)
- [ ] URLs updated in docs

---

**Need help?** Check the main README or open an issue.
