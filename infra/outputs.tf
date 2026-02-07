output "frontend_bucket_name" {
  description = "Name of the S3 bucket hosting the frontend"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_website_endpoint" {
  description = "The public URL of the frontend website"
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
}
