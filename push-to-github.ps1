# DAĞ TEKNOLOJİ - GITHUB PUSH VE YAYINLAMA YARDIMCISI

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  DAĞ TEKNOLOJİ - GITHUB YAYINLAMA ARACI  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";$env:LOCALAPPDATA\Programs\Git\cmd"

# Check if authenticated
$authStatus = & gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[1/3] GitHub hesabınıza giriş yapılıyor..." -ForegroundColor Yellow
    Write-Host "Lütfen tarayıcınızda açılacak ekranda onay verin." -ForegroundColor Gray
    & gh auth login --web -p https
}

Write-Host ""
Write-Host "[2/3] GitHub reposu oluşturuluyor ve kodlar yükleniyor..." -ForegroundColor Yellow
$repoName = Read-Host "Repository adı [Varsayılan: dag-teknoloji-redesign]"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "dag-teknoloji-redesign"
}

& gh repo create $repoName --public --source=. --remote=origin --push

Write-Host ""
Write-Host "[3/3] GitHub Pages kontrolü..." -ForegroundColor Green
Write-Host "Kodlarınız başarıyla GitHub'a yüklendi!" -ForegroundColor Green
Write-Host "Sitenizi canlıya almak için:" -ForegroundColor White
Write-Host "1. GitHub reponuzda Settings > Pages bölümüne gidin." -ForegroundColor Gray
Write-Host "2. 'Source' seçeneğini 'GitHub Actions' yapın." -ForegroundColor Gray
Write-Host "Siteniz birkaç saniye içinde https://<kullanici-adiniz>.github.io/$repoName adresinde canlı yayında olacaktır!" -ForegroundColor Cyan
Write-Host ""
Pause
