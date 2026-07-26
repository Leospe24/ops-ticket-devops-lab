resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  # ── Thumbprint note — READ BEFORE CHANGING ──────────────────────────────
  # As of October 2023, AWS validates GitHub Actions OIDC tokens using its
  # own trusted CA library (the same trust store used by ACM). The values
  # below are effectively IGNORED by AWS for token.actions.githubusercontent.com.
  #
  # The field cannot be empty (AWS API requirement), so we keep known-good
  # values here as placeholders. You do NOT need to update these if GitHub
  # rotates their TLS certificate — AWS handles that natively now.
  #
  # Real security comes from the trust policy conditions in the IAM role
  # below (aud + sub claims), NOT from this thumbprint.
  # ────────────────────────────────────────────────────────────────────────
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]
}

resource "aws_iam_role" "github_actions_role" {
  name = "opsticket-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:Leospe24/ops-ticket-devops-lab:*"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_admin" {
  role       = aws_iam_role.github_actions_role.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}