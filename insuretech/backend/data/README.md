# Policy PDF Data Folder

Put the insurance-policy PDF files here before bulk ingestion.

Use subfolders for insurance categories because the folder name becomes the
policy's `insurance_category` metadata:

```text
backend/data/
├── Liability/
│   └── public-liability-policy.pdf
├── Fire & Property/
│   └── fire-policy.pdf
└── Machinery Breakdown/
    └── machinery-policy.pdf
```

Run the importer from `backend/`:

```bash
python -m app.ai.run_policy_ingestion
```
