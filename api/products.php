<?php
/**
 * DAĞ TEKNOLOJİ - GÜVENLİ ÜRÜN VE STOK YÖNETİM SERVİSİ
 * --------------------------------------------------------------------------
 * POST /api/products.php?action=update
 * Yalnızca geçerli ADMIN oturumuna sahip kullanıcılar ürün düzenleyebilir.
 */

require_once(__DIR__ . '/config.php');

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'update') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        exit(json_encode(['success' => false, 'message' => 'Yalnızca POST isteklerine izin verilir.']));
    }

    // 1. Yetki Kontrolü (Authentication & RBAC)
    $user = getAuthUserFromRequest();
    if (!$user || $user['role'] !== 'admin') {
        http_response_code(403);
        exit(json_encode(['success' => false, 'message' => 'Yetkisiz erişim! Ürün düzenlemek için yönetici girişi zorunludur.']));
    }

    // 2. Gelen Veriyi Al ve Temizle (Input Sanitization)
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: $_POST;

    $id = isset($data['id']) ? trim($data['id']) : '';
    $name = isset($data['name']) ? strip_tags(trim($data['name'])) : '';
    $price = isset($data['price']) ? max(0, intval($data['price'])) : null;
    $stock = isset($data['stock']) ? max(0, intval($data['stock'])) : null;
    $category = isset($data['category']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data['category']) : '';
    $brand = isset($data['brand']) ? strip_tags(trim($data['brand'])) : '';

    if (empty($id) || empty($name) || $price === null || $stock === null) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'Eksik veya geçersiz ürün parametreleri.']));
    }

    // 3. OpenCart Veritabanı Varsa Güncelle (Prepared Statement - SQL Injection Korumalı)
    $pdo = getDatabaseConnection();
    $ocUpdated = false;

    if ($pdo) {
        try {
            $ocId = intval(str_replace('dt-', '', $id));
            if ($ocId > 0) {
                // Stok ve Fiyat güncelleme
                $stmt = $pdo->prepare("UPDATE `" . DB_PREFIX . "product` SET quantity = ?, price = ?, date_modified = NOW() WHERE product_id = ?");
                $stmt->execute([$stock, $price, $ocId]);
                $ocUpdated = true;
            }
        } catch (Exception $e) {
            error_log('[Product Update DB Error] ' . $e->getMessage());
        }
    }

    echo json_encode([
        'success'       => true,
        'message'       => "Ürün (#$id) ve stok bilgisi sunucuda güvenle güncellendi.",
        'opencart_sync' => $ocUpdated,
        'product' => [
            'id'       => $id,
            'name'     => $name,
            'price'    => $price,
            'stock'    => $stock,
            'category' => $category,
            'brand'    => $brand
        ]
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Bilinmeyen işlem.']);
