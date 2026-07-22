# ACM 証明書（CloudFront 用なので us-east-1）。DNS 検証。
# DNS は お名前.com 管理のため、検証用CNAMEは outputs を見て手動で追加する。
resource "aws_acm_certificate" "this" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# 検証完了を待つ（お名前.com に検証CNAMEを追加後、full apply で完了する）。
resource "aws_acm_certificate_validation" "this" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.this.arn

  # Route53 を使わないので validation_record_fqdns は指定しない。
  # 手動でDNSを入れた後に検証が通るのを待機する。
  timeouts {
    create = "45m"
  }
}
