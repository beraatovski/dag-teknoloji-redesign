<?php
/**
 * DAĞ TEKNOLOJİ - OPENCART CANLI ENTEGRASYON VE STOK KÖPRÜSÜ
 * -------------------------------------------------------------
 * Bu dosyayı OpenCart ana dizinine (dagteknoloji.com.tr kök klasörüne) yükleyin.
 * Web sitesindeki siparişler veya stok güncellemeleri bu köprü üzerinden
 * OpenCart veritabanına anında yansıtılır.
 */

// CORS Başlıkları (Frontend SPA'dan gelen isteklere izin ver)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Güvenlik Anahtarı (Site ayarlarıyla eşleşmelidir)
define('DAG_SYNC_SECRET', 'DAG_TECH_2026_SYNC');

// OpenCart konfigürasyonunu yükle
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    echo json_encode([
        'success' => false,
        'message' => 'config.php bulunamadı. Lütfen bu dosyayı OpenCart ana dizinine yükleyin.'
    ]);
    exit;
}

require_once($configFile);

// Gelen JSON verisini oku
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    $data = $_POST;
}

// Güvenlik kontrolü
$secret = isset($data['secret']) ? $data['secret'] : (isset($_GET['secret']) ? $_GET['secret'] : '');
if ($secret !== DAG_SYNC_SECRET) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Geçersiz güvenlik anahtarı.'
    ]);
    exit;
}

// Veritabanı bağlantısı
try {
    $dsn = 'mysql:host=' . DB_HOSTNAME . ';dbname=' . DB_DATABASE . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USERNAME, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()
    ]);
    exit;
}

$action = isset($data['action']) ? $data['action'] : (isset($_GET['action']) ? $_GET['action'] : 'test');

// 1. BAĞLANTI TESTİ
if ($action === 'test') {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM " . DB_PREFIX . "product");
    $total = $stmt->fetch()['total'];
    echo json_encode([
        'success' => true,
        'message' => 'OpenCart köprüsü başarıyla bağlandı!',
        'total_products' => (int)$total,
        'db_prefix' => DB_PREFIX,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// 2. STOK GÜNCELLEME (Tek Ürün - Sipariş Sonrası veya Admin Düzenlemesi)
if ($action === 'update_stock') {
    $productId = isset($data['product_id']) ? (int)$data['product_id'] : 0;
    $sku = isset($data['sku']) ? trim($data['sku']) : '';
    $quantity = isset($data['quantity']) ? (int)$data['quantity'] : 0;
    $price = isset($data['price']) ? (float)$data['price'] : null;

    if ($productId <= 0 && empty($sku)) {
        echo json_encode(['success' => false, 'message' => 'product_id veya sku zorunludur.']);
        exit;
    }

    if ($productId > 0) {
        if ($price !== null && $price > 0) {
            $stmt = $pdo->prepare("UPDATE " . DB_PREFIX . "product SET quantity = :qty, price = :price, date_modified = NOW() WHERE product_id = :id");
            $stmt->execute([':qty' => $quantity, ':price' => $price, ':id' => $productId]);
        } else {
            $stmt = $pdo->prepare("UPDATE " . DB_PREFIX . "product SET quantity = :qty, date_modified = NOW() WHERE product_id = :id");
            $stmt->execute([':qty' => $quantity, ':id' => $productId]);
        }
    } else {
        $stmt = $pdo->prepare("UPDATE " . DB_PREFIX . "product SET quantity = :qty, date_modified = NOW() WHERE sku = :sku OR model = :sku");
        $stmt->execute([':qty' => $quantity, ':sku' => $sku]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'OpenCart stok güncellemesi başarılı.',
        'product_id' => $productId,
        'quantity' => $quantity
    ]);
    exit;
}

// 3. TOPLU STOK ÇEKME (OpenCart -> Yeni Site)
if ($action === 'get_stocks') {
    $stmt = $pdo->query("SELECT product_id, model, sku, quantity, price, status FROM " . DB_PREFIX . "product");
    $items = $stmt->fetchAll();
    echo json_encode([
        'success' => true,
        'total' => count($items),
        'products' => $items
    ]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Bilinmeyen işlem: ' . htmlspecialchars($action)]);
