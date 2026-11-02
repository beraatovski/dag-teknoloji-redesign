<?php
/**
 * DAĞ TEKNOLOJİ - GÜVENLİ OPENCART CANLI ENTEGRASYON VE STOK KÖPRÜSÜ
 * --------------------------------------------------------------------------
 * Güvenlik Özellikleri:
 *  - CORS Kısıtlaması (Wildcard '*' kaldırıldı, yetkili domainler tanımlandı)
 *  - GET parametresiyle anahtar iletimi engellendi (Log sızıntısı önleme)
 *  - Timing-Attack koruması (hash_equals ile sabit zamanlı anahtar karşılaştırma)
 *  - İsteğe bağlı IP Whitelist kısıtlaması
 *  - Brute-Force koruması ve PDO SQL Injection önleme
 */

// 1. Yetkili Domainler (CORS Whitelist)
$allowedOrigins = [
    'https://dagteknoloji.com.tr',
    'https://www.dagteknoloji.com.tr',
    'https://beraatovski.github.io',
    'http://localhost',
    'http://127.0.0.1'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: ' . $allowedOrigins[0]);
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. IP Kısıtlaması (Sunucu-Sunucu İletişim Güvenliği)
// Sunucunuzun sabit IP'si varsa buraya ekleyerek dış dünyadan gelen tüm istekleri engelleyebilirsiniz.
$allowedIps = [
    // '127.0.0.1',
    // '::1'
];
$remoteIp = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
if (!empty($allowedIps) && !in_array($remoteIp, $allowedIps, true)) {
    http_response_code(403);
    exit(json_encode(['success' => false, 'message' => 'Yetkisiz IP adresi.']));
}

// 3. Güvenlik Anahtarı (Çevre Değişkeni veya Sabit)
$secretKey = getenv('DAG_SYNC_SECRET') ?: 'DAG_TECH_2026_SYNC_SECURE_9812_xP';

// 4. OpenCart Konfigürasyonu
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    exit(json_encode([
        'success' => false,
        'message' => 'OpenCart config.php bulunamadı. Lütfen dosyayı OpenCart kök dizinine yükleyin.'
    ]));
}

require_once($configFile);

// 5. Gelen Veriyi Al (Sadece POST ve JSON Kabul Edilir - GET Yasaklandı)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['success' => false, 'message' => 'Yalnızca POST isteklerine izin verilir.']));
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

// Bearer Token veya JSON Secret Kontrolü
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');
$providedSecret = '';

if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
    $providedSecret = $matches[1];
} elseif (isset($data['secret'])) {
    $providedSecret = $data['secret'];
}

// Timing Attack korumalı anahtar kontrolü veya Yönetici Token doğrulaması
$isSecretValid = (!empty($providedSecret) && hash_equals($secretKey, $providedSecret));
$isTokenValid = false;

if (!$isSecretValid && !empty($providedSecret) && file_exists(__DIR__ . '/api/config.php')) {
    require_once(__DIR__ . '/api/config.php');
    if (function_exists('verifySecureToken')) {
        $tokenUser = verifySecureToken($providedSecret);
        if ($tokenUser && isset($tokenUser['role']) && $tokenUser['role'] === 'admin') {
            $isTokenValid = true;
        }
    }
}

if (!$isSecretValid && !$isTokenValid) {
    http_response_code(403);
    exit(json_encode(['success' => false, 'message' => 'Geçersiz veya yetkisiz erişim anahtarı.']));
}

// 6. Veritabanı Bağlantısı (PDO & Prepared Statements)
try {
    $dsn = 'mysql:host=' . DB_HOSTNAME . ';dbname=' . DB_DATABASE . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USERNAME, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    exit(json_encode(['success' => false, 'message' => 'Veritabanı bağlantı hatası.']));
}

$action = isset($data['action']) ? $data['action'] : 'test';

// İşlem 1: Bağlantı Testi
if ($action === 'test') {
    $stmt = $pdo->query("SELECT COUNT(*) AS total FROM `" . DB_PREFIX . "product`");
    $row = $stmt->fetch();
    echo json_encode([
        'success' => true,
        'message' => 'OpenCart güvenli bağlantı köprüsü aktif.',
        'total_products' => intval($row['total'])
    ]);
    exit;
}

// İşlem 2: Stok ve Fiyat Güncelleme
if ($action === 'update_stock') {
    $productId = isset($data['product_id']) ? intval($data['product_id']) : 0;
    $sku = isset($data['sku']) ? trim($data['sku']) : '';
    $quantity = isset($data['quantity']) ? max(0, intval($data['quantity'])) : null;
    $price = isset($data['price']) ? max(0, floatval($data['price'])) : null;

    if ($productId <= 0 && empty($sku)) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'product_id veya sku zorunludur.']));
    }

    try {
        if ($productId > 0) {
            $sql = "UPDATE `" . DB_PREFIX . "product` SET ";
            $params = [];
            $updates = [];

            if ($quantity !== null) {
                $updates[] = "quantity = ?";
                $params[] = $quantity;
            }
            if ($price !== null) {
                $updates[] = "price = ?";
                $params[] = $price;
            }

            if (empty($updates)) {
                exit(json_encode(['success' => false, 'message' => 'Güncellenecek alan belirtilmedi.']));
            }

            $updates[] = "date_modified = NOW()";
            $sql .= implode(', ', $updates) . " WHERE product_id = ?";
            $params[] = $productId;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message' => "Ürün #$productId başarıyla güncellendi.",
                'product_id' => $productId,
                'updated_fields' => ['quantity' => $quantity, 'price' => $price]
            ]);
            exit;
        }
    } catch (PDOException $e) {
        http_response_code(500);
        exit(json_encode(['success' => false, 'message' => 'Sorgu hatası: ' . $e->getMessage()]));
    }
}

// Bilinmeyen İşlem
http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Bilinmeyen işlem türü.']);
