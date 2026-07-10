# ==============================================================================
# 1. CORE ECS CLUSTER
# ==============================================================================
resource "aws_ecs_cluster" "main" {
  name = "opsticket-ecs-cluster"

  tags = {
    Name = "opsticket-ecs-cluster"
  }
}

# Create a Log Group to capture container logs
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/opsticket"
  retention_in_days = 7

  tags = {
    Environment = "production"
    Project     = "opsticket"
  }
}

# ==============================================================================
# 2. APPLICATION LOAD BALANCER STACK (Public Tier)
# ==============================================================================
resource "aws_lb" "main" {
  name               = "opsticket-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id] # High availability front door

  tags = {
    Name = "opsticket-alb"
  }
}

# Target Group 1: Frontend Routing Target
resource "aws_lb_target_group" "frontend" {
  name        = "opsticket-tg-frontend"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # Required for ECS Fargate awsvpc network mode

  health_check {
    path                = "/"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
}

# Target Group 2: Backend API Routing Target
resource "aws_lb_target_group" "backend" {
  name        = "opsticket-tg-backend"
  port        = 3000 # Aligned with ECS task definition container port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health" # Matches the backend app's GET /health endpoint
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
}

# Main Entry Listener (Port 80 HTTP Entrypoint)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  # Default Action: Send all standard root traffic to the Frontend container
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Advanced Traffic Routing Rule: Intercept "/api/*" patterns and route them to Backend
resource "aws_lb_listener_rule" "api_routing" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn # This target group is now correctly using port 3000!
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# ==============================================================================
# 3. IAM ROLE DEFINITIONS FOR ECS CONTAINER RUNTIMES
# ==============================================================================
# Execution Role: Allows ECS to pull images from ECR and stream logs to CloudWatch
resource "aws_iam_role" "ecs_execution" {
  name = "opsticket-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ==============================================================================
# 4. TASK DEFINITIONS (The Real Container Architectures)
# ==============================================================================
# Frontend Blueprint
resource "aws_ecs_task_definition" "frontend" {
  family                   = "opsticket-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${aws_ecr_repository.frontend.repository_url}:latest" # Pointing directly to our real ECR Registry image
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "frontend"
        }
      }
      environment = [
        {
          name  = "VITE_API_URL"
          value = "http://${aws_lb.main.dns_name}" # Directs the client side requests back to our public Load Balancer!
        }
      ]
    }
  ])
}

# Backend Blueprint
resource "aws_ecs_task_definition" "backend" {
  family                   = "opsticket-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:latest" # Pointing directly to our real ECR Registry image
      essential = true
      portMappings = [
        {
          containerPort = 3000 # Correctly aligned with dev team properties
          hostPort      = 3000
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "backend"
        }
      }
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },
        { name = "DB_HOST", value = aws_db_instance.database.address }, # <-- Changed from .postgres. to .database.
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = aws_db_instance.database.db_name }, # <-- Changed from .postgres. to .database.
        { name = "DB_USER", value = aws_db_instance.database.username }, # <-- Changed from .postgres. to .database.
        { name = "DB_PASSWORD", value = var.db_password },
        { name = "DB_SSL", value = "true" },
        { name = "DB_SSL_CA", value = "/app/global-bundle.pem" },
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "FRONTEND_URL", value = "http://${aws_lb.main.dns_name}" }
      ]
    }
  ])
}

# ==============================================================================
# 5. COST OPTIMIZED SERVICES (Fargate Spot Deployment)
# ==============================================================================
# Frontend Service Manager
resource "aws_ecs_service" "frontend" {
  name            = "opsticket-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [aws_subnet.private_app_1.id, aws_subnet.private_app_2.id]
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }
}

# Backend Service Manager
resource "aws_ecs_service" "backend" {
  name            = "opsticket-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [aws_subnet.private_app_1.id, aws_subnet.private_app_2.id]
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000 # Mapped accurately to the backend application container
  }
}