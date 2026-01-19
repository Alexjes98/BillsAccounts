output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "db_endpoint" {
  description = "The endpoint of the database"
  value       = aws_rds_cluster.main.endpoint
}

output "cognito_user_pool_id" {
  description = "The ID of the User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "The ID of the User Pool Client"
  value       = aws_cognito_user_pool_client.main.id
}

output "db_secret_arn" {
  description = "ARN of the secret containing DB credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}
