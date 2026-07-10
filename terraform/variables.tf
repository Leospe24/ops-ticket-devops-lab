variable "jwt_secret" {
  type        = string
  description = "JWT signing secret for authentication tokens"
  sensitive   = true
  default     = "dev-jwt-secret"
}

variable "db_password" {
  type        = string
  description = "The master password for the RDS PostgreSQL database instance"
  sensitive   = true # This tells Terraform to hide it from printing in your pipeline logs!
}