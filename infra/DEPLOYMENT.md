# Deploying the Frontend to AWS S3

This guide details the steps to deploy the React frontend as a static website on AWS S3 using Terraform.

## Prerequisites

1.  **AWS CLI**: Installed and configured with your credentials (`aws configure`).
2.  **Terraform**: Installed (v1.2.0+).
3.  **Node.js**: Installed (to build the frontend).

## Deployment Steps

### 1. Build the Frontend

Navigate to the `frontend` directory and build the production assets.

```bash
cd frontend
npm install
npm run build
```

This will create a `dist` directory with your compiled static files.

### 2. Initialize Terraform

Navigate to the `infra` directory.

```bash
cd ../infra
terraform init
```

### 3. Deploy Infrastructure

Review and apply the Terraform configuration.

```bash
terraform plan
terraform apply
```

Type `yes` when prompted.

**Note the Outputs**: After deployment, Terraform will display:

- `frontend_bucket_name`: The name of your new S3 bucket.
- `frontend_website_endpoint`: The URL where your app will be accessible.

### 4. Upload Content

Sync the build folder to your new S3 bucket. Replace `YOUR_BUCKET_NAME` with the `frontend_bucket_name` output from the previous step.

```bash
aws s3 sync ../frontend/dist s3://YOUR_BUCKET_NAME --delete
```

### 5. Verify

Open the `frontend_website_endpoint` URL in your browser. You should see your application running!

## Updates

Whenever you make changes to the frontend code:

1.  Run `npm run build` in `frontend/`.
2.  Run the `aws s3 sync` command again.
3.  **Invalidate CloudFront Cache**: Run the following command to make changes visible immediately:
    ```bash
    aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
    ```
    _Replace `YOUR_DISTRIBUTION_ID` with the `cloudfront_distribution_id` from Terraform outputs._

## Teardown

To remove all resources created by Terraform:

```bash
terraform destroy
```
