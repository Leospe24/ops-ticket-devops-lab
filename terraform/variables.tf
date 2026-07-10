variable "db_password" {
  type        = string
  description = "The master password for the RDS PostgreSQL database instance"
  sensitive   = true # This tells Terraform to hide it from printing in your pipeline logs!
}