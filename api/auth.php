<?php
/**
 * DAĞ TEKNOLOJİ - GÜVENLİ KİMLİK DOĞRULAMA SERVİSİ
 * --------------------------------------------------------------------------
 * POST /api/auth.php?action=login
 * GET  /api/auth.php?action=verify
 * POST /api/auth.php?action=logout
 */

require_once(__DIR__ . '/config.php');

$action = isset($_GET['action']) ? $_GET['action'] : 'login';
$clientIp = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';

// 1. OTURUM DOĞRULAMA (SESSION VERIFY)
if ($action === 'verify') {
    $user = getAuthUserFromRequest();
    if ($user) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id'    => $user['uid'],
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => $user['role']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Oturum geçersiz veya süresi dolmuş.']);
    }
    exit;
}

// 2. OTURUM KAPATMA (LOGOUT)
if ($action === 'logout') {
    setcookie('dag_auth_token', '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
    echo json_encode(['success' => true, 'message' => 'Oturum kapatıldı.']);
    exit;
}

// 3. KULLANICI GİRİŞİ (LOGIN)
if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Yalnızca POST isteklerine izin verilir.']);
        exit;
    }

    // Brute-force koruması (10 dakikada en fazla 5 başarısız deneme)
    if (!checkRateLimit($clientIp, 'login', 5, 10)) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'message' => 'Çok fazla başarısız giriş denemesi! Lütfen 10 dakika sonra tekrar deneyiniz.'
        ]);
        exit;
    }

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?: $_POST;

    $email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
    $password = isset($input['password']) ? trim($input['password']) : '';

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'E-posta ve şifre zorunludur.']);
        exit;
    }

    $authenticatedUser = null;

    // A) OpenCart Veritabanı Varsa Kontrol Et
    $pdo = getDatabaseConnection();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT user_id AS id, username, email, password FROM `" . DB_PREFIX . "user` WHERE (LOWER(email) = ? OR username = ?) AND status = 1 LIMIT 1");
            $stmt->execute([$email, $email]);
            $ocAdmin = $stmt->fetch();

            if ($ocAdmin) {
                // OpenCart SHA1 veya Bcrypt uyumluluğu
                $valid = password_verify($password, $ocAdmin['password']) || (sha1($ocAdmin['salt'] . sha1($ocAdmin['salt'] . sha1($password))) === $ocAdmin['password']);
                if ($valid) {
                    $authenticatedUser = [
                        'id'    => 'oc_admin_' . $ocAdmin['id'],
                        'name'  => $ocAdmin['username'],
                        'email' => $ocAdmin['email'],
                        'role'  => 'admin'
                    ];
                }
            }
        } catch (Exception $e) {
            error_log('[Auth OC DB Check Error] ' . $e->getMessage());
        }
    }

    // B) Sabit Güvenli Yetkili Yönetici Doğrulaması (BCrypt Hash Korumalı)
    // Şifreler kesinlikle düz metin saklanmaz.
    if (!$authenticatedUser) {
        $allowedSystemUsers = [
            [
                'id'       => 'usr-admin-sys',
                'name'     => 'Dağ Teknoloji Yönetici',
                'email'    => 'admin@dagteknoloji.com.tr',
                // password_hash('DagTech2026!Admin', PASSWORD_BCRYPT)
                'pw_hash'  => '$2y$10$gM.mX65wT1jE18K89y.60eV4sQj2m4xN3K0z1zE7P.rQ213q1oW.y',
                'role'     => 'admin'
            ]
        ];

        foreach ($allowedSystemUsers as $u) {
            if ($u['email'] === $email && password_verify($password, $u['pw_hash'])) {
                $authenticatedUser = [
                    'id'    => $u['id'],
                    'name'  => $u['name'],
                    'email' => $u['email'],
                    'role'  => $u['role']
                ];
                break;
            }
        }
    }

    if ($authenticatedUser) {
        resetRateLimit($clientIp, 'login');
        $token = generateSecureToken($authenticatedUser);

        // HttpOnly Güvenli Çerez Tanımla
        setcookie('dag_auth_token', $token, [
            'expires'  => time() + (86400 * 7),
            'path'     => '/',
            'httponly' => true,
            'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
            'samesite' => 'Strict'
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Giriş başarılı.',
            'token'   => $token,
            'user'    => $authenticatedUser
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Hatalı e-posta veya şifre girdiniz.'
        ]);
    }
    exit;
}
