# =============================================================================
# local_dev_iam.tf
#
# Grants the local developer IAM user (leo) the minimum permissions needed
# to run Terraform locally:
#   - S3: read/write the remote state file
#   - DynamoDB: acquire/release the state lock
#
# WHY THIS IS SAFE:
#   - IAM policy documents are NOT secrets — they are configuration.
#   - No credentials (access keys, secrets) are stored here or in GitHub.
#   - GitHub Actions continues to use OIDC (zero long-lived secrets).
#   - This follows the principle of least privilege — leo can only touch
#     the specific state bucket and lock table, nothing else.
# =============================================================================

data "aws_iam_user" "local_dev" {
  user_name = "leo"
}

resource "aws_iam_policy" "terraform_local_dev" {
  name        = "opsticket-terraform-local-dev"
  description = "Least-privilege policy for running Terraform locally as user/leo"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TerraformStateS3"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketVersioning"
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
      },
      {
        Sid    = "TerraformStateLockDynamoDB"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:DescribeTable"
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      }
    ]
  })
}

resource "aws_iam_user_policy_attachment" "leo_terraform" {
  user       = data.aws_iam_user.local_dev.user_name
  policy_arn = aws_iam_policy.terraform_local_dev.arn
}
