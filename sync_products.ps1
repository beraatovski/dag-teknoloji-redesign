# SYNC REAL PRODUCTS FROM DAGTEKNOLOJI.COM.TR

$baseDir = "C:\Users\dosto\.gemini\antigravity\scratch\dag-teknoloji-redesign"
$assetsDir = "$baseDir\assets\products"
New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null

$targets = @(
    # 3D Printers & Laser Engravers
    @{ Cat = "printers"; Url = "https://dagteknoloji.com.tr/3d-yazicilar" },
    @{ Cat = "printers"; Url = "https://dagteknoloji.com.tr/fdm-3d-yazicilar/kapali-kabin-3d-yazici" },
    @{ Cat = "printers"; Url = "https://dagteknoloji.com.tr/3d-lazer-gravur-makineleri/creality-lazer-gravur-3d-printer" },
    @{ Cat = "printers"; Url = "https://dagteknoloji.com.tr/3d-lazer-gravur-makineleri/snapmaker-3d-lazer-gravur-makineleri" },
    @{ Cat = "printers"; Url = "https://dagteknoloji.com.tr/index.php?route=product/search&search=creality" },
    @{ Cat = "printers"; Url = "https://dagteknoloji.com.tr/index.php?route=product/search&search=bambu" },
    @{ Cat = "printers"; Url = "https://dagteknoloji.com.tr/3d-yazicilar/fdm-3d-yazicilar" },
    @{ Cat = "printers"; Url = "https://dagteknoloji.com.tr/3d-yazicilar/3-boyutlu-tarayicilar" },
    @{ Cat = "printers"; Url = "https://dagteknoloji.com.tr/3d-yazicilar/sla-3d-printer" },

    # Filaments
    @{ Cat = "filaments"; Url = "https://dagteknoloji.com.tr/3d-yazicilar/3d-yazici-filament" },
    @{ Cat = "filaments"; Url = "https://dagteknoloji.com.tr/3d-yazicilar/3d-yazici-filament?page=2" },
    @{ Cat = "filaments"; Url = "https://dagteknoloji.com.tr/3d-yazicilar/3d-yazici-filament?page=3" },
    @{ Cat = "filaments"; Url = "https://dagteknoloji.com.tr/3d-yazicilar/3d-yazici-filament?page=4" },

    # Toners
    @{ Cat = "toners"; Url = "https://dagteknoloji.com.tr/toner-kartuslari/hp-toner-kartus" },
    @{ Cat = "toners"; Url = "https://dagteknoloji.com.tr/toner-kartuslari/canon-toner-kartus" },
    @{ Cat = "toners"; Url = "https://dagteknoloji.com.tr/toner-kartuslari/brother-toner-kartus" },
    @{ Cat = "toners"; Url = "https://dagteknoloji.com.tr/toner-kartuslari/xerox-toner-kartus" },
    @{ Cat = "toners"; Url = "https://dagteknoloji.com.tr/tonerler/kyocera-toner" },
    @{ Cat = "toners"; Url = "https://dagteknoloji.com.tr/tonerler/ricoh-toner" },
    @{ Cat = "toners"; Url = "https://dagteknoloji.com.tr/tonerler/samsung-dolum-toner" },

    # Parts
    @{ Cat = "parts"; Url = "https://dagteknoloji.com.tr/3d-yazicilar/3d-yazici-aksesuarlar" },
    @{ Cat = "parts"; Url = "https://dagteknoloji.com.tr/merdaneler/ust-merdaneler" },
    @{ Cat = "parts"; Url = "https://dagteknoloji.com.tr/merdaneler/alt-merdaneler" },
    @{ Cat = "parts"; Url = "https://dagteknoloji.com.tr/fotokopi-drum/hp-drum" },
    @{ Cat = "parts"; Url = "https://dagteknoloji.com.tr/fotokopi-drum/canon-drum" },
    @{ Cat = "parts"; Url = "https://dagteknoloji.com.tr/fotokopi-drum/drum-bicagi" },
    @{ Cat = "parts"; Url = "https://dagteknoloji.com.tr/muhtelif-yedek-parcalar/canon-fuser-fixing-film" }
)

Write-Host "Scraping dagteknoloji.com.tr products..."
$products = @()
$seen = @{}

