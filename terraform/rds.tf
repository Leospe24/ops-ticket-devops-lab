# ==============================================================================
# 1. DATABASE SUBNET GROUP (Tells RDS where it's allowed to sit)
# ==============================================================================
resource "aws_db_subnet_group" "rds" {
  name        = "opsticket-db-subnet-group"
  description = "Database subnet group restricted to isolated private data subnets"
  subnet_ids  = [aws_subnet.private_data_1.id, aws_subnet.private_data_2.id]

  tags = {
    Name = "opsticket-db-subnet-group"
  }
}

# ==============================================================================
# 2. CUSTOM PARAMETER GROUP (Best practice config isolation)
# ==============================================================================
resource "aws_db_parameter_group" "postgres" {
  name   = "opsticket-postgres-pg"
  family = "postgres16" # Matches our engine version

  description = "Custom database parameter group for OpsTicket PostgreSQL"

  tags = {
    Name = "opsticket-postgres-pg"
  }
}

# ==============================================================================
# 3. ADVANCED COST-OPTIMIZED DATABASE INSTANCE
# ==============================================================================
resource "aws_db_instance" "database" {
  identifier            = "opsticket-db-instance"
  allocated_storage     = 20    # Minimum baseline storage to avoid heavy EBS fees
  max_allocated_storage = 30    # Allows minimal autoscale headroom, stops runaways
  storage_type          = "gp3" # gp3 is cheaper and more performant than gp2 baseline
  engine                = "postgres"
  engine_version        = "16"
  instance_class        = "db.t4g.micro" # Graviton4 powered micro instance (Highest performance-per-penny)

  # Database Credentials (Note: In a true pipeline, these would be passed via variables)
  db_name  = "opsticket"
  username = "dbadmin"
  password = "SuperSecurePassword123!" # Replace or parameterize this later!

  # Networking & Security Hookups
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  parameter_group_name   = aws_db_parameter_group.postgres.name
  vpc_security_group_ids = [aws_security_group.rds.id] # Secured inside the subnet firewall
  publicly_accessible    = false                       # Hard block from public internet routing

  # ============================================================================
  # CRITICAL COST CONTROL & DESTRUCTION SAFETIES
  # ============================================================================
  multi_az            = false # Skips standard duplicate standby charges ($$$ saved)
  skip_final_snapshot = true  # Stops AWS from charging you storage fees for a snapshot when you run "destroy"
  deletion_protection = false # Allows your GitHub automated pipeline to cleanly destroy the database without error

  tags = {
    Name = "opsticket-db"
  }
}