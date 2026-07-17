# ==============================================================================
# 1. NOTIFICATION SYSTEM (The Alert Messenger)
# ==============================================================================
resource "aws_sns_topic" "ops_alerts" {
  name = "opsticket-system-alerts"
}

# ==============================================================================
# 2. BACKEND CPU ALARM (Triggers if container spikes > 80% CPU)
# ==============================================================================
resource "aws_cloudwatch_metric_alarm" "backend_cpu_high" {
  alarm_name          = "opsticket-backend-high-cpu"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300" # Evaluated over 5 minutes
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Triggers if the backend container CPU exceeds 80% for 5 minutes."

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  alarm_actions = [aws_sns_topic.ops_alerts.arn]
}