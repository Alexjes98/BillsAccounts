resource "aws_s3_bucket" "terraform_state" {
  bucket_prefix = "finance-app-state-"
  force_destroy = true # For dev only

  tags = {
    Name = "finance-app-state"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bucket for user uploads (if needed for migration)
resource "aws_s3_bucket" "uploads" {
  bucket_prefix = "finance-app-uploads-"
  force_destroy = true

  tags = {
    Name = "finance-app-uploads"
  }
}
