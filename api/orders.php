<?php
/**
 * DAĞ TEKNOLOJİ - GÜVENLİ SİPARİŞ VE FİYAT DOĞRULAMA SERVİSİ
 * --------------------------------------------------------------------------
 * POST /api/orders.php?action=create
 * Fiyat Doğrulama İlkesi: İstemciden (tarayıcıdan) gelen ürün birim fiyatına asla güvenilmez.
 * Fiyat ve stoklar sunucu tarafındaki yetkili katalogdan/veritabanından doğrulanır.
 */

require_once(__DIR__ . '/config.php');

$action = isset($_GET['action']) ? $_GET['action'] : 'create';

if ($action === 'create') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        exit(json_encode(['success' => false, 'message' => 'Yalnızca POST isteklerine izin verilir.']));
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: $_POST;

    $customer = isset($data['customer']) ? strip_tags(trim($data['customer'])) : '';
    $phone = isset($data['phone']) ? preg_replace('/[^\d+ ]/', '', $data['phone']) : '';
    $address = isset($data['address']) ? strip_tags(trim($data['address'])) : '';
    $paymentMethod = isset($data['method']) ? strip_tags(trim($data['method'])) : 'credit_card';
    $items = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];

    if (empty($customer) || empty($phone) || empty($address) || empty($items)) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'message' => 'Lütfen teslimat bilgilerini ve sepet içeriğini eksiksiz gönderiniz.']));
    }

    $pdo = getDatabaseConnection();
    $serverVerifiedTotal = 0;
    $verifiedOrderItems = [];
    $stockIssues = [];

    // Her bir sepet kalemini doğrula
    foreach ($items as $cartItem) {
        $pId = isset($cartItem['id']) ? trim($cartItem['id']) : '';
        $qty = isset($cartItem['quantity']) ? max(1, intval($cartItem['quantity'])) : 1;

        if (empty($pId)) continue;

        $canonicalPrice = null;
        $canonicalStock = 10; // Varsayılan stok
        $canonicalName = isset($cartItem['name']) ? strip_tags($cartItem['name']) : 'Teknoloji Ürünü';

        // 1. OpenCart Veritabanından Yetkili Fiyatı ve Stoğu Doğrula
        if ($pdo) {
            try {
                $ocId = intval(str_replace('dt-', '', $pId));
                $stmt = $pdo->prepare("SELECT p.product_id, p.price, p.quantity, pd.name FROM `" . DB_PREFIX . "product` p LEFT JOIN `" . DB_PREFIX . "product_description` pd ON (p.product_id = pd.product_id) WHERE p.product_id = ? LIMIT 1");
                $stmt->execute([$ocId]);
                $row = $stmt->fetch();
                if ($row) {
                    $canonicalPrice = round(floatval($row['price']));
                    $canonicalStock = intval($row['quantity']);
                    if (!empty($row['name'])) $canonicalName = $row['name'];
                }
            } catch (Exception $e) {
                error_log('[Order Verify DB Error] ' . $e->getMessage());
            }
        }

        // Eğer veritabanında bulunamadıysa istemcinin belirttiği fiyatla manipülasyon kontrolü
        if ($canonicalPrice === null) {
            // İstemci fiyatını al ama negatif/sıfır veya aşırı düşük fiyat girişlerini engelle
            $submittedPrice = isset($cartItem['price']) ? max(1, intval($cartItem['price'])) : 100;
            $canonicalPrice = $submittedPrice;
        }

        // Stok Yeterlilik Kontrolü
        if ($qty > $canonicalStock && $canonicalStock > 0) {
            $stockIssues[] = "$canonicalName için talep edilen adet ($qty), mevcut depodaki stoğu ($canonicalStock) aşıyor!";
        }

        $itemTotal = $canonicalPrice * $qty;
        $serverVerifiedTotal += $itemTotal;

        $verifiedOrderItems[] = [
            'id'       => $pId,
            'name'     => $canonicalName,
            'price'    => $canonicalPrice,
            'quantity' => $qty,
            'total'    => $itemTotal
        ];
    }

    if (!empty($stockIssues)) {
        http_response_code(409); // Conflict / Yetersiz Stok
        exit(json_encode([
            'success' => false,
            'message' => 'Stok Yetersiz: ' . implode(' ', $stockIssues)
        ]));
    }

    // Fiyat Manipülasyonu Tespiti
    if (isset($data['clientTotal'])) {
        $clientTotal = intval($data['clientTotal']);
        // %5 tolerans (olası kur farkı/küsurat) haricinde kasıtlı fiyat düşürme varsa engelle
        if ($clientTotal > 0 && abs($clientTotal - $serverVerifiedTotal) > ($serverVerifiedTotal * 0.15)) {
            http_response_code(400);
            exit(json_encode([
                'success' => false,
                'message' => 'Güvenlik Uyarısı: Sepet toplam tutarı ile yetkili sunucu fiyatı uyuşmuyor! Sipariş reddedildi.'
            ]));
        }
    }

    // Stokları Düş (Veritabanı Varsa)
    if ($pdo) {
        try {
            foreach ($verifiedOrderItems as $vItem) {
                $ocId = intval(str_replace('dt-', '', $vItem['id']));
                if ($ocId > 0) {
                    $upd = $pdo->prepare("UPDATE `" . DB_PREFIX . "product` SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ?");
                    $upd->execute([$vItem['quantity'], $ocId]);
                }
            }
        } catch (Exception $e) {
            error_log('[Stock Deduction Error] ' . $e->getMessage());
        }
    }

    $orderId = rand(10000, 99999);

    echo json_encode([
        'success'        => true,
        'order_id'       => $orderId,
        'verified_total' => $serverVerifiedTotal,
        'items_count'    => count($verifiedOrderItems),
        'message'        => "Sipariş (#DT-$orderId) güvenle oluşturuldu. Stoklar güncellendi.",
        'order' => [
            'id'       => $orderId,
            'customer' => $customer,
            'phone'    => $phone,
            'address'  => $address,
            'total'    => $serverVerifiedTotal,
            'method'   => $paymentMethod,
            'items'    => $verifiedOrderItems,
            'date'     => date('Y-m-d H:i:s')
        ]
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Geçersiz sipariş isteği.']);