foreach ($t in $targets) {
    $html = curl.exe -s --max-time 6 -L $t.Url
    $thumbs = [regex]::Matches($html, '<div class="product-thumb[\s\S]*?</div>\s*</div>\s*</div>')
    
    foreach ($m in $thumbs) {
        $c = $m.Value
        
        $id = ""
        if ($c -match "cart\.add\('(\d+)'\)") { $id = $Matches[1] }
        elseif ($c -match "product_id=(\d+)") { $id = $Matches[1] }
        if (-not $id -or $seen.ContainsKey($id)) { continue }
        $seen[$id] = $true

        $name = ""
        if ($c -match '<h4><a[^>]*>([^<]+)</a></h4>') { $name = $Matches[1].Trim() }
        elseif ($c -match 'alt="([^"]+)"') { $name = $Matches[1].Trim() }
        if (-not $name) { continue }
        $name = [System.Net.WebUtility]::HtmlDecode($name)

        $img = ""
        if ($c -match '<div class="image"><a[^>]*><img\s+src="([^"]+)"') {
            $img = $Matches[1] -replace '^http://', 'https://'
        }

        # Price regex: match digits with dot or comma inside <p class="price">
        $price = 0
        if ($c -match '<p class="price">\s*([0-9\.\,]+)') {
            $rawPrice = $Matches[1].Replace('.', '').Replace(',', '.')
            $price = [int][Math]::Round([double]$rawPrice)
        }

        $desc = ""
        if ($c -match '<p class="list-des">([\s\S]*?)</p>') {
            $rawDesc = $Matches[1] -replace '<[^>]+>', ' '
            $rawDesc = $rawDesc.Replace('&nbsp;', ' ')
            $desc = ($rawDesc -replace '\s+', ' ').Trim()
            $desc = [System.Net.WebUtility]::HtmlDecode($desc)
        }
        if (-not $desc) {
            $desc = "$name - Perpa Ticaret Merkezi stoklarımızdan hızlı teslimat ve garantili ürün."
        }

        $subtitle = $desc
        if ($subtitle.Length -gt 75) {
            $subtitle = $subtitle.Substring(0, 72) + "..."
        }

        # Local image download
        $localImgPath = ""
        if ($img) {
            $ext = ".jpg"
            if ($img -match '\.png') { $ext = ".png" }
            $fileName = "prod_$id$ext"
            $destFile = "$assetsDir\$fileName"
            if (-not (Test-Path $destFile)) {
                curl.exe -s --max-time 5 -L $img -o $destFile
            }
            if ((Test-Path $destFile) -and (Get-Item $destFile).Length -gt 1000) {
                $localImgPath = "assets/products/$fileName"
            }
        }
        $finalImage = if ($localImgPath) { $localImgPath } else { $img }

        $badge = "PERPA STOK"
        $badgeColor = "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
        if ($price -gt 15000) {
            $badge = "PREMİUM"
            $badgeColor = "bg-purple-500/20 text-purple-400 border-purple-500/30"
        } elseif ($t.Cat -eq "filaments") {
            $badge = "1.75 MM"
            $badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
        } elseif ($t.Cat -eq "toners") {
            $badge = "GARANTİLİ"
            $badgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/30"
        }

        $oldPrice = if ($price -gt 0) { [int][Math]::Round($price * 1.15) } else { 0 }

        $icon = "box"
        if ($t.Cat -eq "printers") { $icon = "printer" }
        elseif ($t.Cat -eq "filaments") { $icon = "disc" }
        elseif ($t.Cat -eq "toners") { $icon = "file-text" }
        elseif ($t.Cat -eq "parts") { $icon = "tool" }

        $specs = @()
        if ($t.Cat -eq "printers") {
            $specs = @("Endüstriyel Kalite", "Hızlı Baskı", "Orijinal Garanti", "Perpa Servis")
        } elseif ($t.Cat -eq "filaments") {
            $specs = @("1.75mm Çap", "1 KG Makara", "Yüksek Mukavemet", "Tıkanma Yapmaz")
        } elseif ($t.Cat -eq "toners") {
            $specs = @("Yüksek Kapasite", "Çipli Tak-Çalıştır", "Koyu Siyah Net Baskı", "Garantili")
        } else {
            $specs = @("Birebir Uyum", "Dayanıklı Malzeme", "Kolay Montaj", "Stok Teslim")
        }

        $products += [PSCustomObject]@{
            id = "dt-" + $id
            category = $t.Cat
            name = $name
            subtitle = $subtitle
            price = $price
            oldPrice = $oldPrice
            rating = [Math]::Round(4.7 + ((Get-Random -Minimum 0 -Maximum 4) * 0.1), 1)
            reviews = (Get-Random -Minimum 12 -Maximum 89)
            badge = $badge
            badgeColor = $badgeColor
            icon = $icon
            image = $finalImage
            remoteImage = $img
            specs = $specs
            desc = $desc
        }
    }
}

Write-Host "Scraped $($products.Count) real products!"
$products | Group-Object category | Format-Table -AutoSize

$jsonPath = "$baseDir\products.json"
$products | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding UTF8
Write-Host "Saved products to $jsonPath"
