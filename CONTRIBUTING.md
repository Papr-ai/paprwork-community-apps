# Contributing App Bundles

Thank you for contributing to the Paprwork community!

---

## Share your app in Community Apps (recommended)

**Use Papr Cloud publish**, not this GitHub repo, to list your app in the **Community Apps** tab for other users.

Inside Paprwork:

1. Open your mini-app and click **Share**
2. Choose **Anyone with the link** or **Anyone in my workspace** for access
3. Enable **Public in Community Apps** (requires `codeAccess: install`)
4. Publish to Papr Cloud

Apps published this way appear in Community Apps with rich metadata, fork/track install, and change requests — without a manual GitHub PR.

See the Paprwork docs: [Cloud Runtime Plan — Community Catalog](https://github.com/Papr-ai/paprwork-v2/blob/main/docs/PAPR_CLOUD_RUNTIME_PLAN.md#milestone-3f-community-catalog--forktrack-install-1-week--done-2026-06-30).

---

## This repository (starter templates only)

`paprwork-community-apps` now hosts **official starter templates** only:

- **Hello World** — minimal app template
- **Expense Tracker** — sample app with charts and local DB

We no longer accept community app submissions via pull request here. Legacy OSS bundles added before cloud publish have been removed.

### When to use OSS bundles

- You want a **portable template** users can import without Papr Cloud
- You're contributing an **official Paprwork starter** (maintainer-approved only)
- Cloud publish is unavailable and you need offline distribution

For everything else, use **Share → Public in Community Apps** in Paprwork.

---

## Submitting an official starter template (maintainers)

### Prerequisites

- [Paprwork](https://github.com/Papr-ai/paprwork) installed and running
- Git and a GitHub account
- Maintainer approval before opening a PR

### Bundle structure

```
your-bundle-id/
├── manifest.json      # Required: bundle metadata
├── README.md          # Recommended: description for users
├── apps/
│   └── your-app-id/
│       ├── index.html # Required: app entry point
│       ├── app.ts     # Your app logic
│       └── style.css  # Your styles
└── jobs/              # Optional: automation jobs
```

### Checklist

- [ ] `manifest.json` is valid and complete
- [ ] `schemaVersion` is `"1.0.0"`
- [ ] `minPaprworkVersion` is set correctly (use `"2.0.0"` if unsure)
- [ ] `index.html` loads without errors
- [ ] No API keys, secrets, or personal data in any files
- [ ] README.md describes what the app does

### Pull request steps

1. Fork this repository
2. Copy your bundle into `bundles/your-bundle-id/`
3. Regenerate the registry:

```bash
node scripts/generate-registry.mjs
```

4. Open a PR with a clear title (e.g. "Add: Starter template — …") and a screenshot

---

## Guidelines

- **One app per bundle** — keep bundles focused
- **No external dependencies** — apps should work offline
- **No secrets** — never include API keys, tokens, or credentials
- **Keep it small** — avoid large assets (images > 500KB, videos, etc.)
- **Test before submitting** — import your own bundle to verify it works
- **Use descriptive IDs** — `expense-tracker` not `app1`

---

## Questions?

Open an [issue](https://github.com/Papr-ai/paprwork-community-apps/issues) if you need help.
