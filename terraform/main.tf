terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Intentionally misconfigured S3 bucket - PUBLIC ACCESS
resource "aws_s3_bucket" "app_bucket" {
  bucket = "ecommerce-app-data-bucket"
}

resource "aws_s3_bucket_public_access_block" "app_bucket" {
  bucket = aws_s3_bucket.app_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Intentionally misconfigured Security Group - OPEN SSH
resource "aws_security_group" "web_sg" {
  name = "web-security-group"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # DANGEROUS: SSH open to world
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS Database - UNENCRYPTED
resource "aws_db_instance" "app_db" {
  identifier     = "ecommerce-db"
  engine         = "mysql"
  engine_version = "5.7"
  instance_class = "db.t2.micro"

  allocated_storage = 20
  storage_encrypted = false  # DANGEROUS: No encryption

  username = "admin"
  password = "Password123!"  # DANGEROUS: Hardcoded password

  skip_final_snapshot = true
}

