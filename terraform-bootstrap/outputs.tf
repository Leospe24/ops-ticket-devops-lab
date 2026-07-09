output "s3_bucket_name" {
  value       = aws_s3_bucket.terraform_state.id
  description = "The unique name of your new S3 State Bucket"
}

output "dynamodb_table_name" {
  value       = aws_dynamodb_table.terraform_locks.name
  description = "The name of your DynamoDB lock table"
}

output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions_role.arn
  description = "The ARN of the IAM role. Save this value!"
}