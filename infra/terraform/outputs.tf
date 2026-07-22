# ── お名前.com に追加するDNS（①ACM検証用CNAME）──────────
# 1st apply（cert のみ）の後に確認して追加する。
output "acm_validation_records" {
  description = "お名前.com に追加する ACM 検証用CNAME（ホスト名 / 種別 / 値）"
  value = [
    for o in aws_acm_certificate.this.domain_validation_options : {
      host  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ]
}

# ── お名前.com に追加するDNS（②配信用CNAME）────────────
# claudecode → この値（CloudFront ドメイン）を CNAME で向ける。
output "site_cname_target" {
  description = "claudecode サブドメインを向ける CloudFront ドメイン"
  value       = aws_cloudfront_distribution.site.domain_name
}

# ── GitHub Secrets に登録する値 ─────────────────────
output "github_secrets" {
  description = "GitHub リポジトリの Secrets に登録する値"
  value = {
    AWS_ROLE_ARN               = aws_iam_role.gha_deploy.arn
    AWS_REGION                 = var.region
    S3_BUCKET                  = aws_s3_bucket.site.id
    CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.site.id
  }
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "s3_bucket" {
  value = aws_s3_bucket.site.id
}
