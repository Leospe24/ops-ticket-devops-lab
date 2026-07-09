terraform {
  backend "s3" {
    bucket         = "opsticket-tf-state-705f47b5"  # This is the name of the S3 bucket we created in state_backend.tf
    key            = "platform/terraform.tfstate"   # This organizes our state file inside the bucket
    region         = "us-east-1"
    dynamodb_table = "opsticket-tf-locks"
    encrypt        = true
  }
}