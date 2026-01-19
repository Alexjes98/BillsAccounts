# Database Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "finance-app-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name = "finance-app-db-subnet-group"
  }
}

# Security Group for Database
resource "aws_security_group" "database" {
  name        = "finance-app-db-sg"
  description = "Allow inbound traffic from VPC"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "PostgreSQL from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "finance-app-db-sg"
  }
}

# Random Password for Master DB User
resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Secrets Manager Secret for DB Credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "finance-app/db/credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "dbadmin"
    password = random_password.db_password.result
    host     = aws_rds_cluster.main.endpoint
    port     = 5432
    dbname   = "finance_app"
  })
}

# Aurora Cluster (Serverless v2)
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "finance-app-cluster"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "15.4" # Check for latest supported version in your region
  database_name           = "finance_app"
  master_username         = "dbadmin"
  master_password         = random_password.db_password.result
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.database.id]
  skip_final_snapshot     = true # For dev/demo only. Set false for prod.
  
  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 1.0
  }

  tags = {
    Name = "finance-app-cluster"
  }
}

# Aurora Cluster Instance
resource "aws_rds_cluster_instance" "main" {
  identifier           = "finance-app-instance-1"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = "db.serverless"
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version
  publicly_accessible  = false
}
