# 📦 Private ECR Repository for the Node.js Backend Image
resource "aws_ecr_repository" "backend" {
  name                 = "opsticket-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true # Automatically scans our images for security vulnerabilities on every push!
  }

  tags = {
    Name        = "opsticket-backend-repo"
    Environment = "Production"
  }
}

# 📦 Private ECR Repository for the React Frontend Image
resource "aws_ecr_repository" "frontend" {
  name                 = "opsticket-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "opsticket-frontend-repo"
    Environment = "Production"
  }
}

# 📄 Outputs so our GitHub Action knows exactly where to push the images later
output "backend_ecr_url" {
  value       = aws_ecr_repository.backend.repository_url
  description = "The URL of the backend ECR repository"
}

output "frontend_ecr_url" {
  value       = aws_ecr_repository.frontend.repository_url
  description = "The URL of the frontend ECR repository"
}