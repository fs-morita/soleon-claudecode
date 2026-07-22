variable "project" {
  type        = string
  default     = "soleon-claudecode"
  description = "リソース名・タグの接頭辞"
}

variable "region" {
  type        = string
  default     = "ap-northeast-1"
  description = "配信用S3・CloudFront Function・OIDCロールを作るリージョン（東京）"
}

variable "domain_name" {
  type        = string
  default     = "claudecode.soleon.jp"
  description = "公開ドメイン（soleon.jp のサブドメイン）"
}

variable "github_owner" {
  type        = string
  description = "GitHub のオーナー（ユーザー名 or Org）。例: soleon-inc"
}

variable "github_repo" {
  type        = string
  description = "GitHub のリポジトリ名。例: soleon-claudecode"
}

variable "github_branch" {
  type        = string
  default     = "main"
  description = "デプロイを許可するブランチ"
}

variable "price_class" {
  type        = string
  default     = "PriceClass_200"
  description = "CloudFront 価格クラス（200 は日本を含む。全世界は PriceClass_All）"
}
