# Deployment and GitHub connection

## GitHub authorization

No repository has been created or pushed by this package. The chat session did not expose a GitHub OAuth, repository creation, or push capability. A GitHub plugin mention does not establish authorization.

If the official GitHub integration in Codex offers Connect, use its browser-based authorization flow, choose the account mnacakanyanargisti-rgb, and grant only the necessary repository access. Do not paste passwords, OAuth codes, or tokens into chat. If write operations are not supported, use the following local workflow instead.

1. Sign in to github.com in your browser and create an empty **public** repository named **ProduceAI** under **mnacakanyanargisti-rgb**. Do not initialize it with files.
2. Install Git and GitHub CLI. In a terminal use `gh auth login`, choose GitHub.com, HTTPS, and browser sign-in. Complete authorization only in the official GitHub browser page. Never put credentials in source files.
3. In the ProduceAI project root run:

```sh
git init -b main
git add .
git commit -m "Build ProduceAI research platform and ML infrastructure"
git remote add origin https://github.com/mnacakanyanargisti-rgb/ProduceAI.git
git push -u origin main
```

If the repository already exists, clone it first and copy these source files into the clone. Review differences and existing history before committing; do not overwrite or force-push unrelated work.

## GitHub Pages

1. Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → Variables → New repository variable: **VITE_API_URL** = the HTTPS backend origin, e.g. `https://your-api.example.com`. No trailing path is needed. This value is public and must not contain a secret. Leave it unset for an honestly disconnected frontend.
3. Push to main, then inspect the Frontend CI and GitHub Pages workflow. The build runs lint, unit tests, TypeScript, production build, and Chromium desktop/mobile checks. Deployment runs only for main, never PRs.
4. Open the target URL after the workflow succeeds: https://mnacakanyanargisti-rgb.github.io/ProduceAI/ . This is a target URL, not a claim of an existing deployment.

No manually configured GitHub secret is required for Pages. The workflow receives the automatic GITHUB_TOKEN and an OIDC token with narrowly scoped Pages permissions. Organization policies or branch/environment protections may require additional approval in GitHub.

The Vite base is `/ProduceAI/`. Router URLs use hashes, such as `/ProduceAI/#/ai-scanner`. Assets use import.meta.env.BASE_URL. A different repository name requires changing base in vite.config.ts. Redeploy after changing VITE_API_URL.

## Backend option: container on a managed host or VM

Run from the repository root:

```sh
docker build -f backend/Dockerfile -t produceai-api .
docker run --rm -p 8000:8000 -v "${PWD}/models:/models:ro" -e MODEL_PATH=/models/mobilenet.pt -e ALLOWED_ORIGINS=https://mnacakanyanargisti-rgb.github.io produceai-api
```

Use an HTTPS reverse proxy or a managed container host such as Render. Select a Docker web service with repository root as build context and backend/Dockerfile as Dockerfile path, port 8000, and health path /health. Upload/download the trusted checkpoint into a persistent mounted volume or fetch a pinned, checksum-verified artifact during controlled deployment. Set MODEL_PATH to that absolute path and ALLOWED_ORIGINS to `https://mnacakanyanargisti-rgb.github.io` (origins never contain /ProduceAI/). Restart after changing the checkpoint.

The container starts without weights and honestly returns model_loaded=false. Health checks only establish API reachability; separately verify model_loaded=true before enabling inference.

Costs depend on CPU, RAM, storage, transfer, and uptime. PyTorch images and model startup can exceed small/free service limits; cold starts may be slow. No paid hosting has been purchased or provisioned. Check the host's current pricing before provisioning: https://render.com/pricing . For sustained inference, budget for an always-on instance and artifact storage; a GPU is optional and this code runs CPU inference.

## Release checklist

- [ ] Dataset source, license, duplicate/group audit, and split provenance documented.
- [ ] Models trained; selected checkpoints evaluated on untouched held-out test images.
- [ ] Export actual experiments/results.json to frontend/public/experiments/results.json.
- [ ] Local lint, tests, production build, and responsive browser checks pass.
- [ ] Backend runs behind HTTPS; CORS includes the exact frontend origin.
- [ ] GET /health reports model_loaded=true and intended model name/version.
- [ ] POST /predict returns the real checkpoint output for a known validation image.
- [ ] Missing model, invalid images, timeout, and upload limits checked.
- [ ] Pages Actions workflow succeeds, subpath assets load, and hash navigation refreshes.
- [ ] No data, weights, credentials, or local/private paths staged for commit.
- [ ] Public inference resource limits and host costs reviewed.
