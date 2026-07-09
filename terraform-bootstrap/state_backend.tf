resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "terraform_state" {
  bucket        = "opsticket-tf-state-${random_id.suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "state_versioning" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "opsticket-tf-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}