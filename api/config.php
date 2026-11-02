<?php
/**
 * DAĞ TEKNOLOJİ - GÜVENLİK VE SUNUCU KONFİGÜRASYONU
 * --------------------------------------------------------------------------
 * Hassas anahtarlar, veritabanı bağlantısı ve yetkilendirme fonksiyonları.
 * Bu dosya dışarıdan doğrudan çağrılamaz.
 */

if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    http_response_code(403);
    exit(json_encode(['success' => false, 'message' => 'Erişim engellendi.']));
}

// 1. CORS & Güvenlik Başlıkları
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
    // Sadece GET sorgularında veya bilinmeyen kaynaklarda güvenli kısıtlama
    header('Access-Control-Allow-Origin: ' . $allowedOrigins[0]);
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Sunucu Tarafı Güvenlik Anahtarı (Token İmzalama)
define('DAG_AUTH_SECRET', getenv('DAG_AUTH_SECRET') ?: 'DAG_TECH_SECURE_TOKEN_KEY_9921_xK9');
define('DAG_OPENCART_SYNC_SECRET', getenv('DAG_OPENCART_SYNC_SECRET') ?: 'DAG_INTERNAL_SYNC_SECURE_KEY_2026');

// 3. Veritabanı / OpenCart Bağlantısı (Varsa OpenCart config.php dosyasından beslenir)
$openCartConfig = __DIR__ . '/../config.php';
if (file_exists($openCartConfig)) {
    require_once($openCartConfig);
}

function getDatabaseConnection() {
    if (defined('DB_HOSTNAME') && defined('DB_DATABASE') && defined('DB_USERNAME')) {
        try {
            $dsn = 'mysql:host=' . DB_HOSTNAME . ';dbname=' . DB_DATABASE . ';charset=utf8mb4';
            return new PDO($dsn, DB_USERNAME, DB_PASSWORD, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
        } catch (PDOException $e) {
            error_log('[DB Error] ' . $e->getMessage());
            return null;
        }
    }
    return null;
}

// 4. Güvenli Token Üretme ve Doğrulama (HMAC-SHA256 Tabanlı Session Token)
function generateSecureToken($user) {
    $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64_encode(json_encode([
        'uid'   => $user['id'],
        'email' => $user['email'],
        'role'  => $user['role'],
        'name'  => $user['name'],
        'exp'   => time() + (86400 * 7) // 7 Gün geçerli
    ]));
    $signature = hash_hmac('sha256', "$header.$payload", DAG_AUTH_SECRET, true);
    $sigEncoded = base64_encode($signature);
    return "$header.$payload.$sigEncoded";
}

function verifySecureToken($token) {
    if (empty($token)) return null;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    list($header, $payload, $sig) = $parts;
    $expectedSig = base64_encode(hash_hmac('sha256', "$header.$payload", DAG_AUTH_SECRET, true));

    if (!hash_equals($expectedSig, $sig)) {
        return null; // İmza geçersiz (oynanmış)
    }

    $data = json_decode(base64_decode($payload), true);
    if (!$data || !isset($data['exp']) || $data['exp'] < time()) {
        return null; // Süresi dolmuş
    }

    return $data;
}

function getAuthUserFromRequest() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');

    if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
        return verifySecureToken($matches[1]);
    }

    // Cookie alternatifi
    if (isset($_COOKIE['dag_auth_token'])) {
        return verifySecureToken($_COOKIE['dag_auth_token']);
    }

    return null;
}

// 5. Basit Rate Limiting (Brute-Force Koruması)
function checkRateLimit($ip, $action, $maxAttempts = 5, $decayMinutes = 10) {
    $tempFile = sys_get_temp_dir() . '/dag_rate_' . md5($ip . '_' . $action) . '.json';
    $now = time();
    $data = ['attempts' => 0, 'first_attempt' => $now];

    if (file_exists($tempFile)) {
        $content = @file_get_contents($tempFile);
        if ($content) {
            $parsed = json_decode($content, true);
            if ($parsed && ($now - $parsed['first_attempt']) < ($decayMinutes * 60)) {
                $data = $parsed;
            }
        }
    }

    if ($data['attempts'] >= $maxAttempts) {
        return false; // Limit aşıldı
    }

    $data['attempts']++;
    @file_put_contents($tempFile, json_encode($data));
    return true;
}

function resetRateLimit($ip, $action) {
    $tempFile = sys_get_temp_dir() . '/dag_rate_' . md5($ip . '_' . $action) . '.json';
    if (file_exists($tempFile)) {
        @unlink($tempFile);
    }
}
