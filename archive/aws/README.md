# Archived AWS Deployment Components

## Status: OBSOLETE / SUPERSEDED (Historical Reference Only)

As of October 2026, Forest Guard has been migrated from AWS to a **100% Free, GitHub-Native Serverless Architecture** (GitHub Pages, GitHub Actions, and Git-backed version-controlled storage) for the **STEM2Connect AI Hackathon 2026**.

These components are preserved strictly for historical engineering reference and architectural comparison:
- `cloudformation.yaml`: Original AWS CloudFormation template for S3, CloudFront, Lambda, and API Gateway.
- `Dockerfile.lambda`: Original container packaging for AWS Lambda with `mangum`.
- `orchestrator_lambda.py`: Lambda handler wrapper for scheduled EventBridge invocations.

### Current Supported Production Path
- **Hosting:** GitHub Pages (Static Next.js + TypeScript dashboard).
- **Execution:** GitHub Actions (`.github/workflows/monitor.yml` on `ubuntu-latest`).
- **Data & State Storage:** Git repository (`data/public/` and `web/public/data/`).
- **External AI & Search:** Google Gemini and Tavily Free Plans.
- **Satellite Ingestion:** Open Copernicus Data Space Ecosystem (CDSE) and AWS Open Data public COGs over standard HTTPS without AWS credentials.

**No AWS account, AWS credentials, payment methods, or cloud charges are required to deploy or operate Forest Guard.**
