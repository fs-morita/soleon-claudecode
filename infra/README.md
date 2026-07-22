# claudecode.soleon.jp デプロイ手順（AWS + GitHub Actions）

配信構成: **S3(非公開) → CloudFront(OAC) → 利用者**、証明書は **ACM(us-east-1)**、
デプロイは **GitHub Actions(OIDC)**。DNS は **お名前.com** にCNAMEを2本追加するだけ。

Terraform 一式は `infra/terraform/` にあります。実際に AWS に作成する `terraform apply` は
**あなたのAWS認証**で行います（このリポジトリのコードには秘匿情報は入りません）。

---

## 0. 準備（初回のみ）

- **AWSの操作権限**を用意する。いちばん簡単なのは **AWS CloudShell**（ブラウザ上・認証済み・AWS CLI入り）。
  - マネジメントコンソール右上の `>_` アイコンで CloudShell を起動。
  - Terraform を入れる（CloudShellはユーザー領域に入れられる）:
    ```bash
    sudo yum install -y yum-utils
    sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
    sudo yum -y install terraform
    terraform -version
    ```
  - ※ ローカルPCで行う場合は AWS CLI 認証（`aws configure` 等）＋ Terraform を各自導入。
- このリポジトリを CloudShell に置く（例）:
  ```bash
  git clone https://github.com/<owner>/<repo>.git
  cd <repo>/infra/terraform
  ```

## 1. 変数を設定

```bash
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集し、github_owner / github_repo を実際の値に
```

## 2. 初期化

```bash
terraform init
```

## 3. まず証明書だけ作成 → お名前.com に検証CNAME(①)を追加

```bash
terraform apply -target=aws_acm_certificate.this
terraform output acm_validation_records
```

出力された `host / type / value` を **お名前.com のDNS設定**に **CNAME** で追加する。
- お名前.com のホスト欄は「`soleon.jp` を除いた部分」を入れる。
  例) host が `_abc123.claudecode.soleon.jp.` なら、入力するホストは **`_abc123.claudecode`**、
  値は出力の `value`（末尾ドットは付けない/UIに従う）。
- 反映まで数分〜。

## 4. 本適用（証明書検証の完了を待って CloudFront まで作成）

```bash
terraform apply
```
- ③で入れたCNAMEが伝播すると証明書が ISSUED になり、CloudFront が作られる（**5〜15分**程度）。
- 完了後、配信用の値を確認:
  ```bash
  terraform output site_cname_target      # 例: dxxxxxxxx.cloudfront.net
  terraform output github_secrets          # GitHubに入れる値一式
  ```

## 5. お名前.com に配信用CNAME(②)を追加

- ホスト **`claudecode`** → 値 **`site_cname_target`（CloudFrontドメイン）** を **CNAME** で追加。
- これで `https://claudecode.soleon.jp` が CloudFront を指す（証明書も一致）。

## 6. GitHub 側の設定（自動デプロイ）

1. まだ push していなければ、リポジトリを push（下の「初回push」参照）。
2. GitHub リポジトリ → Settings → Secrets and variables → Actions → **New repository secret** で登録:
   - `AWS_ROLE_ARN` … `terraform output github_secrets` の AWS_ROLE_ARN
   - `AWS_REGION` … 同上（例 ap-northeast-1）
   - `S3_BUCKET` … 同上
   - `CLOUDFRONT_DISTRIBUTION_ID` … 同上
   - `PUBLIC_CONTACT_ENDPOINT` …（任意）問い合わせAPIができたら設定。未設定でもビルドは通る。

## 7. デプロイ実行

- `main` に push すると `.github/workflows/deploy.yml` が走り、build → S3 sync → CloudFront invalidation。
- 完了後 **https://claudecode.soleon.jp** で公開。

> 先に中身を見たいときは CloudShell から一度だけ手動同期でもOK:
> ```bash
> cd <repo> && npm ci && npm run build
> aws s3 sync ./dist s3://$(terraform -chdir=infra/terraform output -raw s3_bucket) --delete
> ```

---

## 初回 push（GitHubは空リポジトリ作成済みの前提）

リポジトリ直下で:
```bash
git add -A
git commit -m "Initial commit: claudecode.soleon.jp site + infra"
git branch -M main
git remote add origin https://github.com/<owner>/<repo>.git   # 既に設定済みなら不要
git push -u origin main
```
※ `infra/terraform/.gitignore` により tfstate / tfvars はコミットされません（秘匿情報は入らない）。

## 片付け（全削除したいとき）

```bash
# S3はバージョニング有効なので、先に中身（全バージョン）を空にする必要あり
terraform destroy
```

## 補足
- ACM は CloudFront 用のため **us-east-1 固定**（コード側で対応済み）。
- S3 は非公開のまま、CloudFront(OAC) からのみ読める（バケットポリシーで制限）。
- Astro のディレクトリ形式URL（/blog/ など）は CloudFront Function で `index.html` を補完。
- 404 は Astro がビルドした `/404.html` を返す。
- 問い合わせフォームのバックエンド（API Gateway+Lambda+SES）は別モジュールで後日追加予定。
  完成したら `PUBLIC_CONTACT_ENDPOINT` を GitHub Secret に入れて再デプロイ。
