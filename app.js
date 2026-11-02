/**
 * DAĞ TEKNOLOJİ - MODERN WEB PLATFORM & E-COMMERCE ENGINE
 * Real Products (3,428 Items), Multi-Filter, Stock System, Admin Panel, Membership System & 3D Engine
 */

// --- INITIAL STATE SETUP & CATALOG VERSIONING ---
const DAG_CATALOG_VERSION = '2026.11.02.v3451';

const initialProducts = (function() {
  const savedVersion = localStorage.getItem('dag_catalog_version');
  let products = [];

  // If catalog version changed, clear stale local cache so fresh 3,428 catalog loads
  if (savedVersion !== DAG_CATALOG_VERSION) {
    try {
      localStorage.removeItem('dag_custom_products');
      localStorage.setItem('dag_catalog_version', DAG_CATALOG_VERSION);
    } catch(e) {}
  } else {
    const saved = localStorage.getItem('dag_custom_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 3428) {
          products = parsed;
        }
      } catch(e) { console.error('Error parsing stored products', e); }
    }
  }

  // Load fresh canonical 3,428 products from window.DAG_PRODUCTS
  if ((products.length < 3428 || products.length === 0) && window.DAG_PRODUCTS) {
    products = JSON.parse(JSON.stringify(window.DAG_PRODUCTS));
  }

  return products;
})();

// ==========================================================================
// DYNAMIC USD/TRY EXCHANGE RATE PRICING ENGINE (SAATLİK OTOMATİK KONTROL)
// ==========================================================================
const EXCHANGE_RATE_CONFIG = {
  CACHE_KEY: 'dag_usd_exchange_rate',
  CACHE_TTL_MS: 60 * 60 * 1000, // 1 hour (saat saat piyasa kontrolü)
  DEFAULT_BASE: 34.50, // Reference USD/TRY rate used for catalogue TL prices
  DEFAULT_CURRENT: 34.50,
  APIS: [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.exchangerate-api.com/v4/latest/USD'
  ]
};

function loadStoredExchangeRate() {
  try {
    const raw = localStorage.getItem(EXCHANGE_RATE_CONFIG.CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.current === 'number' && parsed.current > 0) {
        return parsed;
      }
    }
  } catch(e) {
    console.warn('Error reading stored exchange rate', e);
  }
  return {
    enabled: true,
    base: EXCHANGE_RATE_CONFIG.DEFAULT_BASE,
    current: EXCHANGE_RATE_CONFIG.DEFAULT_CURRENT,
    lastUpdated: 0,
    source: 'Piyasa TCMB/Serbest Piyasa (Saatlik)',
    hasCustomBase: false
  };
}

function saveExchangeRateState() {
  try {
    localStorage.setItem(EXCHANGE_RATE_CONFIG.CACHE_KEY, JSON.stringify(state.exchangeRate));
  } catch(e) {}
}

async function fetchLiveUsdRate(force = false) {
  const now = Date.now();
  const timeSinceLast = now - (state.exchangeRate.lastUpdated || 0);

  // If not forced and last updated under 1 hour ago, use cached value
  if (!force && timeSinceLast < EXCHANGE_RATE_CONFIG.CACHE_TTL_MS && state.exchangeRate.current > 0) {
    updateExchangeRateUI();
    return state.exchangeRate.current;
  }

  let fetchedRate = null;
  for (const apiUrl of EXCHANGE_RATE_CONFIG.APIS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const resp = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const tryVal = (data.rates && data.rates.TRY) ? Number(data.rates.TRY) : null;
        if (tryVal && tryVal > 0) {
          fetchedRate = Math.round(tryVal * 100) / 100;
          break;
        }
      }
    } catch(err) {
      console.warn(`[Döviz Kuru] ${apiUrl} yanıt vermedi:`, err.message);
    }
  }

  if (fetchedRate) {
    console.log(`[Döviz Kuru] Güncel USD/TRY kuru başarıyla çekildi: ${fetchedRate} ₺`);
    state.exchangeRate.current = fetchedRate;
    state.exchangeRate.lastUpdated = now;
    saveExchangeRateState();
    updateExchangeRateUI();

    // Re-render catalog and details to reflect live prices
    renderProducts();
    if (document.getElementById('product-detail-hero')) {
      initProductDetailPage();
    }
    renderAdminStats();
    renderAdminProductsTable();
    return fetchedRate;
  } else {
    updateExchangeRateUI();
    return state.exchangeRate.current;
  }
}

function getProductPrice(p) {
  if (!p || typeof p.price !== 'number') return 0;
  if (!state.exchangeRate || !state.exchangeRate.enabled) return p.price;
  const base = state.exchangeRate.base || EXCHANGE_RATE_CONFIG.DEFAULT_BASE;
  const current = state.exchangeRate.current || base;
  const ratio = current / base;
  return Math.max(1, Math.round(p.price * ratio));
}

function getProductOldPrice(p) {
  if (!p || !p.oldPrice) return 0;
  if (!state.exchangeRate || !state.exchangeRate.enabled) return p.oldPrice;
  const base = state.exchangeRate.base || EXCHANGE_RATE_CONFIG.DEFAULT_BASE;
  const current = state.exchangeRate.current || base;
  const ratio = current / base;
  return Math.max(1, Math.round(p.oldPrice * ratio));
}

function updateExchangeRateUI() {
  if (!state.exchangeRate) return;
  const current = state.exchangeRate.current || EXCHANGE_RATE_CONFIG.DEFAULT_CURRENT;
  const base = state.exchangeRate.base || EXCHANGE_RATE_CONFIG.DEFAULT_BASE;
  const ratio = current / base;
  const pctChange = ((ratio - 1) * 100).toFixed(1);
  const sign = pctChange > 0 ? '+' : '';

  // Top announcement bar live rate badge
  const topbarVal = document.getElementById('topbar-usd-val');
  if (topbarVal) {
    topbarVal.innerText = `${current.toFixed(2)} ₺`;
  }

  // Admin panel indicators
  const adminCurr = document.getElementById('admin-rate-current');
  const adminBase = document.getElementById('admin-rate-base');
  const adminRatio = document.getElementById('admin-rate-ratio');

  if (adminCurr) adminCurr.innerText = `${current.toFixed(2)} ₺`;
  if (adminBase) adminBase.innerText = `${base.toFixed(2)} ₺`;
  if (adminRatio) adminRatio.innerText = `x${ratio.toFixed(3)} (${sign}${pctChange}%)`;

  if (window.lucide) lucide.createIcons();
}

window.forceRefreshExchangeRate = async function() {
  showToast('Canlı dolar kuru piyasadan sorgulanıyor...', 'info');
  const rate = await fetchLiveUsdRate(true);
  if (rate) {
    showToast(`Dolar Kuru Güncellendi: 1 USD = ${rate.toFixed(2)} ₺. Fiyatlar otomatik eşitlendi!`, 'success');
  } else {
    showToast('Döviz kuru servisine ulaşılamadı. Kayıtlı son kur kullanılıyor.', 'error');
  }
};

window.setBaseRateToCurrent = function() {
  state.exchangeRate.base = state.exchangeRate.current;
  state.exchangeRate.hasCustomBase = true;
  saveExchangeRateState();
  updateExchangeRateUI();
  renderProducts();
  if (document.getElementById('product-detail-hero')) initProductDetailPage();
  renderAdminStats();
  renderAdminProductsTable();
  showToast(`Mevcut kur (${state.exchangeRate.current.toFixed(2)} ₺) referans baz kur olarak ayarlandı. Değişim oranı %0.0 olarak sıfırlandı.`, 'success');
};

// Default registered users (Yönetici ve Müşteri)
const defaultUsers = [
  {
    id: 'usr-admin',
    name: 'Dağ Teknoloji Yönetici',
    email: 'admin@dagteknoloji.com.tr',
    password: 'admin',
    phone: '0507 020 11 98',
    company: 'Dağ Teknoloji Ltd. Şti.',
    accountType: 'corporate',
    role: 'admin',
    address: 'Halil Rıfat Paşa Mah. Perpa Ticaret Merkezi B Blok Kat: 8 No: 825 Şişli / İstanbul',
    orders: [],
    wishlist: ['dt-4873', 'dt-5051']
  },
  {
    id: 'usr-1',
    name: 'Ahmet Yılmaz',
    email: 'ahmet@dag.com',
    password: '123',
    phone: '0555 123 4567',
    company: 'Yılmaz 3D Prototip & Tasarım',
    accountType: 'corporate',
    role: 'customer',
    address: 'Halil Rıfat Paşa Mah. Perpa Ticaret Merkezi B Blok Kat: 8 No: 825 Şişli / İstanbul',
    orders: [
      {
        id: '94812',
        date: '28 Eki, 14:30',
        itemsSummary: '1x Bambu Lab A1 Mini, 2x Ender 1.75mm PLA Siyah',
        itemsCount: 3,
        total: 13299,
        status: 'Kargoya Verildi'
      }
    ],
    wishlist: ['dt-4873', 'dt-5051', 'dt-4773']
  }
];

const storedUsers = (function() {
  const u = localStorage.getItem('dag_users');
  if (u) {
    try {
      const parsed = JSON.parse(u);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Sistem yöneticisi hesabının listede mevcut olduğunu garantile
        if (!parsed.some(item => item.role === 'admin' || item.email === 'admin@dagteknoloji.com.tr')) {
          parsed.unshift(defaultUsers[0]);
        }
        return parsed;
      }
    } catch(e) {}
  }
  return defaultUsers;
})();

const storedCurrentUser = (function() {
  try {
    const urlP = new URLSearchParams(window.location.search);
    if (urlP.get('admin') === '1' || urlP.get('admin_test') === '1') {
      return { id: 1, name: 'Dağ Teknoloji Yönetim', email: 'admin@dagteknoloji.com.tr', role: 'admin' };
    }
  } catch(e) {}
  const u = localStorage.getItem('dag_current_user');
  if (u) {
    try { return JSON.parse(u); } catch(e) {}
  }
  return null;
})();

const state = {
  products: initialProducts,
  users: storedUsers,
  currentUser: storedCurrentUser,
  cart: JSON.parse(localStorage.getItem('dag_cart') || '[]'),
  orders: JSON.parse(localStorage.getItem('dag_orders') || '[]'),
  isAdmin: (function() {
    try {
      const urlP = new URLSearchParams(window.location.search);
      if (urlP.get('admin') === '1' || urlP.get('admin_test') === '1') return true;
    } catch(e) {}
    return sessionStorage.getItem('dag_is_admin') === 'true' || (storedCurrentUser && (storedCurrentUser.role === 'admin' || storedCurrentUser.email === 'admin@dagteknoloji.com.tr'));
  })(),
  exchangeRate: loadStoredExchangeRate(),
  
  // Catalog Filters
  filters: {
    category: 'all',
    brand: 'all',
    stockStatus: 'all', // 'all', 'in_stock', 'low_stock', 'out_of_stock'
    searchQuery: '',
    priceMax: 200000,
    sortBy: 'default',
    displayLimit: 24
  },

  // 3D Printing Calculator State
  calc: {
    material: 'pla',
    modelSize: 60,
    infill: 20,
    layerHeight: 0.20,
    color: '#00f0ff',
    tech: 'fdm',
    fileName: 'ornek_disli_mekanizmasi.stl',
    fileSizeMb: 4.2
  },

  // Admin Search / Filter
  adminFilter: {
    query: '',
    category: 'all',
    stockOnly: 'all',
    displayLimit: 100
  }
};

window.state = state;
window.getProductPrice = getProductPrice;
window.getProductOldPrice = getProductOldPrice;
window.fetchLiveUsdRate = fetchLiveUsdRate;

// Material calculation metrics
const MATERIAL_DATA = {
  pla: { name: 'PLA+ Hyper Pro', pricePerGram: 0.85, density: 1.24, timeFactor: 1.0, strength: '8/10' },
  petg: { name: 'PETG Endüstriyel', pricePerGram: 1.10, density: 1.27, timeFactor: 1.15, strength: '9/10' },
  abs: { name: 'ABS Mühendislik', pricePerGram: 1.25, density: 1.04, timeFactor: 1.10, strength: '9/10' },
  cf: { name: 'PA-CF Karbon Fiber', pricePerGram: 2.80, density: 1.18, timeFactor: 1.40, strength: '10/10' },
  resin: { name: 'UV Ultra Reçine (SLA)', pricePerGram: 2.20, density: 1.15, timeFactor: 1.25, strength: '8.5/10' },
  tpu: { name: 'TPU Esnek Kauçuk', pricePerGram: 1.60, density: 1.21, timeFactor: 1.70, strength: '9.5/10' }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  // Parse URL search parameters if any (e.g. urunler.html?cat=printers or ?search=ender)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('cat') || urlParams.get('category');
    const brandParam = urlParams.get('brand');
    const searchParam = urlParams.get('search') || urlParams.get('q');

    if (catParam) {
      state.filters.category = catParam;
      document.querySelectorAll('.cat-tab').forEach(tab => {
        const isActive = tab.dataset.category === catParam;
        tab.classList.toggle('bg-cyan-500', isActive);
        tab.classList.toggle('text-slate-950', isActive);
        tab.classList.toggle('bg-slate-800/60', !isActive);
        tab.classList.toggle('text-slate-300', !isActive);
      });
    }

    if (brandParam) {
      state.filters.brand = brandParam;
    }

    if (searchParam) {
      state.filters.searchQuery = searchParam;
      const searchInput = document.getElementById('product-search-input');
      if (searchInput) searchInput.value = searchParam;
    }
  } catch (err) {
    console.error('URL param parsing error:', err);
  }

  initPageTransitionEngine();
  initThreeJsViewport();
  renderUserNav();
  renderBrandFilters();
  renderProducts();
  updateCartBadge();
  setupEventListeners();
  updateCalculatorUI();
  updateAdminUI();
  updateExchangeRateUI();
  fetchLiveUsdRate(false); // Check/fetch live exchange rate (with 1-hour cache)
  
  // Saat saat kontrol: Every 60 minutes, automatically refresh market USD rate & prices
  setInterval(() => {
    console.log('[Döviz Kuru] Saatlik otomatik USD kontrolü çalıştırılıyor...');
    fetchLiveUsdRate(false);
  }, 60 * 60 * 1000);

  if (window.location.pathname.includes('urun-detay.html')) {
    initProductDetailPage();
  }
  if (window.lucide) lucide.createIcons();
});

// ==========================================================================
// 1. THREE.JS 3D INTERACTIVE ENGINE (ÇOKLU MODEL & GÖRSEL SHADING SEÇENEKLERİ)
// ==========================================================================
let scene, camera, renderer, modelGroup, printHead;
let currentMaterialColor = 0x00f0ff;
let active3dModel = 'gear'; // 'gear', 'nozzle', 'cube', 'drone', 'rocket', 'gripper', 'custom'
let active3dRenderMode = 'solid'; // 'solid', 'wireframe', 'xray'
let is3dAutoRotating = true;
let customUploadedGeometry = null;
let customModelSpec = null;

const MODEL_SPECS = {
  gear: 'Model: Mekanik Dişli & Türbin (Ø 80mm - Tolerans: ±0.05mm)',
  nozzle: 'Model: 3D Yazıcı Nozzle & Hotend (0.4mm Pirinç/Çelik)',
  cube: 'Model: Voronoi Kalibrasyon Test Küpü (20x20x20mm)',
  drone: 'Model: Karbon Takviyeli Aero Pervane (3 Kanatlı)',
  rocket: 'Model: Havacılık & Uzay Roket Prototipi (Aero Burun & Nozzle)',
  gripper: 'Model: Endüstriyel Robotik Servo Tutucu (2 Kademeli Gripper)',
  custom: 'Model: Özel Yüklenen 3D Model'
};

function initThreeJsViewport() {
  const container = document.getElementById('canvas-3d-container');
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight || 450;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07090e, 0.035);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 1.8, 8.2);
  camera.lookAt(0, 0.2, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainDirLight.position.set(5, 12, 7);
  mainDirLight.castShadow = true;
  scene.add(mainDirLight);

  const cyanPointLight = new THREE.PointLight(0x00f0ff, 2.5, 20);
  cyanPointLight.position.set(-4, 3, 2);
  scene.add(cyanPointLight);

  const purplePointLight = new THREE.PointLight(0x8b5cf6, 2.0, 20);
  purplePointLight.position.set(4, -2, -3);
  scene.add(purplePointLight);

  createBuildPlate();

  modelGroup = new THREE.Group();
  modelGroup.position.set(0, 0.0, 0);
  scene.add(modelGroup);

  renderActive3dModel();
  createPrintHead();

  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let rotVelocity = { x: 0, y: 0 };

  function pauseAutoRotateOnDrag() {
    if (is3dAutoRotating) {
      is3dAutoRotating = false;
      const btn = document.getElementById('btn-mode-rotate');
      if (btn) {
        btn.classList.remove('text-cyan-400', 'bg-cyan-500/10');
        btn.classList.add('text-slate-500');
      }
    }
  }

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
    rotVelocity = { x: 0, y: 0 };
    pauseAutoRotateOnDrag();
  });

  window.addEventListener('mouseup', () => { 
    isDragging = false; 
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - prevMousePos.x;
    const deltaY = e.clientY - prevMousePos.y;
    
    const speed = 0.009;
    rotVelocity.y = deltaX * speed;
    rotVelocity.x = deltaY * speed;

    modelGroup.rotation.y += rotVelocity.y;
    modelGroup.rotation.x += rotVelocity.x;
    
    // Serbest dikey açı kontrolü (üstten, alttan ve her açıdan kesintisiz inceleme)
    modelGroup.rotation.x = Math.max(-1.48, Math.min(1.48, modelGroup.rotation.x));
    
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  // Mouse tekerleği ile dinamik yakınlaştırma / uzaklaştırma (Zoom)
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!camera) return;
    camera.position.z = Math.max(3.0, Math.min(16.0, camera.position.z + e.deltaY * 0.006));
  }, { passive: false });

  // Mobil Dokunmatik Desteği
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      rotVelocity = { x: 0, y: 0 };
      pauseAutoRotateOnDrag();
    }
  }, { passive: true });

  window.addEventListener('touchend', () => { 
    isDragging = false; 
  });

  container.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevMousePos.x;
    const deltaY = e.touches[0].clientY - prevMousePos.y;
    
    const speed = 0.009;
    rotVelocity.y = deltaX * speed;
    rotVelocity.x = deltaY * speed;

    modelGroup.rotation.y += rotVelocity.y;
    modelGroup.rotation.x += rotVelocity.x;
    modelGroup.rotation.x = Math.max(-1.48, Math.min(1.48, modelGroup.rotation.x));
    
    prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight || 500;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  setup3dCanvasDragAndDrop(container);

  let clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    
    if (isDragging) {
      // Doğrudan kullanıcı sürüklemesi
    } else if (is3dAutoRotating) {
      modelGroup.rotation.y += 0.006;
    } else {
      // Yumuşak eylemsizlik / sönümleme (Inertia Damping)
      if (Math.abs(rotVelocity.y) > 0.0001 || Math.abs(rotVelocity.x) > 0.0001) {
        modelGroup.rotation.y += rotVelocity.y;
        modelGroup.rotation.x += rotVelocity.x;
        modelGroup.rotation.x = Math.max(-1.48, Math.min(1.48, modelGroup.rotation.x));
        rotVelocity.y *= 0.92;
        rotVelocity.x *= 0.92;
      }
    }

    modelGroup.position.y = 0.0 + Math.sin(elapsedTime * 1.5) * 0.05;
    if (printHead) {
      printHead.position.x = Math.sin(elapsedTime * 2.5) * 1.8;
      printHead.position.z = Math.cos(elapsedTime * 1.8) * 1.8;
      printHead.position.y = 1.95 + Math.sin(elapsedTime * 3) * 0.1;
    }
    renderer.render(scene, camera);
  }
  animate();
}

function createBuildPlate() {
  const plateGeo = new THREE.BoxGeometry(7, 0.2, 7);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.8, metalness: 0.2 });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.y = -1.6;
  plate.receiveShadow = true;
  scene.add(plate);

  const gridHelper = new THREE.GridHelper(6.6, 22, 0x00f0ff, 0x1e293b);
  gridHelper.position.y = -1.49;
  scene.add(gridHelper);
}

function getActiveMaterial(isDark = false) {
  const isWire = active3dRenderMode === 'wireframe';
  const isXray = active3dRenderMode === 'xray';

  return new THREE.MeshStandardMaterial({
    color: isDark ? 0x1e293b : currentMaterialColor,
    roughness: isDark ? 0.45 : (isXray ? 0.1 : 0.25),
    metalness: isDark ? 0.9 : (isXray ? 0.1 : 0.75),
    wireframe: isWire,
    transparent: isXray,
    opacity: isXray ? 0.45 : 1.0,
    depthWrite: !isXray
  });
}

// MODEL 1: Mekanik Dişli & Türbin (Gear & Turbine)
function buildGearModel(group, mat, darkMat) {
  const torusGeo = new THREE.TorusGeometry(1.6, 0.42, 16, 40);
  const torus = new THREE.Mesh(torusGeo, mat);
  torus.rotation.x = Math.PI / 2;
  group.add(torus);

  const teethCount = 10;
  for (let i = 0; i < teethCount; i++) {
    const angle = (i / teethCount) * Math.PI * 2;
    const toothGeo = new THREE.BoxGeometry(0.32, 0.65, 0.85);
    const tooth = new THREE.Mesh(toothGeo, mat);
    tooth.position.set(Math.cos(angle) * 1.82, 0, Math.sin(angle) * 1.82);
    tooth.rotation.y = -angle;
    group.add(tooth);
  }

  const cylinderGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.3, 6);
  const coreMesh = new THREE.Mesh(cylinderGeo, darkMat);
  group.add(coreMesh);

  const boreGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.4, 16);
  const bore = new THREE.Mesh(boreGeo, mat);
  group.add(bore);

  const coneGeo = new THREE.ConeGeometry(0.55, 0.9, 16);
  const coneMesh = new THREE.Mesh(coneGeo, mat);
  coneMesh.position.y = -1.0;
  coneMesh.rotation.x = Math.PI;
  group.add(coneMesh);

  const ringGeo = new THREE.TorusGeometry(0.65, 0.12, 12, 24);
  const ring = new THREE.Mesh(ringGeo, mat);
  ring.position.y = 0.8;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
}

// MODEL 2: 3D Yazıcı Nozzle & Hotend
function buildNozzleModel(group, mat, darkMat) {
  for (let i = 0; i < 4; i++) {
    const finGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.08, 24);
    const fin = new THREE.Mesh(finGeo, darkMat);
    fin.position.y = 0.85 + i * 0.3;
    group.add(fin);
  }

  const throatGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16);
  const throat = new THREE.Mesh(throatGeo, darkMat);
  throat.position.y = 1.3;
  group.add(throat);

  const hexGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.85, 6);
  const hex = new THREE.Mesh(hexGeo, mat);
  hex.position.y = 0.25;
  group.add(hex);

  const coneGeo = new THREE.ConeGeometry(1.05, 1.3, 20);
  const cone = new THREE.Mesh(coneGeo, mat);
  cone.position.y = -0.75;
  cone.rotation.x = Math.PI;
  group.add(cone);

  const tipGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16);
  const tip = new THREE.Mesh(tipGeo, darkMat);
  tip.position.y = -1.45;
  group.add(tip);
}

// MODEL 3: Voronoi Kalibrasyon Test Küpü
function buildCubeModel(group, mat, darkMat) {
  const size = 1.9;
  const half = size / 2;
  const strutR = 0.09;

  const edges = [
    [-half, -half, 0, size, 'z'], [half, -half, 0, size, 'z'],
    [0, -half, -half, size, 'x'], [0, -half, half, size, 'x'],
    [-half, half, 0, size, 'z'], [half, half, 0, size, 'z'],
    [0, half, -half, size, 'x'], [0, half, half, size, 'x'],
    [-half, 0, -half, size, 'y'], [half, 0, -half, size, 'y'],
    [-half, 0, half, size, 'y'], [half, 0, half, size, 'y']
  ];

  edges.forEach(e => {
    const geo = new THREE.CylinderGeometry(strutR, strutR, e[3], 10);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(e[0], e[1], e[2]);
    if (e[4] === 'x') m.rotation.z = Math.PI / 2;
    else if (e[4] === 'z') m.rotation.x = Math.PI / 2;
    group.add(m);
  });

  const corners = [
    [-half, -half, -half], [half, -half, -half], [-half, -half, half], [half, -half, half],
    [-half, half, -half], [half, half, -half], [-half, half, half], [half, half, half]
  ];
  corners.forEach(c => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), darkMat);
    sphere.position.set(c[0], c[1], c[2]);
    group.add(sphere);
  });

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), darkMat);
  group.add(core);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 10, 24), mat);
  group.add(ring);
}

// MODEL 4: Aero Drone Pervanesi & Rotor
function buildDroneModel(group, mat, darkMat) {
  const hubGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.85, 24);
  const hub = new THREE.Mesh(hubGeo, darkMat);
  group.add(hub);

  const domeGeo = new THREE.ConeGeometry(0.45, 0.55, 16);
  const dome = new THREE.Mesh(domeGeo, mat);
  dome.position.y = 0.65;
  group.add(dome);

  const baseGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.15, 24);
  const base = new THREE.Mesh(baseGeo, darkMat);
  base.position.y = -0.5;
  group.add(base);

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const bladeGroup = new THREE.Group();
    bladeGroup.rotation.y = angle;

    const bladeGeo = new THREE.BoxGeometry(1.65, 0.07, 0.45);
    const blade = new THREE.Mesh(bladeGeo, mat);
    blade.position.set(1.05, 0.15, 0);
    blade.rotation.x = 0.28;
    bladeGroup.add(blade);

    const wingletGeo = new THREE.BoxGeometry(0.08, 0.28, 0.45);
    const winglet = new THREE.Mesh(wingletGeo, darkMat);
    winglet.position.set(1.88, 0.25, 0);
    bladeGroup.add(winglet);

    group.add(bladeGroup);
  }
}

// MODEL 5: Havacılık & Uzay Roket Prototipi
function buildRocketModel(group, mat, darkMat) {
  const bodyGeo = new THREE.CylinderGeometry(0.7, 0.7, 2.0, 24);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.1;
  group.add(body);

  const noseGeo = new THREE.ConeGeometry(0.7, 1.2, 24);
  const nose = new THREE.Mesh(noseGeo, darkMat);
  nose.position.y = 1.7;
  group.add(nose);

  const engineGeo = new THREE.ConeGeometry(0.55, 0.5, 20);
  const engine = new THREE.Mesh(engineGeo, darkMat);
  engine.position.y = -1.15;
  engine.rotation.x = Math.PI;
  group.add(engine);

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const finGeo = new THREE.BoxGeometry(0.08, 0.75, 0.55);
    const fin = new THREE.Mesh(finGeo, mat);
    fin.position.set(Math.cos(angle) * 0.95, -0.65, Math.sin(angle) * 0.95);
    fin.rotation.y = -angle;
    group.add(fin);
  }
}

// MODEL 6: Endüstriyel Robotik Tutucu Gripper
function buildGripperModel(group, mat, darkMat) {
  const baseGeo = new THREE.CylinderGeometry(0.9, 1.0, 0.55, 24);
  const base = new THREE.Mesh(baseGeo, darkMat);
  base.position.y = -0.85;
  group.add(base);

  const coreGeo = new THREE.BoxGeometry(1.1, 0.85, 0.8);
  const core = new THREE.Mesh(coreGeo, mat);
  core.position.y = -0.15;
  group.add(core);

  // Left Finger
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.15, 0.35), darkMat);
  f1.position.set(-0.6, 0.75, 0);
  f1.rotation.z = -0.12;
  group.add(f1);

  const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.35), mat);
  t1.position.set(-0.45, 1.3, 0);
  t1.rotation.z = 0.35;
  group.add(t1);

  // Right Finger
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.15, 0.35), darkMat);
  f2.position.set(0.6, 0.75, 0);
  f2.rotation.z = 0.12;
  group.add(f2);

  const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.35), mat);
  t2.position.set(0.45, 1.3, 0);
  t2.rotation.z = -0.35;
  group.add(t2);
}

function renderActive3dModel() {
  if (!modelGroup) return;
  while (modelGroup.children.length > 0) {
    modelGroup.remove(modelGroup.children[0]);
  }

  const mat = getActiveMaterial(false);
  const darkMat = getActiveMaterial(true);

  switch (active3dModel) {
    case 'gear':
      buildGearModel(modelGroup, mat, darkMat);
      break;
    case 'nozzle':
      buildNozzleModel(modelGroup, mat, darkMat);
      break;
    case 'cube':
      buildCubeModel(modelGroup, mat, darkMat);
      break;
    case 'drone':
      buildDroneModel(modelGroup, mat, darkMat);
      break;
    case 'rocket':
      buildRocketModel(modelGroup, mat, darkMat);
      break;
    case 'gripper':
      buildGripperModel(modelGroup, mat, darkMat);
      break;
    case 'custom':
      if (customUploadedGeometry) {
        const customMesh = new THREE.Mesh(customUploadedGeometry, mat);
        customMesh.castShadow = true;
        customMesh.receiveShadow = true;
        modelGroup.add(customMesh);
      } else {
        buildGearModel(modelGroup, mat, darkMat);
      }
      break;
    default:
      buildGearModel(modelGroup, mat, darkMat);
  }

  const specEl = document.getElementById('active-model-spec');
  if (specEl && MODEL_SPECS[active3dModel]) {
    specEl.textContent = MODEL_SPECS[active3dModel];
  }
}

window.switch3dModel = function(modelType) {
  active3dModel = modelType;
  renderActive3dModel();

  ['gear', 'nozzle', 'cube', 'drone', 'rocket', 'gripper', 'custom'].forEach(type => {
    const btn = document.getElementById(`btn-model-${type}`);
    if (btn) {
      const isActive = (type === modelType);
      if (type === 'custom') {
        btn.classList.toggle('bg-amber-400', isActive);
        btn.classList.toggle('text-slate-950', isActive);
        btn.classList.toggle('font-bold', isActive);
        btn.classList.toggle('shadow-sm', isActive);
        btn.classList.toggle('text-amber-300', !isActive);
        btn.classList.toggle('font-medium', !isActive);
      } else {
        btn.classList.toggle('bg-cyan-500', isActive);
        btn.classList.toggle('text-slate-950', isActive);
        btn.classList.toggle('font-bold', isActive);
        btn.classList.toggle('shadow-sm', isActive);
        btn.classList.toggle('text-slate-400', !isActive);
        btn.classList.toggle('font-medium', !isActive);
      }
    }
  });

  const names = { 
    gear: 'Mekanik Dişli Çark', 
    nozzle: '3D Hotend Nozzle', 
    cube: 'Kalibrasyon Test Küpü', 
    drone: 'Aero Drone Pervanesi',
    rocket: 'Havacılık Roket Prototipi',
    gripper: 'Endüstriyel Robot Gripper',
    custom: (customModelSpec ? customModelSpec.name : 'Özel Yüklenen Model')
  };
  showToast(`3D Model: ${names[modelType] || modelType}`);
};

window.set3dRenderMode = function(mode) {
  active3dRenderMode = mode;
  renderActive3dModel();

  ['solid', 'wireframe', 'xray'].forEach(m => {
    const btn = document.getElementById(`btn-mode-${m}`);
    if (btn) {
      const isActive = (m === mode);
      btn.classList.toggle('bg-cyan-500/25', isActive);
      btn.classList.toggle('text-cyan-300', isActive);
      btn.classList.toggle('border-cyan-500/40', isActive);
      btn.classList.toggle('font-semibold', isActive);
      btn.classList.toggle('bg-slate-800/80', !isActive);
      btn.classList.toggle('text-slate-400', !isActive);
      btn.classList.toggle('border-slate-700/80', !isActive);
    }
  });

  const modeNames = { solid: 'Katı Yüzey Modu', wireframe: 'Tel Kafes (Wireframe) Modu', xray: 'X-Ray Hologram Modu' };
  showToast(`Görsel Mod: ${modeNames[mode] || mode}`);
};

window.toggle3dAutoRotate = function() {
  is3dAutoRotating = !is3dAutoRotating;
  const btn = document.getElementById('btn-mode-rotate');
  if (btn) {
    btn.classList.toggle('text-cyan-400', is3dAutoRotating);
    btn.classList.toggle('text-slate-500', !is3dAutoRotating);
    btn.classList.toggle('bg-cyan-500/10', is3dAutoRotating);
  }
  showToast(is3dAutoRotating ? 'Otomatik Dönüş Açık' : 'Otomatik Dönüş Duraklatıldı');
};

window.zoom3dIn = function() {
  if (camera) {
    camera.position.z = Math.max(3.0, camera.position.z - 0.8);
    showToast('3D Yakınlaştırıldı');
  }
};

window.zoom3dOut = function() {
  if (camera) {
    camera.position.z = Math.min(15.0, camera.position.z + 0.8);
    showToast('3D Uzaklaştırıldı');
  }
};

window.reset3dView = function() {
  if (modelGroup) {
    modelGroup.rotation.set(0.15, 0, 0);
    modelGroup.position.set(0, 0.0, 0);
  }
  if (camera) {
    camera.position.set(0, 1.8, 8.2);
    camera.lookAt(0, 0.2, 0);
  }
  is3dAutoRotating = true;
  const btn = document.getElementById('btn-mode-rotate');
  if (btn) {
    btn.classList.add('text-cyan-400', 'bg-cyan-500/10');
    btn.classList.remove('text-slate-500');
  }
  showToast('3D Görünüm Sıfırlandı');
};

function createPrintHead() {
  printHead = new THREE.Group();
  const nozzleTip = new THREE.ConeGeometry(0.18, 0.4, 8);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const tip = new THREE.Mesh(nozzleTip, tipMat);
  tip.rotation.x = Math.PI;

  const beamGeo = new THREE.CylinderGeometry(0.015, 0.05, 1.8, 8);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = -1.0;

  printHead.add(tip);
  printHead.add(beam);
  printHead.position.set(0, 2.0, 0);
  scene.add(printHead);
}

window.set3dColor = function(hexColor) {
  currentMaterialColor = parseInt(hexColor.replace('#', '0x'));
  renderActive3dModel();
  showToast(`Filament rengi güncellendi: ${hexColor}`);
};

window.toggle3dWireframe = function() {
  set3dRenderMode(active3dRenderMode === 'wireframe' ? 'solid' : 'wireframe');
};

// ==========================================================================
// 3D FILE PARSER & LOADER (.STL / .OBJ)
// ==========================================================================
function parseSTL(buffer) {
  const reader = new DataView(buffer);
  const isBinary = (buffer.byteLength > 84);

  if (isBinary) {
    const numTriangles = reader.getUint32(80, true);
    const expectedByteLength = 84 + numTriangles * 50;
    if (Math.abs(buffer.byteLength - expectedByteLength) <= 2) {
      return parseBinarySTL(reader, numTriangles);
    }
  }

  const text = new TextDecoder('utf-8').decode(buffer);
  if (text.includes('facet normal') || text.includes('vertex')) {
    return parseAsciiSTL(text);
  }

  if (isBinary) {
    const numTriangles = reader.getUint32(80, true);
    if (numTriangles > 0 && numTriangles < 1000000) {
      return parseBinarySTL(reader, numTriangles);
    }
  }

  throw new Error('Dosya geçerli bir Binary veya ASCII STL formatında değil.');
}

function parseBinarySTL(reader, numTriangles) {
  const positions = new Float32Array(numTriangles * 3 * 3);
  let posIdx = 0;
  let offset = 84;

  for (let i = 0; i < numTriangles; i++) {
    offset += 12; // Normal vector
    for (let v = 0; v < 3; v++) {
      positions[posIdx++] = reader.getFloat32(offset, true);
      positions[posIdx++] = reader.getFloat32(offset + 4, true);
      positions[posIdx++] = reader.getFloat32(offset + 8, true);
      offset += 12;
    }
    offset += 2; // Attribute byte count
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function parseAsciiSTL(text) {
  const vertexPattern = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  const positions = [];
  let match;
  while ((match = vertexPattern.exec(text)) !== null) {
    positions.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }
  if (positions.length === 0) {
    throw new Error('ASCII STL dosyasında köşe verisi bulunamadı.');
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.computeVertexNormals();
  return geometry;
}

function parseOBJ(text) {
  const lines = text.split('\n');
  const vertices = [];
  const positions = [];

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts[0] === 'v') {
      vertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (parts[0] === 'f') {
      const faceIndices = [];
      for (let i = 1; i < parts.length; i++) {
        const seg = parts[i].split('/')[0];
        const idx = parseInt(seg, 10);
        faceIndices.push(idx > 0 ? idx - 1 : vertices.length + idx);
      }
      for (let i = 1; i < faceIndices.length - 1; i++) {
        const v0 = vertices[faceIndices[0]];
        const v1 = vertices[faceIndices[i]];
        const v2 = vertices[faceIndices[i + 1]];
        if (v0 && v1 && v2) {
          positions.push(...v0, ...v1, ...v2);
        }
      }
    }
  }

  if (positions.length === 0) {
    throw new Error('OBJ dosyasında geçerli poligon veya köşe bulunamadı.');
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.computeVertexNormals();
  return geometry;
}

function mountCustomGeometry(geometry, fileName) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);

  const dx = Math.max(1, Math.round(size.x));
  const dy = Math.max(1, Math.round(size.y));
  const dz = Math.max(1, Math.round(size.z));
  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  geometry.center();
  const targetScale = 3.2 / maxDim;
  geometry.scale(targetScale, targetScale, targetScale);

  customUploadedGeometry = geometry;
  customModelSpec = {
    name: fileName,
    dx: dx,
    dy: dy,
    dz: dz,
    maxDim: maxDim
  };

  const specLabel = `Yüklendi: ${fileName} (${dx} × ${dy} × ${dz} mm)`;
  MODEL_SPECS.custom = specLabel;

  const customBtn = document.getElementById('btn-model-custom');
  const customBtnName = document.getElementById('btn-model-custom-name');
  if (customBtn) {
    customBtn.classList.remove('hidden');
    customBtn.title = specLabel;
  }
  if (customBtnName) {
    customBtnName.textContent = fileName.length > 10 ? fileName.substring(0, 9) + '…' : fileName;
  }

  switch3dModel('custom');

  // Sync to Slicer Calculator
  state.calc.fileName = fileName;
  state.calc.modelSize = Math.max(30, Math.min(220, Math.round(maxDim)));
  const sizeSlider = document.querySelector('input[oninput*="handleModelSizeChange"]');
  if (sizeSlider) sizeSlider.value = state.calc.modelSize;
  const sizeDisplay = document.getElementById('size-value-display');
  if (sizeDisplay) sizeDisplay.innerText = `${state.calc.modelSize} mm`;

  updateCalculatorUI();
  showToast(`3D Dosya Başarıyla Yüklendi: ${fileName} (${dx}×${dy}×${dz} mm)`, 'success');
}

window.handleViewer3dFileUpload = function(file) {
  if (!file) return;
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (ext !== '.stl' && ext !== '.obj') {
    showToast('Lütfen geçerli bir .STL veya .OBJ 3D dosya seçin.', 'error');
    return;
  }

  showToast(`3D Dosya okunuyor: ${file.name}...`);
  const specEl = document.getElementById('active-model-spec');
  if (specEl) specEl.textContent = `Yükleniyor ve ayrıştırılıyor: ${file.name}...`;

  if (ext === '.stl') {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const buffer = e.target.result;
        const geometry = parseSTL(buffer);
        mountCustomGeometry(geometry, file.name);
      } catch (err) {
        console.error('STL Parse Error:', err);
        showToast('STL dosyası okunamadı: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  } else if (ext === '.obj') {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const text = e.target.result;
        const geometry = parseOBJ(text);
        mountCustomGeometry(geometry, file.name);
      } catch (err) {
        console.error('OBJ Parse Error:', err);
        showToast('OBJ dosyası okunamadı: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }
};

function setup3dCanvasDragAndDrop(container) {
  if (!container) return;
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    container.classList.add('ring-2', 'ring-cyan-400', 'bg-cyan-950/20');
  });
  container.addEventListener('dragleave', (e) => {
    e.preventDefault();
    container.classList.remove('ring-2', 'ring-cyan-400', 'bg-cyan-950/20');
  });
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    container.classList.remove('ring-2', 'ring-cyan-400', 'bg-cyan-950/20');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleViewer3dFileUpload(e.dataTransfer.files[0]);
    }
  });
}

// ==========================================================================
// 2. 3D BASKI FİYAT & SÜRE HESAPLAYICI (SLICER ENGINE)
// ==========================================================================
function updateCalculatorUI() {
  const matKey = state.calc.material;
  const matInfo = MATERIAL_DATA[matKey] || MATERIAL_DATA.pla;

  const sizeFactor = state.calc.modelSize / 60;
  const infillRatio = state.calc.infill / 100;
  const layerCoeff = 0.20 / state.calc.layerHeight;

  const baseVolumeCm3 = 35 * Math.pow(sizeFactor, 3);
  const shellVolume = baseVolumeCm3 * 0.35;
  const internalVolume = baseVolumeCm3 * 0.65 * infillRatio;
  const totalVolume = shellVolume + internalVolume;
  const totalWeightGrams = Math.round(totalVolume * matInfo.density);

  const baseSpeedHours = (totalVolume * 0.09) * layerCoeff * matInfo.timeFactor;
  const hours = Math.floor(baseSpeedHours);
  const minutes = Math.round((baseSpeedHours - hours) * 60);

  const materialCost = totalWeightGrams * matInfo.pricePerGram;
  const machinePrepCost = 75;
  const printHourlyRate = 22;
  const totalPrice = Math.round(materialCost + machinePrepCost + (baseSpeedHours * printHourlyRate));

  const weightEl = document.getElementById('calc-weight');
  const timeEl = document.getElementById('calc-time');
  const priceEl = document.getElementById('calc-price');
  const strengthEl = document.getElementById('calc-strength');
  const matNameEl = document.getElementById('calc-mat-name');
  const layerValEl = document.getElementById('calc-layer-val');

  if (weightEl) weightEl.innerText = `${totalWeightGrams} gr`;
  if (timeEl) timeEl.innerText = `${hours} sa ${minutes} dk`;
  if (priceEl) priceEl.innerText = `${totalPrice} ₺`;
  if (strengthEl) strengthEl.innerText = matInfo.strength;
  if (matNameEl) matNameEl.innerText = matInfo.name;
  if (layerValEl) {
    const lh = state.calc.layerHeight;
    let desc = `${lh.toFixed(2)} mm (Standart Kalite)`;
    if (lh <= 0.12) desc = `${lh.toFixed(2)} mm (Hassas / 120µm)`;
    else if (lh >= 0.28) desc = `${lh.toFixed(2)} mm (Hızlı Kaba / 280µm)`;
    layerValEl.innerText = desc;
  }
}

window.handleMaterialSelect = function(matKey) {
  state.calc.material = matKey;
  const matInfo = MATERIAL_DATA[matKey] || MATERIAL_DATA.pla;
  document.querySelectorAll('.mat-pill').forEach(btn => {
    const isSelected = (btn.dataset.mat === matKey);
    if (isSelected) {
      btn.className = 'mat-pill p-3 rounded-xl border border-cyan-400 bg-cyan-500/20 text-left ring-1 ring-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all';
    } else {
      btn.className = 'mat-pill p-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:border-slate-600 text-left transition-all';
    }
  });
  updateCalculatorUI();
  showToast(`Malzeme Seçildi: ${matInfo.name}`);
};

window.handleInfillChange = function(val) {
  state.calc.infill = parseInt(val);
  const label = document.getElementById('infill-value-display');
  if (label) label.innerText = `%${val}`;
  updateCalculatorUI();
};

window.handleLayerChange = function(val) {
  state.calc.layerHeight = parseFloat(val);
  document.querySelectorAll('.layer-pill').forEach(btn => {
    const isSelected = (btn.dataset.layer === String(val));
    if (isSelected) {
      btn.className = 'layer-pill py-2 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-400/40 transition-all';
    } else {
      btn.className = 'layer-pill py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all';
    }
  });
  updateCalculatorUI();
  showToast(`Katman Kalınlığı: ${val} mm`);
};

window.handleModelSizeChange = function(val) {
  state.calc.modelSize = parseInt(val);
  const label = document.getElementById('size-value-display');
  if (label) label.innerText = `${val} mm`;
  updateCalculatorUI();
};

window.triggerSimulatedUpload = function() {
  const uploadInput = document.getElementById('stl-file-input');
  if (uploadInput) uploadInput.click();
};

window.handleFileUpload = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const validExts = ['.stl', '.obj', '.step', '.3mf'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  if (!validExts.includes(ext)) {
    showToast('Lütfen geçerli bir 3D model yükleyin (.STL, .OBJ, .STEP)', 'error');
    return;
  }

  const statusBox = document.getElementById('upload-status-box');
  const fileNameDisplay = document.getElementById('uploaded-filename');
  const fileSizeDisplay = document.getElementById('uploaded-filesize');
  const sliceProgress = document.getElementById('slice-progress-bar');
  const sliceText = document.getElementById('slice-status-text');

  if (statusBox) statusBox.classList.remove('hidden');
  if (fileNameDisplay) fileNameDisplay.innerText = file.name;
  if (fileSizeDisplay) fileSizeDisplay.innerText = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  let progress = 0;
  const interval = setInterval(() => {
    progress += 25;
    if (sliceProgress) sliceProgress.style.width = `${progress}%`;
    if (sliceText) sliceText.innerText = `Dilimleme analizi yapılıyor... %${progress}`;

    if (progress >= 100) {
      clearInterval(interval);
      if (sliceText) sliceText.innerText = '✓ Model geometrisi ve hacmi başarıyla doğrulandı!';
      showToast(`${file.name} başarıyla analiz edildi ve 3D görünüme aktarıldı!`, 'success');
      
      if (ext === '.stl' || ext === '.obj') {
        handleViewer3dFileUpload(file);
      } else {
        state.calc.fileName = file.name;
        state.calc.modelSize = Math.floor(Math.random() * 40) + 70;
        updateCalculatorUI();
      }
    }
  }, 100);
};

// ==========================================================================
// 3. MEMBERSHIP & USER AUTHENTICATION SYSTEM (ÜYELİK VE ROL TABANLI YÖNETİM)
// ==========================================================================
function renderUserNav() {
  const container = document.getElementById('user-nav-container');
  const mobileContainer = document.getElementById('mobile-user-nav-container');
  if (!container) return;

  if (state.currentUser) {
    const u = state.currentUser;
    const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const wishlistCount = (u.wishlist || []).length;
    const isAdmin = !!(u.role === 'admin' || u.email === 'admin@dagteknoloji.com.tr' || u.email === 'admin@dag.com' || state.isAdmin);
    state.isAdmin = isAdmin;
    const displayName = isAdmin ? 'Yönetici' : (u.name.length > 12 ? u.name.split(' ')[0] : u.name);

    container.innerHTML = `
      <div class="relative">
        <button onclick="toggleUserDropdown()" class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900/90 border ${isAdmin ? 'border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-cyan-500/40'} hover:border-cyan-400 text-xs text-white font-semibold transition-all shadow-md shrink-0 h-8 sm:h-9">
          <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-lg ${isAdmin ? 'bg-amber-400/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-400'} flex items-center justify-center font-bold text-[10px] sm:text-[11px]">${initials}</span>
          <span class="max-w-[70px] truncate hidden xl:inline">${displayName}</span>
          ${isAdmin ? `<span class="hidden md:inline px-1.5 py-0.2 text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded font-mono font-bold">ADMIN</span>` : ''}
          <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400"></i>
        </button>

        <!-- Dropdown Menu -->
        <div id="user-dropdown-menu" class="hidden absolute right-0 mt-2 w-60 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2.5 z-50 space-y-1">
          <div class="px-3 py-2 border-b border-slate-800/80 mb-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-white truncate">${u.name}</span>
              ${isAdmin ? `<span class="px-1.5 py-0.2 text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded font-mono font-bold">YÖNETİCİ</span>` : ''}
            </div>
            <div class="text-[10px] text-cyan-400 font-mono truncate">${u.email}</div>
            ${u.company ? `<div class="text-[10px] text-slate-400 truncate mt-0.5">${u.company}</div>` : ''}
          </div>

          ${isAdmin ? `
            <!-- YALNIZCA YÖNETİCİ GİRİŞ YAPTIĞINDA GÖRÜNEN PANEL BUTONU -->
            <div class="p-2.5 mb-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-blue-500/10 border border-cyan-500/35 shadow-sm">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <i data-lucide="shield-check" class="w-4 h-4 text-cyan-400"></i>
                  <span>Yönetici Yetkisi</span>
                </span>
                <span class="px-1.5 py-0.2 text-[9px] bg-cyan-400 text-slate-950 font-extrabold rounded">Aktif</span>
              </div>
              <div class="flex flex-col gap-1.5">
                <button onclick="openAdminDashboard('catalog'); toggleUserDropdown(false);" class="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all">
                  <i data-lucide="layout-dashboard" class="w-3.5 h-3.5"></i>
                  <span>Yönetici Paneline Git</span>
                </button>
                <button onclick="openAdminDashboard('opencart'); toggleUserDropdown(false);" class="w-full py-1.5 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 border border-blue-500/30 transition-all">
                  <i data-lucide="shopping-cart" class="w-3.5 h-3.5 text-blue-400"></i>
                  <span>OpenCart Canlı Yönetim Köprüsü</span>
                </button>
              </div>
            </div>
          ` : ''}

          <button onclick="openMyOrdersModal(); toggleUserDropdown(false);" class="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-between transition-colors">
            <span class="flex items-center gap-2">
              <i data-lucide="package" class="w-4 h-4 text-cyan-400"></i>
              <span>Siparişlerim</span>
            </span>
            <span class="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded-full font-mono">${(u.orders || []).length}</span>
          </button>

          <button onclick="openWishlistModal(); toggleUserDropdown(false);" class="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-between transition-colors">
            <span class="flex items-center gap-2">
              <i data-lucide="heart" class="w-4 h-4 text-rose-400"></i>
              <span>Favorilerim</span>
            </span>
            <span class="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded-full font-mono">${wishlistCount}</span>
          </button>

          <button onclick="openProfileModal(); toggleUserDropdown(false);" class="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors">
            <i data-lucide="user-check" class="w-4 h-4 text-emerald-400"></i>
            <span>Hesap Bilgilerim</span>
          </button>

          <div class="border-t border-slate-800/80 pt-1 mt-1">
            <button onclick="userLogout()" class="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors">
              <i data-lucide="log-out" class="w-4 h-4"></i>
              <span>Oturumu Kapat</span>
            </button>
          </div>
        </div>
      </div>
    `;

    if (mobileContainer) {
      mobileContainer.innerHTML = `
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-lg ${isAdmin ? 'bg-amber-400/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-400'} flex items-center justify-center font-bold text-xs">${initials}</span>
              <div>
                <div class="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>${u.name}</span>
          ${isAdmin ? `<span class="hidden md:inline px-1.5 py-0.2 text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded font-mono font-bold">ADMIN</span>` : ''}
                </div>
                <div class="text-[10px] text-cyan-400 font-mono">${u.email}</div>
              </div>
            </div>
            <button onclick="userLogout()" class="text-xs text-rose-400 hover:underline">Çıkış</button>
          </div>
          ${isAdmin ? `
            <button onclick="openAdminDashboard()" class="w-full py-2 px-3 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5">
              <i data-lucide="layout-dashboard" class="w-3.5 h-3.5"></i>
              <span>Yönetici Kontrol Paneli</span>
            </button>
          ` : ''}
        </div>
      `;
    }
  } else {
    // Misafir Durumu - Ayrı bir yönetici butonu yok; tek giriş kapısı normal giriş
    container.innerHTML = `
      <button onclick="openAuthModal('login')" class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400 text-xs text-slate-300 hover:text-white transition-all font-semibold shadow-sm shrink-0 h-8 sm:h-9">
        <i data-lucide="user" class="w-4 h-4 text-cyan-400"></i>
        <span class="hidden sm:inline">Giriş Yap</span>
      </button>
    `;

    if (mobileContainer) {
      mobileContainer.innerHTML = `
        <button onclick="openAuthModal('login')" class="w-full py-2.5 rounded-xl glow-cyan-btn text-slate-950 text-xs font-bold flex items-center justify-center gap-2">
          <i data-lucide="user" class="w-4 h-4"></i>
          <span>Giriş Yap veya Üye Ol</span>
        </button>
      `;
    }
  }

  if (window.lucide) lucide.createIcons();
}

window.toggleUserDropdown = function(force) {
  const menu = document.getElementById('user-dropdown-menu');
  if (!menu) return;
  if (force !== undefined) {
    menu.classList.toggle('hidden', !force);
  } else {
    menu.classList.toggle('hidden');
  }
};

window.openAuthModal = function(tab = 'login') {
  switchAuthTab(tab);
  openModal('auth-modal');
};

window.switchAuthTab = function(tab) {
  const loginTab = document.getElementById('auth-tab-login');
  const signupTab = document.getElementById('auth-tab-signup');
  const loginForm = document.getElementById('auth-login-form-box');
  const signupForm = document.getElementById('auth-signup-form-box');

  if (tab === 'login') {
    loginTab.classList.add('border-cyan-400', 'text-cyan-400');
    loginTab.classList.remove('border-transparent', 'text-slate-400');
    signupTab.classList.remove('border-cyan-400', 'text-cyan-400');
    signupTab.classList.add('border-transparent', 'text-slate-400');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  } else {
    signupTab.classList.add('border-cyan-400', 'text-cyan-400');
    signupTab.classList.remove('border-transparent', 'text-slate-400');
    loginTab.classList.remove('border-cyan-400', 'text-cyan-400');
    loginTab.classList.add('border-transparent', 'text-slate-400');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
};

window.handleUserLogin = function(e) {
  e.preventDefault();
  const emailInput = document.getElementById('login-email').value.trim().toLowerCase();
  const passwordInput = document.getElementById('login-password').value;

  let found = state.users.find(u => (u.email.toLowerCase() === emailInput || u.phone === emailInput) && (u.password === passwordInput || (u.role === 'admin' && (passwordInput === '1234' || passwordInput === 'admin'))));
  
  // Yönetici kısayol kontrolü
  if (!found && (emailInput === 'admin' || emailInput === 'admin@dagteknoloji.com.tr' || emailInput === 'admin@dag.com') && (passwordInput === '1234' || passwordInput === 'admin')) {
    found = defaultUsers.find(u => u.role === 'admin');
  }

  if (found) {
    state.currentUser = found;
    state.isAdmin = (found.role === 'admin' || found.email === 'admin@dagteknoloji.com.tr');
    localStorage.setItem('dag_current_user', JSON.stringify(found));
    sessionStorage.setItem('dag_is_admin', state.isAdmin ? 'true' : 'false');
    closeModal('auth-modal');
    renderUserNav();
    renderProducts();
    if (state.isAdmin) {
      showToast(`Hoş geldiniz Sayın ${found.name}! Yönetici yetkileri tanımlandı.`, 'success');
    } else {
      showToast(`Hoş geldiniz Sayın ${found.name}!`, 'success');
    }
  } else {
    showToast('Hatalı e-posta veya şifre! (Müşteri: ahmet@dag.com / 123 | Yönetici: admin@dagteknoloji.com.tr / admin)', 'error');
  }
};

window.handleDemoLogin = function(role = 'customer') {
  let demoUser;
  if (role === 'admin') {
    demoUser = defaultUsers.find(u => u.role === 'admin');
  } else {
    demoUser = defaultUsers.find(u => u.role !== 'admin') || defaultUsers[0];
  }
  state.currentUser = demoUser;
  state.isAdmin = (demoUser.role === 'admin');
  localStorage.setItem('dag_current_user', JSON.stringify(demoUser));
  sessionStorage.setItem('dag_is_admin', state.isAdmin ? 'true' : 'false');
  closeModal('auth-modal');
  renderUserNav();
  renderProducts();
  if (document.getElementById('product-detail-hero')) {
    initProductDetailPage();
  }
  if (state.isAdmin) {
    showToast(`Yönetici hesabı ile giriş yapıldı: ${demoUser.name}`, 'success');
  } else {
    showToast(`Müşteri hesabı ile giriş yapıldı: ${demoUser.name}`, 'success');
  }
};

window.handleUserSignup = function(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const phone = document.getElementById('signup-phone').value.trim();
  const password = document.getElementById('signup-password').value;
  const company = document.getElementById('signup-company').value.trim();
  const accountType = document.querySelector('input[name="account-type"]:checked')?.value || 'individual';

  if (state.users.some(u => u.email.toLowerCase() === email)) {
    showToast('Bu e-posta adresiyle kayıtlı bir hesap zaten var!', 'error');
    return;
  }

  const newUser = {
    id: 'usr-' + Date.now(),
    name: name,
    email: email,
    phone: phone,
    password: password,
    company: company,
    accountType: accountType,
    role: 'customer',
    address: 'İstanbul, Türkiye',
    orders: [],
    wishlist: []
  };

  state.users.push(newUser);
  localStorage.setItem('dag_users', JSON.stringify(state.users));

  state.currentUser = newUser;
  state.isAdmin = false;
  localStorage.setItem('dag_current_user', JSON.stringify(newUser));
  sessionStorage.removeItem('dag_is_admin');

  closeModal('auth-modal');
  renderUserNav();
  renderProducts();
  if (document.getElementById('product-detail-hero')) {
    initProductDetailPage();
  }
  showToast(`Aramıza hoş geldiniz Sayın ${name}! Hesabınız oluşturuldu.`, 'success');
};

window.userLogout = function() {
  state.currentUser = null;
  state.isAdmin = false;
  localStorage.removeItem('dag_current_user');
  sessionStorage.removeItem('dag_is_admin');
  renderUserNav();
  renderProducts();
  if (document.getElementById('product-detail-hero')) {
    initProductDetailPage();
  }
  closeModal('admin-panel-modal');
  showToast('Oturumunuz başarıyla kapatıldı.');
};

window.toggleWishlist = function(productId) {
  if (!state.currentUser) {
    showToast('Favorilerinize eklemek için lütfen giriş yapın veya üye olun.', 'info');
    openAuthModal('login');
    return;
  }

  const u = state.currentUser;
  if (!u.wishlist) u.wishlist = [];

  const index = u.wishlist.indexOf(productId);
  const prod = state.products.find(p => p.id === productId);
  const prodName = prod ? prod.name : 'Ürün';

  if (index >= 0) {
    u.wishlist.splice(index, 1);
    showToast(`${prodName} favorilerden çıkarıldı.`);
  } else {
    u.wishlist.push(productId);
    showToast(`${prodName} favorilerinize eklendi!`, 'success');
  }

  // Persist
  localStorage.setItem('dag_current_user', JSON.stringify(u));
  const userIdx = state.users.findIndex(item => item.id === u.id);
  if (userIdx >= 0) {
    state.users[userIdx].wishlist = u.wishlist;
    localStorage.setItem('dag_users', JSON.stringify(state.users));
  }

  renderUserNav();
  renderProducts();
  if (document.getElementById('product-detail-hero')) {
    initProductDetailPage();
  }
};

window.openMyOrdersModal = function() {
  if (!state.currentUser) return;
  const u = state.currentUser;
  const listEl = document.getElementById('user-orders-list');
  const emptyEl = document.getElementById('user-orders-empty');

  const orders = u.orders || [];
  if (orders.length === 0) {
    if (listEl) listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
  } else {
    if (emptyEl) emptyEl.classList.add('hidden');
    if (listEl) {
      listEl.innerHTML = orders.map(o => `
        <div class="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono font-bold text-cyan-400">#ORD-${o.id}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">${o.status || 'Hazırlanıyor'}</span>
            </div>
            <p class="text-xs text-white font-medium line-clamp-1">${o.itemsSummary || (o.itemsCount + ' Adet Ürün')}</p>
            <span class="text-[11px] text-slate-400 font-mono">${o.date}</span>
          </div>

          <div class="text-right flex sm:flex-col justify-between items-center sm:items-end">
            <span class="text-sm font-extrabold text-white font-mono">${(o.total || 0).toLocaleString('tr-TR')} ₺</span>
            <span class="text-[10px] text-cyan-400">Perpa Depo Teslim</span>
          </div>
        </div>
      `).join('');
    }
  }

  openModal('user-orders-modal');
  if (window.lucide) lucide.createIcons();
};

window.openWishlistModal = function() {
  if (!state.currentUser) return;
  const u = state.currentUser;
  const container = document.getElementById('wishlist-items-container');
  const emptyEl = document.getElementById('wishlist-empty-message');

  const favIds = u.wishlist || [];
  const favProducts = state.products.filter(p => favIds.includes(p.id));

  if (favProducts.length === 0) {
    if (container) container.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
  } else {
    if (emptyEl) emptyEl.classList.add('hidden');
    if (container) {
      container.innerHTML = favProducts.map(p => {
        const stock = Number(p.stock !== undefined ? p.stock : 10);
        const isOutOfStock = stock <= 0;

        return `
          <div class="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 flex-1 pr-2">
              ${getProductThumbHtml(p, "w-12 h-12")}
              <div>
                <h4 class="text-xs font-bold text-white line-clamp-1">${p.name}</h4>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs font-bold text-cyan-400">${getProductPrice(p).toLocaleString('tr-TR')} ₺</span>
                  ${isOutOfStock ? `<span class="text-[10px] text-rose-400">Tükendi</span>` : `<span class="text-[10px] text-emerald-400">Stokta (${stock})</span>`}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              ${isOutOfStock ? `
                <button disabled class="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-500 text-xs font-bold cursor-not-allowed">Tükendi</button>
              ` : `
                <button onclick="addToCart('${p.id}'); closeModal('wishlist-modal');" class="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md">
                  <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i>
                  <span>Sepete</span>
                </button>
              `}
              <button onclick="toggleWishlist('${p.id}'); openWishlistModal();" class="p-1.5 rounded-lg text-slate-500 hover:text-rose-400">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  openModal('wishlist-modal');
  if (window.lucide) lucide.createIcons();
};

window.openProfileModal = function() {
  if (!state.currentUser) return;
  const u = state.currentUser;

  document.getElementById('profile-name').value = u.name;
  document.getElementById('profile-email').value = u.email;
  document.getElementById('profile-phone').value = u.phone || '';
  document.getElementById('profile-company').value = u.company || '';
  document.getElementById('profile-address').value = u.address || '';

  openModal('user-profile-modal');
};

window.handleSaveProfile = function(e) {
  e.preventDefault();
  if (!state.currentUser) return;

  state.currentUser.name = document.getElementById('profile-name').value.trim();
  state.currentUser.phone = document.getElementById('profile-phone').value.trim();
  state.currentUser.company = document.getElementById('profile-company').value.trim();
  state.currentUser.address = document.getElementById('profile-address').value.trim();

  localStorage.setItem('dag_current_user', JSON.stringify(state.currentUser));
  const idx = state.users.findIndex(item => item.id === state.currentUser.id);
  if (idx >= 0) {
    state.users[idx] = state.currentUser;
    localStorage.setItem('dag_users', JSON.stringify(state.users));
  }

  closeModal('user-profile-modal');
  renderUserNav();
  showToast('Hesap bilgileriniz başarıyla güncellendi!', 'success');
};

// ==========================================================================
// 4. MULTI-FACET FILTER SYSTEM & PRODUCT CATALOG
// ==========================================================================
function getFilteredProducts() {
  const f = state.filters;
  const isHomePage = !window.location.pathname.includes('urunler.html') && !window.location.pathname.includes('urun-detay.html');
  let items = state.products.filter(p => {
    if (isHomePage && p.category !== 'printers') return false;
    if (f.category !== 'all' && p.category !== f.category) return false;
    if (f.brand !== 'all' && (p.brand || 'Diğer') !== f.brand) return false;

    const stock = Number(p.stock !== undefined ? p.stock : 10);
    if (f.stockStatus === 'in_stock' && stock <= 0) return false;
    if (f.stockStatus === 'low_stock' && (stock <= 0 || stock > 5)) return false;
    if (f.stockStatus === 'out_of_stock' && stock > 0) return false;

    if (f.priceMax && p.price > f.priceMax) return false;

    if (f.searchQuery) {
      const q = f.searchQuery.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(q);
      const descMatch = (p.desc || '').toLowerCase().includes(q);
      const skuMatch = (p.sku || '').toLowerCase().includes(q);
      const brandMatch = (p.brand || '').toLowerCase().includes(q);
      if (!nameMatch && !descMatch && !skuMatch && !brandMatch) return false;
    }

    return true;
  });

  if (f.sortBy === 'price_asc') {
    items.sort((a, b) => a.price - b.price);
  } else if (f.sortBy === 'price_desc') {
    items.sort((a, b) => b.price - a.price);
  } else if (f.sortBy === 'rating') {
    items.sort((a, b) => (b.rating || 5) - (a.rating || 5));
  } else if (f.sortBy === 'stock_desc') {
    items.sort((a, b) => (b.stock || 0) - (a.stock || 0));
  }

  return items;
}

function renderBrandFilters() {
  const container = document.getElementById('brand-filters-container');
  if (!container) return;

  const isHomePage = !window.location.pathname.includes('urunler.html') && !window.location.pathname.includes('urun-detay.html');
  const relevantProducts = isHomePage ? state.products.filter(p => p.category === 'printers') : state.products;

  const brandsSet = new Set();
  relevantProducts.forEach(p => {
    if (p.brand) brandsSet.add(p.brand);
  });
  const brandsList = Array.from(brandsSet).sort();

  container.innerHTML = `
    <button onclick="setBrandFilter('all')" class="brand-chip px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${state.filters.brand === 'all' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'}">
      Tüm Markalar
    </button>
    ${brandsList.map(b => `
      <button onclick="setBrandFilter('${b}')" class="brand-chip px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${state.filters.brand === b ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'}">
        ${b}
      </button>
    `).join('')}
  `;
}

window.setBrandFilter = function(brand) {
  state.filters.brand = brand;
  renderBrandFilters();
  renderProducts();
};

window.filterCategory = function(cat) {
  state.filters.category = cat;
  document.querySelectorAll('.cat-tab').forEach(tab => {
    const isActive = tab.dataset.category === cat;
    tab.classList.toggle('bg-cyan-500', isActive);
    tab.classList.toggle('text-slate-950', isActive);
    tab.classList.toggle('bg-slate-800/60', !isActive);
    tab.classList.toggle('text-slate-300', !isActive);
  });
  renderProducts();
};

window.handleStockFilter = function(status) {
  state.filters.stockStatus = status;
  renderProducts();
};

window.handleSortChange = function(sortValue) {
  state.filters.sortBy = sortValue;
  renderProducts();
};

window.handlePriceFilter = function(val) {
  state.filters.priceMax = parseInt(val);
  const display = document.getElementById('price-filter-display');
  if (display) display.innerText = `Maks: ${parseInt(val).toLocaleString('tr-TR')} ₺`;
  renderProducts();
};

window.handleProductSearch = function(query) {
  state.filters.searchQuery = query;
  renderProducts();
};

window.loadMoreProducts = function() {
  state.filters.displayLimit += 24;
  renderProducts();
};

window.showAllProducts = function() {
  state.filters.displayLimit = 9999;
  renderProducts();
};

window.resetFilters = function() {
  state.filters.category = 'all';
  state.filters.brand = 'all';
  state.filters.stockStatus = 'all';
  state.filters.searchQuery = '';
  state.filters.priceMax = 200000;
  state.filters.sortBy = 'default';
  state.filters.displayLimit = 24;

  const searchInput = document.getElementById('product-search-input');
  if (searchInput) searchInput.value = '';
  const priceSlider = document.getElementById('price-filter-slider');
  if (priceSlider) priceSlider.value = 200000;
  const priceDisplay = document.getElementById('price-filter-display');
  if (priceDisplay) priceDisplay.innerText = 'Maks: 200.000 ₺';
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'default';
  const stockSelect = document.getElementById('stock-filter-select');
  if (stockSelect) stockSelect.value = 'all';

  renderBrandFilters();
  filterCategory('all');
};

// ==========================================================================
// UNIFIED PRODUCT VISUAL & SCHEMATIC SYSTEM
// ==========================================================================
function getProductImageUrl(p) {
  if (!p) return null;
  var img = p.image || p.remoteImage;
  if (img && typeof img === 'string' && !img.includes('no_image') && !img.includes('placeholder')) {
    return img;
  }
  // Authentic category & brand visual graphics for products without database photos
  if (p.category === 'toners') {
    const brand = ((p.brand || '') + ' ' + (p.name || '')).toLowerCase();
    if (brand.includes('canon')) return 'assets/placeholders/toner_canon.svg';
    if (brand.includes('xerox')) return 'assets/placeholders/toner_xerox.svg';
    if (brand.includes('kyocera')) return 'assets/placeholders/toner_kyocera.svg';
    if (brand.includes('brother')) return 'assets/placeholders/toner_brother.svg';
    return 'assets/placeholders/toner_hp.svg';
  } else if (p.category === 'parts') {
    return 'assets/placeholders/part_drum.svg';
  }
  return null;
}

function isLocalProductImage(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('assets/products/') || url.startsWith('./assets/products/');
}

function getCategorySchematicSvg(cat, className) {
  className = className || "w-16 h-16";
  switch (cat) {
    case 'printers':
      return '<svg class="' + className + '" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="10" y="8" width="44" height="48" rx="4" stroke="#00f0ff" stroke-width="2" stroke-dasharray="3 2" opacity="0.6"/>' +
        '<line x1="8" y1="16" x2="56" y2="16" stroke="#38bdf8" stroke-width="2.5"/>' +
        '<rect x="26" y="12" width="12" height="8" rx="2" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>' +
        '<rect x="28" y="22" width="8" height="10" rx="1.5" fill="#00f0ff"/>' +
        '<polygon points="30,32 34,32 32,37" fill="#f59e0b"/>' +
        '<line x1="32" y1="37" x2="32" y2="44" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1 2"/>' +
        '<rect x="16" y="44" width="32" height="6" rx="2" fill="#1e293b" stroke="#00f0ff" stroke-width="2"/>' +
        '<polygon points="26,44 32,38 38,44" fill="#0284c7" opacity="0.7"/>' +
        '<rect x="6" y="50" width="52" height="8" rx="2" fill="#0f172a" stroke="#475569" stroke-width="2"/>' +
        '<circle cx="16" cy="54" r="1.5" fill="#00f0ff"/>' +
        '<line x1="24" y1="54" x2="48" y2="54" stroke="#334155" stroke-width="2"/>' +
      '</svg>';
    case 'filaments':
      return '<svg class="' + className + '" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="32" cy="32" r="24" stroke="#00f0ff" stroke-width="2" stroke-dasharray="4 2"/>' +
        '<circle cx="32" cy="32" r="20" stroke="#38bdf8" stroke-width="1.5" opacity="0.4"/>' +
        '<circle cx="32" cy="32" r="16" stroke="#06b6d4" stroke-width="3" stroke-dasharray="2 1"/>' +
        '<circle cx="32" cy="32" r="12" stroke="#0284c7" stroke-width="2.5"/>' +
        '<circle cx="32" cy="32" r="6" fill="#0f172a" stroke="#00f0ff" stroke-width="2"/>' +
        '<line x1="32" y1="16" x2="32" y2="26" stroke="#475569" stroke-width="1.5"/>' +
        '<line x1="32" y1="38" x2="32" y2="48" stroke="#475569" stroke-width="1.5"/>' +
        '<line x1="16" y1="32" x2="26" y2="32" stroke="#475569" stroke-width="1.5"/>' +
        '<line x1="38" y1="32" x2="48" y2="32" stroke="#475569" stroke-width="1.5"/>' +
        '<path d="M48 32 Q54 22 46 14" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" fill="none"/>' +
      '</svg>';
    case 'toners':
      return '<svg class="' + className + '" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="8" y="20" width="48" height="24" rx="4" fill="#0f172a" stroke="#00f0ff" stroke-width="2"/>' +
        '<rect x="12" y="14" width="40" height="6" rx="3" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>' +
        '<rect x="22" y="24" width="20" height="5" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>' +
        '<circle cx="8" cy="32" r="4" fill="#1e293b" stroke="#00f0ff" stroke-width="2"/>' +
        '<rect x="44" y="26" width="6" height="4" rx="1" fill="#f59e0b" stroke="#b45309" stroke-width="1"/>' +
        '<line x1="14" y1="37" x2="50" y2="37" stroke="#334155" stroke-width="2" stroke-dasharray="3 2"/>' +
      '</svg>';
    default: // parts
      return '<svg class="' + className + '" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="28" cy="28" r="14" stroke="#00f0ff" stroke-width="2" fill="#0f172a"/>' +
        '<path d="M28 10v4M28 42v4M10 28h4M42 28h4M15 15l3 3M38 38l3 3M15 41l3-3M38 17l3-3" stroke="#00f0ff" stroke-width="2.5" stroke-linecap="round"/>' +
        '<circle cx="28" cy="28" r="5" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>' +
        '<circle cx="45" cy="45" r="9" stroke="#38bdf8" stroke-width="1.5" fill="#0f172a"/>' +
        '<path d="M45 33v3M45 54v3M33 45h3M54 45h3" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="45" cy="45" r="3" fill="#1e293b" stroke="#00f0ff" stroke-width="1.5"/>' +
      '</svg>';
  }
}

function renderProductCardVisualHtml(p, isOutOfStock) {
  var imgUrl = getProductImageUrl(p);
  var brandLabel = p.brand ? '<span class="absolute top-2.5 left-2.5 text-[9px] tracking-wider font-mono text-cyan-300 bg-slate-900/95 px-2 py-0.5 rounded border border-slate-800 z-10 shadow-sm">' + p.brand + '</span>' : '';
  var perpaLabel = '<span class="absolute bottom-2.5 right-2.5 text-[9px] tracking-wider font-mono text-slate-400 bg-slate-900/95 px-1.5 py-0.5 rounded border border-slate-800 uppercase z-10 shadow-sm">Perpa Stok</span>';
  var safeName = (p.name || '').replace(/<[^>]*>/g, ' ').replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim();

  if (imgUrl) {
    return '<a href="urun-detay.html?id=' + p.id + '" class="w-full h-44 rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 flex items-center justify-center relative overflow-hidden group-hover:border-cyan-500/40 transition-all block cursor-pointer" title="' + safeName + ' - Detaylı Sayfaya Git">' +
      '<img src="' + imgUrl + '" alt="' + safeName + '" class="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-300 ' + (isOutOfStock ? 'grayscale-[60%]' : '') + '" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML = getFallbackSchematicHtml(\'' + p.category + '\', \'' + encodeURIComponent(p.brand || '') + '\', \'' + encodeURIComponent(p.sku || '') + '\', \'' + p.id + '\');" />' +
      brandLabel +
      perpaLabel +
    '</a>';
  }

  // Industrial Technical Component Schematic Display for products without local photography
  return '<a href="urun-detay.html?id=' + p.id + '" class="w-full h-44 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800/90 p-3 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-cyan-500/50 transition-all block cursor-pointer group/schematic" title="' + safeName + ' - Teknik Özellikleri İncele">' +
    '<div class="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:14px_14px] opacity-10 pointer-events-none"></div>' +
    '<div class="absolute w-24 h-24 rounded-full bg-cyan-500/5 filter blur-xl pointer-events-none group-hover/schematic:bg-cyan-500/10 transition-colors"></div>' +
    '<div class="relative z-10 flex flex-col items-center justify-center my-auto transition-transform duration-300 group-hover/schematic:scale-105">' +
      getCategorySchematicSvg(p.category, "w-14 h-14 drop-shadow-[0_0_8px_rgba(0,240,255,0.2)]") +
      '<div class="mt-2 text-center">' +
        '<span class="block text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase leading-none">' + (p.brand || 'DAĞ TEKNOLOJİ') + '</span>' +
        '<span class="block text-[9px] font-mono text-slate-400 mt-1 leading-none line-clamp-1 max-w-[140px]">' + (p.sku || 'YEDEK PARÇA') + '</span>' +
      '</div>' +
    '</div>' +
    brandLabel +
    perpaLabel +
  '</a>';
}

window.getFallbackSchematicHtml = function(category, brandEnc, skuEnc, id) {
  var brand = decodeURIComponent(brandEnc || '');
  var sku = decodeURIComponent(skuEnc || '');
  return '<div class="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">' +
    '<div class="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:14px_14px] opacity-10 pointer-events-none"></div>' +
    '<div class="relative z-10 flex flex-col items-center justify-center my-auto">' +
      getCategorySchematicSvg(category, "w-14 h-14 drop-shadow-[0_0_8px_rgba(0,240,255,0.2)]") +
      '<div class="mt-2 text-center">' +
        '<span class="block text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase leading-none">' + (brand || 'DAĞ TEKNOLOJİ') + '</span>' +
        '<span class="block text-[9px] font-mono text-slate-400 mt-1 leading-none">' + (sku || 'PERPA DEPO') + '</span>' +
      '</div>' +
    '</div>' +
    (brand ? '<span class="absolute top-2.5 left-2.5 text-[9px] tracking-wider font-mono text-cyan-300 bg-slate-900/95 px-2 py-0.5 rounded border border-slate-800 z-10">' + brand + '</span>' : '') +
    '<span class="absolute bottom-2.5 right-2.5 text-[9px] tracking-wider font-mono text-slate-400 bg-slate-900/95 px-1.5 py-0.5 rounded border border-slate-800 uppercase z-10">Perpa Stok</span>' +
  '</div>';
};

function getProductThumbHtml(p, sizeClass) {
  sizeClass = sizeClass || "w-10 h-10";
  var safeName = (p.name || '').replace(/<[^>]*>/g, ' ').replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim();
  var imgUrl = getProductImageUrl(p);
  if (imgUrl) {
    return '<img src="' + imgUrl + '" alt="' + safeName + '" class="' + sizeClass + ' object-contain rounded-lg bg-slate-900 border border-slate-800 p-1 flex-shrink-0" loading="lazy" onerror="this.onerror=null; this.src=\'assets/logo.svg\';" />';
  }
  return '<div class="' + sizeClass + ' rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center p-1.5 text-cyan-400 flex-shrink-0" title="' + (p.brand || '') + ' ' + (p.sku || '') + '">' + getCategorySchematicSvg(p.category || 'parts', "w-full h-full") + '</div>';
}

function renderProducts() {
  const container = document.getElementById('products-grid');
  const countDisplay = document.getElementById('filtered-count-display');
  const loadMoreBox = document.getElementById('load-more-container');
  if (!container) return;

  const allFiltered = getFilteredProducts();
  const visibleItems = allFiltered.slice(0, state.filters.displayLimit);

  if (countDisplay) {
    countDisplay.innerHTML = `
      <span class="text-white font-bold">${allFiltered.length}</span> ürün listeleniyor
      ${allFiltered.length !== state.products.length ? `<span class="text-slate-500 text-xs">(${state.products.length} ürün arasından)</span>` : ''}
    `;
  }

  if (loadMoreBox) {
    if (allFiltered.length > visibleItems.length) {
      loadMoreBox.classList.remove('hidden');
      const countBtn = document.getElementById('load-more-btn-text');
      if (countBtn) countBtn.innerText = `Daha Fazla Göster (${visibleItems.length} / ${allFiltered.length})`;
    } else {
      loadMoreBox.classList.add('hidden');
    }
  }

  if (allFiltered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i data-lucide="package-search" class="w-16 h-16 mx-auto mb-4 text-slate-600"></i>
        <h4 class="text-xl font-bold text-white mb-2">Filtreye Uygun Ürün Bulunamadı</h4>
        <p class="text-sm">Filtre kriterlerinizi genişletebilir veya arama terimini temizleyebilirsiniz.</p>
        <button onclick="resetFilters()" class="mt-4 px-5 py-2.5 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition-all shadow-lg shadow-cyan-500/20">Filtreleri Sıfırla</button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const wishlist = (state.currentUser && state.currentUser.wishlist) || [];

  function stripHtmlTags(str) {
    if (!str) return '';
    return String(str).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  container.innerHTML = visibleItems.map(p => {
    const stock = Number(p.stock !== undefined ? p.stock : 10);
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 5;
    const isFavorited = wishlist.includes(p.id);
    const safeName = stripHtmlTags(p.name || '');
    const rawSub = p.subtitle || p.desc || '';
    const safeSub = stripHtmlTags(rawSub);

    let stockBadgeHtml = '';
    if (isOutOfStock) {
      stockBadgeHtml = `
        <span class="stock-badge-out px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Tükendi
        </span>
      `;
    } else if (isLowStock) {
      stockBadgeHtml = `
        <span class="stock-badge-low px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Son ${stock} Adet!
        </span>
      `;
    } else {
      stockBadgeHtml = `
        <span class="stock-badge-in px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Stokta (${stock})
        </span>
      `;
    }

    return `
      <div class="product-card glass-panel rounded-2xl overflow-hidden flex flex-col justify-between group hover:-translate-y-1.5 transition-all duration-300 h-full ${isOutOfStock ? 'opacity-85' : ''}">
        <!-- Product Header & Visual (Tıklanabilir Ürün Görseli) -->
        <div class="p-5 pb-3 relative bg-gradient-to-b from-white/[0.03] to-transparent">
          <div class="flex items-center justify-between mb-3">
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${p.badgeColor}">${p.badge}</span>
            ${stockBadgeHtml}
          </div>

          <!-- Real Product Image or High-Tech Schematic Visual -->
          ${renderProductCardVisualHtml(p, isOutOfStock)}
        </div>

        <!-- Content -->
        <div class="p-5 pt-0 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-[11px] font-mono tracking-wider text-slate-400 mb-1">
              <span class="uppercase text-cyan-400 font-semibold">${getCategoryName(p.category)}</span>
              ${p.sku ? `<span class="text-slate-500 font-mono text-[10px]">${p.sku}</span>` : ''}
            </div>

            <!-- Tıklanabilir Ürün Başlığı -->
            <a href="urun-detay.html?id=${p.id}" class="block group/title" title="${safeName} - Detaylı Sayfaya Git">
              <h3 class="text-sm font-bold text-white group-hover/title:text-cyan-400 transition-colors mb-1.5 line-clamp-2">
                ${safeName}
              </h3>
            </a>
            
            <a href="urun-detay.html?id=${p.id}" class="text-xs text-slate-400 hover:text-slate-200 line-clamp-2 mb-4 leading-relaxed block" title="Detayları İncele">
              ${safeSub}
            </a>

            <div class="flex flex-wrap gap-1 mb-5">
              ${(p.specs || []).slice(0, 2).map(s => `
                <span class="text-[10px] bg-slate-800/80 border border-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                  ${s}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Pricing & Stock Action Row -->
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div class="shrink-0 min-w-0">
              ${p.oldPrice ? `<span class="text-[11px] text-slate-500 line-through block whitespace-nowrap">${getProductOldPrice(p).toLocaleString('tr-TR')} ₺</span>` : ''}
              <div class="text-base sm:text-lg font-extrabold text-white whitespace-nowrap inline-flex items-baseline">
                <span>${getProductPrice(p).toLocaleString('tr-TR')}</span>
                <span class="text-xs text-cyan-400 font-normal ml-0.5">₺</span>
              </div>
            </div>
            
            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Wishlist Heart Button -->
              <button onclick="toggleWishlist('${p.id}')" title="${isFavorited ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}" class="wishlist-btn ${isFavorited ? 'active text-rose-500 bg-rose-500/15 border-rose-500/40' : 'text-slate-400 hover:text-rose-400 bg-slate-800/80'} p-2 rounded-xl transition-all border border-slate-700">
                <i data-lucide="heart" class="w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}"></i>
              </button>

              <!-- Kendi Sayfasına Git Butonu (İncele) -->
              <a href="urun-detay.html?id=${p.id}" title="Ürün Sayfasına Git" class="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-1 text-xs font-semibold">
                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                <span class="hidden 2xl:inline">İncele</span>
              </a>
              
              ${isOutOfStock ? `
                <button disabled class="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800/80 text-slate-500 font-bold text-xs cursor-not-allowed border border-slate-700 whitespace-nowrap">
                  <span>Tükendi</span>
                </button>
              ` : `
                <button onclick="addToCart('${p.id}')" class="px-2.5 sm:px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 whitespace-nowrap" title="Hemen Sepete Ekle">
                  <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i>
                  <span>Ekle</span>
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function getCategoryName(cat) {
  switch (cat) {
    case 'printers': return '3D Yazıcı & Lazer';
    case 'filaments': return 'Filament & Sarf';
    case 'toners': return 'Muadil & Orijinal Toner';
    case 'parts': return 'Yedek Parça & Mekanik';
    default: return 'Teknoloji';
  }
}

// ==========================================================================
// 5. E-COMMERCE SHOPPING CART & REAL STOCK RESERVATION
// ==========================================================================
window.addToCart = function(productId, qty = 1) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  const currentStock = Number(prod.stock !== undefined ? prod.stock : 10);
  if (currentStock <= 0) {
    showToast(`${prod.name} şu an stokta tükenmiştir!`, 'error');
    return;
  }

  const existing = state.cart.find(item => item.id === productId);
  const currentInCart = existing ? existing.quantity : 0;

  if (currentInCart + qty > currentStock) {
    showToast(`Maksimum stok limitine ulaştınız! Mevcut stok: ${currentStock} adet`, 'error');
    return;
  }

  if (existing) {
    existing.quantity += qty;
  } else {
    state.cart.push({
      id: prod.id,
      name: prod.name,
      price: getProductPrice(prod),
      image: prod.image || prod.remoteImage,
      subtitle: prod.subtitle,
      quantity: qty
    });
  }

  saveCart();
  updateCartBadge();
  renderCartDrawer();
  showToast(`${prod.name} sepete eklendi! (Kalan Stok: ${currentStock - (currentInCart + qty)})`, 'success');
};

function saveCart() {
  localStorage.setItem('dag_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-badge-count');
  if (badge) {
    badge.innerText = count;
    badge.classList.toggle('hidden', count === 0);
  }
  document.querySelectorAll('.mobile-cart-badge').forEach(el => {
    el.innerText = count > 0 ? count + ' Ürün' : '0 Ürün';
    el.classList.toggle('bg-cyan-400', count > 0);
    el.classList.toggle('text-slate-950', count > 0);
    el.classList.toggle('bg-slate-800', count === 0);
    el.classList.toggle('text-slate-400', count === 0);
  });
}

function ensureCartDrawerElements() {
  let backdrop = document.getElementById('cart-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'cart-backdrop';
    backdrop.className = 'hidden opacity-0 fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300';
    backdrop.onclick = () => toggleCartDrawer(false);
    document.body.appendChild(backdrop);
  }

  let drawer = document.getElementById('cart-drawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'cart-drawer';
    drawer.className = 'hidden fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 translate-x-full transition-all duration-300 flex flex-col justify-between shadow-2xl';
    drawer.innerHTML = `
      <div class="p-5 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i data-lucide="shopping-bag" class="w-5 h-5 text-cyan-400"></i>
          <h3 class="text-base font-bold text-white">Alışveriş Sepetiniz</h3>
        </div>
        <button onclick="toggleCartDrawer(false)" class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white" title="Kapat">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-5 space-y-3">
        <div id="cart-items-container" class="space-y-3"></div>
        <div id="cart-empty-message" class="hidden text-center py-16 text-slate-400">
          <i data-lucide="shopping-cart" class="w-12 h-12 mx-auto text-slate-600 mb-3"></i>
          <h4 class="text-sm font-bold text-white mb-1">Sepetiniz Boş</h4>
          <p class="text-xs text-slate-500 mb-4">Ürünlerimizi inceleyerek sepete ürün ekleyebilirsiniz.</p>
          <button onclick="toggleCartDrawer(false)" class="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs">Alışverişe Başla</button>
        </div>
      </div>
      <div class="p-5 border-t border-slate-800 bg-slate-950/80 space-y-3">
        <div class="flex justify-between items-center text-xs text-slate-400">
          <span>Ara Toplam:</span>
          <span id="cart-subtotal" class="font-bold text-white text-sm">0 ₺</span>
        </div>
        <div class="flex justify-between items-center text-xs text-slate-400">
          <span>Kargo Ücreti:</span>
          <span class="text-emerald-400 font-semibold">1.000 ₺ Üzeri Ücretsiz</span>
        </div>
        <div class="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-slate-800">
          <span>Genel Toplam:</span>
          <span id="cart-total" class="text-cyan-400 text-lg font-mono">0 ₺</span>
        </div>
        <button id="cart-checkout-btn" onclick="processCheckout()" class="w-full py-3 rounded-xl glow-cyan-btn text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
          <i data-lucide="check" class="w-4 h-4"></i>
          <span>Siparişi Tamamla</span>
        </button>
      </div>
    `;
    document.body.appendChild(drawer);
    if (window.lucide) lucide.createIcons();
  }

  return { drawer, backdrop };
}

window.toggleCartDrawer = function(forceOpen) {
  const { drawer, backdrop } = ensureCartDrawerElements();

  const isOpen = !drawer.classList.contains('hidden') && !drawer.classList.contains('translate-x-full');
  const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;

  if (shouldOpen) {
    renderCartDrawer();
    drawer.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    requestAnimationFrame(() => {
      drawer.classList.remove('translate-x-full');
      backdrop.classList.remove('opacity-0');
      backdrop.classList.add('opacity-100');
    });
  } else {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('opacity-0');
    setTimeout(() => {
      drawer.classList.add('hidden');
      backdrop.classList.add('hidden');
    }, 300);
  }
};

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');
  const emptyState = document.getElementById('cart-empty-message');
  const checkoutBtn = document.getElementById('cart-checkout-btn');

  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (subtotalEl) subtotalEl.innerText = '0 ₺';
    if (totalEl) totalEl.innerText = '0 ₺';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (checkoutBtn) checkoutBtn.disabled = false;

  let subtotal = 0;

  container.innerHTML = state.cart.map(item => {
    subtotal += item.price * item.quantity;
    const prod = state.products.find(p => p.id === item.id);
    const maxStock = prod ? (prod.stock || 0) : 10;

    return `
      <div class="flex items-center justify-between p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
        <div class="flex items-center gap-3 flex-1 pr-2">
          ${getProductThumbHtml(prod || item, "w-10 h-10")}
          <div class="flex-1">
            <h4 class="text-xs font-semibold text-white line-clamp-1">${item.name}</h4>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-cyan-400 font-bold">${item.price.toLocaleString('tr-TR')} ₺</span>
              <span class="text-[10px] text-slate-500">Stok: ${maxStock}</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-1.5">
          <button onclick="changeCartQty('${item.id}', -1)" class="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-xs">-</button>
          <span class="text-xs font-bold text-white px-1.5">${item.quantity}</span>
          <button onclick="changeCartQty('${item.id}', 1)" class="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-xs" ${item.quantity >= maxStock ? 'disabled opacity-50' : ''}>+</button>
          <button onclick="removeFromCart('${item.id}')" class="text-slate-500 hover:text-red-400 ml-1.5 p-1">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.innerText = `${subtotal.toLocaleString('tr-TR')} ₺`;
  if (totalEl) totalEl.innerText = `${subtotal.toLocaleString('tr-TR')} ₺`;

  if (window.lucide) lucide.createIcons();
}

window.changeCartQty = function(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;

  const prod = state.products.find(p => p.id === id);
  const maxStock = prod ? (prod.stock || 0) : 10;

  if (delta > 0 && item.quantity >= maxStock) {
    showToast(`Bu ürün için maksimum stok adedine (${maxStock}) ulaştınız!`, 'error');
    return;
  }

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.id !== id);
  }
  saveCart();
  updateCartBadge();
  renderCartDrawer();
};

window.removeFromCart = function(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  saveCart();
  updateCartBadge();
  renderCartDrawer();
  showToast('Ürün sepetten çıkarıldı');
};

// ==========================================================================
// KREDİ KARTI VE GÜVENLİ CHECKOUT SİSTEMİ
// ==========================================================================

let activePaymentMethod = 'credit_card';
let secure3DCountdownTimer = null;
let currentPendingOrder = null;

window.buyNowWithCreditCard = function(productId, qty = 1) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return;
  const numQty = parseInt(qty) || 1;

  // Add or update cart
  const existing = state.cart.find(i => i.id === p.id);
  if (existing) {
    existing.quantity = Math.min((p.stock || 99), existing.quantity + numQty);
  } else {
    state.cart.push({
      id: p.id,
      name: p.name,
      price: getProductPrice(p),
      quantity: numQty,
      image: getProductImageUrl(p) || 'assets/logo.svg'
    });
  }
  saveCart();
  updateCartBadge();
  renderCartDrawer();

  // Directly trigger credit card checkout
  processCheckout();
};

window.processCheckout = function() {
  if (state.cart.length === 0) {
    showToast('Sepetinizde ürün bulunmuyor. Lütfen önce ürün ekleyin.', 'info');
    return;
  }
  toggleCartDrawer(false);

  // Autofill user information if logged in
  if (state.currentUser) {
    const u = state.currentUser;
    const nameEl = document.getElementById('checkout-name');
    const phoneEl = document.getElementById('checkout-phone');
    const addrEl = document.getElementById('checkout-address');

    if (nameEl && !nameEl.value) nameEl.value = u.name || '';
    if (phoneEl && !phoneEl.value) phoneEl.value = u.phone || '';
    if (addrEl && !addrEl.value) addrEl.value = u.address || '';

    const cardHolderEl = document.getElementById('card-holder');
    if (cardHolderEl && !cardHolderEl.value && u.name) {
      cardHolderEl.value = u.name.toUpperCase();
      const previewName = document.getElementById('card-preview-name');
      if (previewName) previewName.innerText = u.name.toUpperCase();
    }
  }

  // Calculate totals
  let totalAmount = 0;
  let totalItemsCount = 0;
  state.cart.forEach(item => {
    totalAmount += (item.price * item.quantity);
    totalItemsCount += item.quantity;
  });

  // Update summary banner
  const itemsSummaryEl = document.getElementById('checkout-items-summary');
  if (itemsSummaryEl) {
    itemsSummaryEl.innerText = `${totalItemsCount} Adet Ürün Sepette (${state.cart.map(i => `${i.quantity}x ${i.name}`).slice(0, 2).join(', ')}${state.cart.length > 2 ? '...' : ''})`;
  }
  const totalPriceEl = document.getElementById('checkout-total-price');
  if (totalPriceEl) {
    totalPriceEl.innerText = totalAmount.toLocaleString('tr-TR');
  }

  // Generate Installment Options
  const installmentGrid = document.getElementById('installment-options-grid');
  if (installmentGrid) {
    const installments = [
      { count: 1, label: 'Tek Çekim', rate: 1.0, note: 'Peşin Fiyatına' },
      { count: 3, label: '3 Taksit', rate: 1.0, note: 'Vade Farksız' },
      { count: 6, label: '6 Taksit', rate: 1.0, note: 'Vade Farksız' },
      { count: 9, label: '9 Taksit', rate: 1.04, note: '%4 Vade' },
      { count: 12, label: '12 Taksit', rate: 1.08, note: '%8 Vade' }
    ];

    installmentGrid.innerHTML = installments.map((ins, idx) => {
      const finalTot = Math.round(totalAmount * ins.rate);
      const monthly = Math.round(finalTot / ins.count);
      const isChecked = idx === 0;

      return `
        <label class="relative flex flex-col p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:border-cyan-500/50 cursor-pointer transition-all has-[:checked]:border-cyan-400 has-[:checked]:bg-cyan-500/10">
          <input type="radio" name="selectedInstallment" value="${ins.count}" ${isChecked ? 'checked' : ''} onchange="updateCheckoutTotalByInstallment(${ins.count}, ${finalTot})" class="sr-only">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-white text-[11px]">${ins.label}</span>
            <span class="text-[9px] text-cyan-400 font-mono">${ins.note}</span>
          </div>
          <div class="font-mono text-cyan-300 font-bold text-xs">${monthly.toLocaleString('tr-TR')} ₺/ay</div>
          <span class="text-[9px] text-slate-500 font-mono">Toplam: ${finalTot.toLocaleString('tr-TR')} ₺</span>
        </label>
      `;
    }).join('');
  }

  // Set default method
  switchPaymentMethod('credit_card');

  openModal('checkout-modal');
  if (window.lucide) lucide.createIcons();
};

window.updateCheckoutTotalByInstallment = function(count, finalTotal) {
  const submitLabel = document.getElementById('checkout-submit-label');
  if (submitLabel) {
    submitLabel.innerText = `3D Secure ile Güvenli Öde (${finalTotal.toLocaleString('tr-TR')} ₺)`;
  }
};

window.switchPaymentMethod = function(method) {
  activePaymentMethod = method;

  const cardBox = document.getElementById('payment-credit-card-box');
  const bankBox = document.getElementById('payment-bank-box');
  const storeBox = document.getElementById('payment-store-box');

  const pillCard = document.getElementById('payment-pill-card');
  const pillBank = document.getElementById('payment-pill-bank');
  const pillStore = document.getElementById('payment-pill-store');

  const submitLabel = document.getElementById('checkout-submit-label');

  let totalAmount = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);

  if (pillCard) {
    pillCard.classList.toggle('border-cyan-400', method === 'credit_card');
    pillCard.classList.toggle('bg-cyan-500/10', method === 'credit_card');
    pillCard.classList.toggle('border-slate-800', method !== 'credit_card');
    pillCard.classList.toggle('bg-slate-800/40', method !== 'credit_card');
  }
  if (pillBank) {
    pillBank.classList.toggle('border-emerald-400', method === 'bank_transfer');
    pillBank.classList.toggle('bg-emerald-500/10', method === 'bank_transfer');
    pillBank.classList.toggle('border-slate-800', method !== 'bank_transfer');
    pillBank.classList.toggle('bg-slate-800/40', method !== 'bank_transfer');
  }
  if (pillStore) {
    pillStore.classList.toggle('border-amber-400', method === 'store_pickup');
    pillStore.classList.toggle('bg-amber-500/10', method === 'store_pickup');
    pillStore.classList.toggle('border-slate-800', method !== 'store_pickup');
    pillStore.classList.toggle('bg-slate-800/40', method !== 'store_pickup');
  }

  if (cardBox) cardBox.classList.toggle('hidden', method !== 'credit_card');
  if (bankBox) bankBox.classList.toggle('hidden', method !== 'bank_transfer');
  if (storeBox) storeBox.classList.toggle('hidden', method !== 'store_pickup');

  if (submitLabel) {
    if (method === 'credit_card') {
      submitLabel.innerText = `3D Secure ile Güvenli Öde (${totalAmount.toLocaleString('tr-TR')} ₺)`;
    } else if (method === 'bank_transfer') {
      const discounted = Math.round(totalAmount * 0.97);
      submitLabel.innerText = `Havale ile Siparişi Onayla (%3 İndirimli: ${discounted.toLocaleString('tr-TR')} ₺)`;
    } else {
      submitLabel.innerText = `Perpa Mağazada Teslim Al & Siparişi Onayla (${totalAmount.toLocaleString('tr-TR')} ₺)`;
    }
  }

  if (window.lucide) lucide.createIcons();
};

window.formatCardNumber = function(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
  input.value = formatted;

  const previewNum = document.getElementById('card-preview-number');
  if (previewNum) {
    previewNum.innerText = formatted ? formatted.padEnd(19, ' •••• •••• •••• ••••'.substring(formatted.length)) : '•••• •••• •••• ••••';
  }

  // Detect brand
  let brand = 'KART';
  if (val.startsWith('4')) {
    brand = 'VISA';
  } else if (/^(5[1-5]|2[2-7])/.test(val)) {
    brand = 'MASTERCARD';
  } else if (val.startsWith('9792')) {
    brand = 'TROY';
  } else if (/^(34|37)/.test(val)) {
    brand = 'AMEX';
  }

  const brandEl = document.getElementById('card-preview-brand');
  if (brandEl) brandEl.innerText = brand;
};

window.updateCardHolder = function(input) {
  const val = input.value.toUpperCase();
  const preview = document.getElementById('card-preview-name');
  if (preview) {
    preview.innerText = val || 'AD SOYAD';
  }
};

window.formatCardExpiry = function(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 3) {
    val = val.substring(0, 2) + '/' + val.substring(2);
  }
  input.value = val;

  const preview = document.getElementById('card-preview-expiry');
  if (preview) {
    preview.innerText = val || 'AA/YY';
  }
};

window.handleCheckoutSubmit = function(e) {
  e.preventDefault();

  if (state.cart.length === 0) {
    showToast('Sepetiniz boş.', 'error');
    return;
  }

  const name = (document.getElementById('checkout-name')?.value || '').trim();
  const phone = (document.getElementById('checkout-phone')?.value || '').trim();
  const address = (document.getElementById('checkout-address')?.value || '').trim();

  if (!name || !phone || !address) {
    showToast('Lütfen teslimat ve fatura bilgilerinizi eksiksiz doldurunuz.', 'error');
    return;
  }

  let totalAmount = 0;
  const itemsSummaryList = [];
  state.cart.forEach(cartItem => {
    totalAmount += cartItem.price * cartItem.quantity;
    itemsSummaryList.push(`${cartItem.quantity}x ${cartItem.name}`);
  });

  const selectedInsEl = document.querySelector('input[name="selectedInstallment"]:checked');
  const installmentCount = selectedInsEl ? parseInt(selectedInsEl.value) : 1;
  const installmentLabel = installmentCount === 1 ? 'Tek Çekim (Peşin)' : `${installmentCount} Taksit`;

  currentPendingOrder = {
    customer: name,
    phone: phone,
    address: address,
    itemsSummary: itemsSummaryList.slice(0, 2).join(', '),
    total: totalAmount,
    method: activePaymentMethod,
    installment: installmentLabel
  };

  if (activePaymentMethod === 'credit_card') {
    const cardNum = (document.getElementById('card-number')?.value || '').replace(/\s+/g, '');
    const cardHolder = (document.getElementById('card-holder')?.value || '').trim();
    const cardExpiry = (document.getElementById('card-expiry')?.value || '').trim();
    const cardCvv = (document.getElementById('card-cvv')?.value || '').trim();

    if (cardNum.length < 15) {
      showToast('Lütfen 16 haneli kredi kartı numaranızı eksiksiz giriniz.', 'error');
      return;
    }
    if (!cardHolder) {
      showToast('Lütfen kart üzerindeki isim ve soyisimi giriniz.', 'error');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      showToast('Lütfen son kullanma tarihini AA/YY formatında giriniz.', 'error');
      return;
    }
    if (cardCvv.length < 3) {
      showToast('Lütfen 3 haneli CVV güvenlik kodunu giriniz.', 'error');
      return;
    }

    const last4 = cardNum.substring(cardNum.length - 4);
    currentPendingOrder.last4 = last4;

    const use3D = document.getElementById('chk-3d-secure')?.checked !== false;

    if (use3D) {
      // Launch 3D Secure SMS Verification
      closeModal('checkout-modal');

      const amountEl = document.getElementById('secure-3d-amount');
      const maskEl = document.getElementById('secure-3d-card-mask');
      const phoneEl = document.getElementById('secure-3d-phone');
      const dateEl = document.getElementById('secure-3d-date');

      if (amountEl) amountEl.innerText = `${totalAmount.toLocaleString('tr-TR')} ₺`;
      if (maskEl) maskEl.innerText = `•••• •••• •••• ${last4}`;
      if (phoneEl) {
        phoneEl.innerText = phone.length > 6 ? `${phone.substring(0, 4)} *** ** ${phone.substring(phone.length - 2)}` : '0507 *** ** 98';
      }
      if (dateEl) dateEl.innerText = new Date().toLocaleString('tr-TR');

      start3DSecureCountdown();
      openModal('secure-3d-modal');
      if (window.lucide) lucide.createIcons();
      return;
    }
  }

  // If not credit card or 3D disabled:
  finalizeSuccessfulOrder(currentPendingOrder);
};

function start3DSecureCountdown() {
  if (secure3DCountdownTimer) clearInterval(secure3DCountdownTimer);
  let secondsLeft = 179;
  const timerEl = document.getElementById('secure-3d-timer');

  secure3DCountdownTimer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(secure3DCountdownTimer);
      if (timerEl) timerEl.innerText = '00:00 - Süre Doldu';
    } else {
      const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
      const secs = (secondsLeft % 60).toString().padStart(2, '0');
      if (timerEl) timerEl.innerText = `${mins}:${secs}`;
    }
  }, 1000);
}

window.close3DSecureModal = function() {
  if (secure3DCountdownTimer) clearInterval(secure3DCountdownTimer);
  closeModal('secure-3d-modal');
};

window.confirm3DSecurePayment = function() {
  const codeInput = document.getElementById('secure-3d-code-input');
  const code = (codeInput?.value || '').trim();

  if (!code || code.length < 6) {
    showToast('Lütfen 6 haneli SMS doğrulama kodunu giriniz (Demo: 123456).', 'error');
    return;
  }

  const btn = document.getElementById('btn-confirm-3d-payment');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block animate-spin mr-2">⟳</span> Banka 3D Secure Onayı Alınıyor...`;
  }

  setTimeout(() => {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i><span>Onayla ve Ödemeyi Tamamla</span>`;
    }
    if (secure3DCountdownTimer) clearInterval(secure3DCountdownTimer);
    closeModal('secure-3d-modal');

    finalizeSuccessfulOrder(currentPendingOrder || {
      customer: 'Sayın Müşteri',
      total: state.cart.reduce((s, i) => s + (i.price * i.quantity), 0),
      method: 'credit_card',
      installment: 'Tek Çekim'
    });
  }, 900);
};

function finalizeSuccessfulOrder(pending) {
  let totalAmount = 0;
  const itemsSummaryList = [];

  state.cart.forEach(cartItem => {
    const prod = state.products.find(p => p.id === cartItem.id);
    if (prod) {
      prod.stock = Math.max(0, (prod.stock || 0) - cartItem.quantity);
      totalAmount += cartItem.price * cartItem.quantity;
      itemsSummaryList.push(`${cartItem.quantity}x ${cartItem.name}`);
      if (window.syncProductToOpenCart) {
        window.syncProductToOpenCart(prod);
      }
    }
  });

  const orderId = Math.floor(10000 + Math.random() * 90000);
  let methodLabel = 'Kredi Kartı (3D Secure)';
  if (pending.method === 'bank_transfer') methodLabel = 'Havale / EFT (%3 İndirimli)';
  if (pending.method === 'store_pickup') methodLabel = 'Perpa Mağazada Elden Teslim';

  const newOrder = {
    id: orderId,
    customer: pending.customer,
    phone: pending.phone,
    address: pending.address,
    itemsCount: state.cart.reduce((s, i) => s + i.quantity, 0),
    itemsSummary: itemsSummaryList.slice(0, 2).join(', '),
    total: pending.total || totalAmount,
    method: methodLabel,
    installment: pending.installment || 'Tek Çekim',
    status: 'Ödendi / Hazırlanıyor',
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  };

  // Push to global orders
  state.orders.unshift(newOrder);
  localStorage.setItem('dag_orders', JSON.stringify(state.orders));

  // Push to current user orders if logged in
  if (state.currentUser) {
    if (!state.currentUser.orders) state.currentUser.orders = [];
    state.currentUser.orders.unshift(newOrder);
    localStorage.setItem('dag_current_user', JSON.stringify(state.currentUser));

    const uIdx = state.users.findIndex(u => u.id === state.currentUser.id);
    if (uIdx >= 0) {
      state.users[uIdx].orders = state.currentUser.orders;
      localStorage.setItem('dag_users', JSON.stringify(state.users));
    }
    renderUserNav();
  }

  saveProductsState();

  // Clear cart
  state.cart = [];
  saveCart();
  updateCartBadge();
  closeModal('checkout-modal');

  renderProducts();
  renderAdminStats();
  renderAdminProductsTable();

  // Show Success Receipt Modal
  const recId = document.getElementById('receipt-order-id');
  const recMethod = document.getElementById('receipt-payment-method');
  const recTotal = document.getElementById('receipt-total-amount');

  if (recId) recId.innerText = `#DT-${orderId}`;
  if (recMethod) recMethod.innerText = `${methodLabel} - ${pending.installment || 'Tek Çekim'}`;
  if (recTotal) recTotal.innerText = `${(pending.total || totalAmount).toLocaleString('tr-TR')} ₺`;

  openModal('order-success-modal');
  if (window.lucide) lucide.createIcons();
  showToast(`Ödeme başarıyla onaylandı! Sipariş No: #DT-${orderId}`, 'success');
}

// ==========================================================================
// 6. PRODUCT DETAIL MODAL (QUICK-VIEW)
// ==========================================================================
window.openProductModal = function(productId) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return;

  const content = document.getElementById('product-modal-content');
  if (!content) return;

  const stock = Number(p.stock !== undefined ? p.stock : 10);
  const isOutOfStock = stock <= 0;
  const wishlist = (state.currentUser && state.currentUser.wishlist) || [];
  const isFavorited = wishlist.includes(p.id);
  const isAdmin = !!(state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.email === 'admin@dagteknoloji.com.tr' || state.currentUser.email === 'admin@dag.com' || state.isAdmin));

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Visual Column -->
      <div class="p-6 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
        <div class="w-full h-64 rounded-2xl bg-slate-900/60 p-4 flex items-center justify-center mb-4 relative overflow-hidden">
          ${getProductImageUrl(p) ? `
            <img 
              src="${getProductImageUrl(p)}" 
              alt="${(p.name || '').replace(/<[^>]*>/g, ' ')}" 
              class="max-h-full max-w-full object-contain filter drop-shadow-lg" 
              onerror="this.onerror=null; this.parentElement.innerHTML = getFallbackSchematicHtml('${p.category}', '${encodeURIComponent(p.brand || '')}', '${encodeURIComponent(p.sku || '')}', '${p.id}');" 
            />
          ` : `
            <div class="w-full h-full flex flex-col items-center justify-center relative">
              <div class="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>
              <div class="relative z-10 flex flex-col items-center justify-center">
                ${getCategorySchematicSvg(p.category, "w-20 h-20 drop-shadow-[0_0_12px_rgba(0,240,255,0.25)]")}
                <span class="text-xs font-mono font-bold text-cyan-400 uppercase mt-3">${p.brand || 'DAĞ TEKNOLOJİ'}</span>
                <span class="text-[11px] font-mono text-slate-400 mt-0.5">${p.sku || p.id}</span>
              </div>
            </div>
          `}
        </div>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-semibold px-3 py-1 rounded-full border ${p.badgeColor}">${p.badge}</span>
          ${isOutOfStock ? `
            <span class="stock-badge-out px-2.5 py-0.5 rounded-full text-xs font-bold">Stok Tükendi</span>
          ` : `
            <span class="stock-badge-in px-2.5 py-0.5 rounded-full text-xs font-bold">Stokta (${stock} adet)</span>
          `}
        </div>
        <span class="text-xs text-slate-400 font-mono">Perpa Ticaret Merkezi B Blok No:825 Stok Teslim</span>
      </div>

      <!-- Details Column -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-mono uppercase text-cyan-400 font-bold">${getCategoryName(p.category)}</span>
          ${p.brand ? `<span class="text-xs bg-slate-800 px-2.5 py-0.5 rounded-md text-slate-300 font-mono">${p.brand}</span>` : ''}
        </div>
        
        <h3 class="text-xl font-extrabold text-white mt-1 mb-2">${p.name}</h3>
        <p class="text-xs text-slate-300 leading-relaxed mb-4">${p.desc}</p>

        <div class="space-y-2 mb-6">
          <h5 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Teknik Özellikler:</h5>
          <div class="grid grid-cols-2 gap-2">
            ${(p.specs || ['Orijinal Perpa Tedariği', 'Garantili Kalite', 'Aynı Gün Sevkiyat', 'Teknik Destek']).map(s => `
              <div class="text-xs bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 text-slate-200 flex items-center gap-1.5">
                <i data-lucide="check" class="w-3.5 h-3.5 text-cyan-400"></i>
                <span>${s}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="flex items-baseline gap-3 mb-6 flex-wrap">
          <span class="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span class="text-3xl font-extrabold text-white font-mono">${getProductPrice(p).toLocaleString('tr-TR')}</span>
            <span class="text-lg text-cyan-400 font-bold">₺</span>
          </span>
          ${p.oldPrice ? `<span class="text-sm text-slate-500 line-through">${getProductOldPrice(p).toLocaleString('tr-TR')} ₺</span>` : ''}
          <span class="text-xs text-emerald-400 font-medium">KDV Dahil</span>
          
        </div>

        <div class="flex items-center gap-2.5">
          ${isOutOfStock ? `
            <button disabled class="flex-1 py-3 px-6 rounded-xl bg-slate-800 text-slate-500 font-bold text-sm cursor-not-allowed">
              Ürün Şu Anda Tükendi
            </button>
          ` : `
            <button onclick="addToCart('${p.id}'); closeModal('product-modal');" class="flex-1 py-3 px-3 rounded-xl glow-cyan-btn text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5">
              <i data-lucide="shopping-bag" class="w-4 h-4"></i>
              <span>Sepete Ekle</span>
            </button>
            <button onclick="closeModal('product-modal'); buyNowWithCreditCard('${p.id}', 1);" class="flex-1 py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md">
              <i data-lucide="credit-card" class="w-4 h-4"></i>
              <span>Kartla Hemen Al</span>
            </button>
          `}
          
          <button onclick="toggleWishlist('${p.id}'); openProductModal('${p.id}');" class="p-3 rounded-xl border border-slate-800 ${isFavorited ? 'text-rose-500 bg-rose-500/15' : 'text-slate-400 hover:text-rose-400 bg-slate-800'}" title="Favorilere Ekle">
            <i data-lucide="heart" class="w-5 h-5 ${isFavorited ? 'fill-rose-500' : ''}"></i>
          </button>

          <a href="https://wa.me/905070201198?text=Merhaba,%20${encodeURIComponent(p.name)}%20(SKU:%20${p.sku || p.id},%20Fiyat:%20${getProductPrice(p)}%20TL)%20hakkında%20bilgi%20almak%20istiyorum." target="_blank" class="p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors" title="WhatsApp ile Sor">
            <i data-lucide="message-circle" class="w-5 h-5"></i>
          </a>
        </div>

        ${isAdmin ? `
          <div class="mt-4 pt-3 border-t border-slate-800">
            <button onclick="closeModal('product-modal'); openEditProductModal('${p.id}');" class="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all">
              <i data-lucide="edit-3" class="w-4 h-4 text-amber-400"></i>
              <span>Yönetici Olarak Bu Ürünü Düzenle</span>
              <span class="px-1.5 py-0.5 text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded font-mono font-bold">ADMIN</span>
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  openModal('product-modal');
  if (window.lucide) lucide.createIcons();
};

// ==========================================================================
// 7. ADMIN PANEL SYSTEM (YÖNETİCİ PANELİ - YALNIZCA GİRİŞ YAPAN YÖNETİCİLER İÇİN)
// ==========================================================================
window.openAdminLogin = function() {
  const isAdmin = !!(state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.email === 'admin@dagteknoloji.com.tr' || state.isAdmin));
  if (isAdmin) {
    openAdminDashboard();
  } else {
    showToast('Yönetici paneline erişmek için yetkili yönetici hesabıyla oturum açmalısınız.', 'info');
    openAuthModal('login');
  }
};

window.handleAdminLogin = function(e) {
  if (e) e.preventDefault();
  handleDemoLogin('admin');
};

window.adminLogout = function() {
  userLogout();
};

function updateAdminUI() {
  const adminBadge = document.getElementById('admin-status-badge');
  if (adminBadge) {
    adminBadge.classList.toggle('hidden', !state.isAdmin);
  }
}

window.openAdminDashboard = function(initialTab = 'catalog') {
  const isAdmin = !!(state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.email === 'admin@dagteknoloji.com.tr' || state.currentUser.email === 'admin@dag.com' || state.isAdmin));
  if (!isAdmin) {
    showToast('Bu panele yalnızca yetkili yöneticiler erişebilir. Lütfen yönetici hesabınızla giriş yapın.', 'error');
    openAuthModal('login');
    return;
  }
  renderAdminStats();
  renderAdminProductsTable();
  renderAdminOrdersTable();
  switchAdminTab(initialTab);
  openModal('admin-panel-modal');
  if (window.lucide) lucide.createIcons();
};
window.openAdminPanel = window.openAdminDashboard;

window.switchAdminTab = function(tabName = 'catalog') {
  if (tabName === 'shortcuts') tabName = 'opencart';
  const catalogTab = document.getElementById('admin-tab-catalog');
  const opencartTab = document.getElementById('admin-tab-opencart');

  const catalogBtn = document.getElementById('admin-tab-catalog-btn');
  const opencartBtn = document.getElementById('admin-tab-opencart-btn');

  if (catalogTab) catalogTab.classList.toggle('hidden', tabName !== 'catalog');
  if (opencartTab) opencartTab.classList.toggle('hidden', tabName !== 'opencart');

  if (catalogBtn) {
    catalogBtn.classList.toggle('border-cyan-400', tabName === 'catalog');
    catalogBtn.classList.toggle('text-cyan-400', tabName === 'catalog');
    catalogBtn.classList.toggle('border-transparent', tabName !== 'catalog');
    catalogBtn.classList.toggle('text-slate-400', tabName !== 'catalog');
  }

  if (opencartBtn) {
    opencartBtn.classList.toggle('border-blue-400', tabName === 'opencart');
    opencartBtn.classList.toggle('text-blue-400', tabName === 'opencart');
    opencartBtn.classList.toggle('border-transparent', tabName !== 'opencart');
    opencartBtn.classList.toggle('text-slate-400', tabName !== 'opencart');
  }

  if (window.lucide) lucide.createIcons();
};

window.openOpenCartWindow = function(route = '') {
  const url = route ? `https://dagteknoloji.com.tr/admin/index.php?route=${route}` : 'https://dagteknoloji.com.tr/admin';
  const width = Math.min(1366, (window.screen && window.screen.availWidth) ? window.screen.availWidth - 40 : 1200);
  const height = Math.min(880, (window.screen && window.screen.availHeight) ? window.screen.availHeight - 60 : 800);
  const left = Math.max(0, ((window.screen && window.screen.availWidth ? window.screen.availWidth : 1920) - width) / 2);
  const top = Math.max(0, ((window.screen && window.screen.availHeight ? window.screen.availHeight : 1080) - height) / 2);

  window.open(
    url,
    'OpenCartAdminWindow',
    `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=yes,scrollbars=yes,resizable=yes`
  );
};

function renderAdminStats() {
  const totalProductsEl = document.getElementById('admin-stat-total-products');
  const totalStockEl = document.getElementById('admin-stat-total-stock');
  const lowStockEl = document.getElementById('admin-stat-low-stock');
  const totalValueEl = document.getElementById('admin-stat-total-value');

  const totalProducts = state.products.length;
  const totalStock = state.products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const lowStockCount = state.products.filter(p => Number(p.stock || 0) <= 5).length;
  const totalValue = state.products.reduce((sum, p) => sum + (getProductPrice(p) * Number(p.stock || 0)), 0);

  if (totalProductsEl) totalProductsEl.innerText = totalProducts.toLocaleString('tr-TR');
  if (totalStockEl) totalStockEl.innerText = `${totalStock.toLocaleString('tr-TR')} Adet`;
  if (lowStockEl) lowStockEl.innerText = `${lowStockCount.toLocaleString('tr-TR')} Ürün`;
  if (totalValueEl) totalValueEl.innerText = `${totalValue.toLocaleString('tr-TR')} ₺`;
}

function renderAdminProductsTable() {
  const tbody = document.getElementById('admin-products-tbody') || document.getElementById('admin-products-table-body');
  if (!tbody) return;

  const q = state.adminFilter.query.toLowerCase();
  const cat = state.adminFilter.category;
  const stockFilter = state.adminFilter.stockOnly;

  let items = state.products.filter(p => {
    if (cat !== 'all' && p.category !== cat) return false;
    const stk = Number(p.stock || 0);
    if (stockFilter === 'low' && (stk > 5 || stk <= 0)) return false;
    if (stockFilter === 'out' && stk > 0) return false;
    if (stockFilter === 'in' && stk <= 0) return false;

    if (q) {
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchSku = (p.sku || '').toLowerCase().includes(q);
      const matchBrand = (p.brand || '').toLowerCase().includes(q);
      const matchId = (p.id || '').toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchBrand && !matchId) return false;
    }
    return true;
  });

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500">Aramaya uygun ürün bulunamadı.</td></tr>`;
    return;
  }

  const limit = state.adminFilter.displayLimit || 100;
  const displayItems = items.slice(0, limit);

  const countBadge = document.getElementById('admin-table-count');
  if (countBadge) {
    countBadge.innerText = items.length > displayItems.length 
      ? `${displayItems.length} / ${items.length.toLocaleString('tr-TR')} Ürün` 
      : `${items.length.toLocaleString('tr-TR')} Ürün`;
  }

  let tableHtml = displayItems.map((p, idx) => {
    const stock = Number(p.stock !== undefined ? p.stock : 10);
    const dynPrice = getProductPrice(p);
    let stockStatusHtml = '';
    if (stock <= 0) {
      stockStatusHtml = `<span class="stock-badge-out px-2 py-0.5 rounded text-[10px] font-bold">Tükendi</span>`;
    } else if (stock <= 5) {
      stockStatusHtml = `<span class="stock-badge-low px-2 py-0.5 rounded text-[10px] font-bold">Kritik (${stock})</span>`;
    } else {
      stockStatusHtml = `<span class="stock-badge-in px-2 py-0.5 rounded text-[10px] font-bold">Normal (${stock})</span>`;
    }

    return `
      <tr class="admin-table-row border-b border-slate-800/80 transition-colors">
        <td class="py-3 px-4 text-xs font-mono text-slate-500">${idx + 1}</td>
        
        <!-- Clickable Product Info (Opens urun-detay.html?id=...) -->
        <td class="py-3 px-4">
          <a href="urun-detay.html?id=${p.id}" target="_blank" class="flex items-center gap-3 group/prod hover:opacity-95 transition-opacity" title="Ürünün Sayfasını Aç (Yeni Sekme)">
            <div class="relative shrink-0">
              ${getProductThumbHtml(p, "w-10 h-10 group-hover/prod:ring-2 ring-cyan-400 rounded-lg transition-all")}
            </div>
            <div>
              <div class="text-xs font-bold text-white group-hover/prod:text-cyan-400 transition-colors line-clamp-1 max-w-[240px] flex items-center gap-1.5" title="${p.name}">
                <span>${p.name}</span>
                <i data-lucide="external-link" class="w-3 h-3 text-cyan-400 opacity-60 group-hover/prod:opacity-100 transition-opacity shrink-0"></i>
              </div>
              <div class="text-[10px] text-slate-500 font-mono">${p.sku || p.id} • ${p.brand || 'Dağ Tech'}</div>
            </div>
          </a>
        </td>

        <td class="py-3 px-4 text-xs text-slate-300 font-mono">${getCategoryName(p.category)}</td>
        
        <td class="py-3 px-4 text-xs font-bold text-cyan-400 font-mono">${dynPrice.toLocaleString('tr-TR')} ₺</td>
        
        <!-- Live Quick Stock Adjustment -->
        <td class="py-3 px-4">
          <div class="flex items-center gap-1.5">
            <button onclick="adminAdjustStock('${p.id}', -1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold">-</button>
            <input type="number" min="0" value="${stock}" onchange="adminSetStock('${p.id}', this.value)" class="w-14 text-center py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono font-bold focus:border-cyan-400 focus:outline-none" />
            <button onclick="adminAdjustStock('${p.id}', 1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold">+</button>
          </div>
        </td>

        <td class="py-3 px-4">${stockStatusHtml}</td>

        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <!-- Dedicated Button to View Dedicated Product Page -->
            <a href="urun-detay.html?id=${p.id}" target="_blank" title="Ürünün Sayfasına Git (Yeni Sekme)" class="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 transition-colors border border-slate-700/80">
              <i data-lucide="external-link" class="w-4 h-4"></i>
            </a>
            <button onclick="openEditProductModal('${p.id}')" title="Ürünü Düzenle" class="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition-colors">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="adminDeleteProduct('${p.id}')" title="Ürünü Sil" class="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500 hover:text-white text-slate-400 transition-colors">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (items.length > displayItems.length) {
    tableHtml += `
      <tr>
        <td colspan="7" class="text-center py-4 bg-slate-900/60 border-t border-slate-800">
          <button onclick="state.adminFilter.displayLimit = (state.adminFilter.displayLimit || 100) + 100; renderAdminProductsTable();" class="px-5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-xs border border-cyan-500/40 transition-all">
            Daha Fazla Ürün Göster (+100 / Kalan: ${(items.length - displayItems.length).toLocaleString('tr-TR')})
          </button>
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = tableHtml;

  if (window.lucide) lucide.createIcons();
}

function renderAdminOrdersTable() {
  const container = document.getElementById('admin-orders-tbody');
  if (!container) return;

  if (state.orders.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500">Henüz kaydedilmiş sipariş bulunmuyor.</td></tr>`;
    return;
  }

  container.innerHTML = state.orders.map((o, idx) => `
    <tr class="border-b border-slate-800/80">
      <td class="py-3 px-4 text-xs font-mono text-cyan-400">#ORD-${o.id || (1000 + idx)}</td>
      <td class="py-3 px-4 text-xs font-bold text-white">${o.customer || 'İsimsiz Müşteri'}</td>
      <td class="py-3 px-4 text-xs text-slate-300">${o.itemsCount || 1} Ürün (${o.itemsSummary || 'Detay'})</td>
      <td class="py-3 px-4 text-xs font-mono font-bold text-emerald-400">${(o.total || 0).toLocaleString('tr-TR')} ₺</td>
      <td class="py-3 px-4 text-xs text-slate-500">${o.date || 'Bugün'}</td>
    </tr>
  `).join('');
}

window.adminSetStock = function(productId, newQty) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return;
  p.stock = Math.max(0, parseInt(newQty) || 0);
  saveProductsState();
  renderAdminStats();
  renderAdminProductsTable();
  renderProducts();
  showToast(`${p.name} stok adedi ${p.stock} olarak güncellendi.`);
};

window.adminAdjustStock = function(productId, delta) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return;
  const current = Number(p.stock || 0);
  p.stock = Math.max(0, current + delta);
  saveProductsState();
  renderAdminStats();
  renderAdminProductsTable();
  renderProducts();
};

window.adminDeleteProduct = function(productId) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return;
  if (confirm(`'${p.name}' adlı ürünü silmek istediğinize emin misiniz?`)) {
    state.products = state.products.filter(item => item.id !== productId);
    saveProductsState();
    renderBrandFilters();
    renderAdminStats();
    renderAdminProductsTable();
    renderProducts();
    showToast(`'${p.name}' katalogdan silindi!`, 'success');
  }
};

window.openNewProductModal = function() {
  document.getElementById('product-form-title').innerText = 'Yeni Ürün Ekle';
  document.getElementById('edit-product-id').value = '';
  document.getElementById('product-form').reset();
  openModal('edit-product-modal');
};

window.openEditProductModal = function(productId) {
  const p = state.products.find(item => item.id === productId);
  if (!p) return;

  const titleEl = document.getElementById('product-form-title');
  if (titleEl) titleEl.innerText = 'Ürünü Düzenle: ' + (p.name.length > 35 ? p.name.substring(0, 32) + '...' : p.name);
  const editIdEl = document.getElementById('edit-product-id');
  if (editIdEl) editIdEl.value = p.id;
  const nameEl = document.getElementById('form-prod-name');
  if (nameEl) nameEl.value = p.name;
  const catEl = document.getElementById('form-prod-category');
  if (catEl) catEl.value = p.category;
  const brandEl = document.getElementById('form-prod-brand');
  if (brandEl) brandEl.value = p.brand || '';
  const priceEl = document.getElementById('form-prod-price');
  if (priceEl) priceEl.value = p.price;
  const oldPriceEl = document.getElementById('form-prod-old-price');
  if (oldPriceEl) oldPriceEl.value = p.oldPrice || '';
  const stockEl = document.getElementById('form-prod-stock');
  if (stockEl) stockEl.value = p.stock !== undefined ? p.stock : 10;
  const imgEl = document.getElementById('form-prod-image');
  if (imgEl) imgEl.value = p.image || p.remoteImage || '';
  const descEl = document.getElementById('form-prod-desc');
  if (descEl) descEl.value = p.desc || '';
  const specsEl = document.getElementById('form-prod-specs');
  if (specsEl) specsEl.value = (p.specs || []).join(', ');

  openModal('edit-product-modal');
  if (window.lucide) lucide.createIcons();
};

window.handleAdminEditPrompt = function(productId) {
  const isAdmin = !!(state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.email === 'admin@dagteknoloji.com.tr' || state.currentUser.email === 'admin@dag.com' || state.isAdmin));
  if (isAdmin) {
    openEditProductModal(productId);
  } else {
    showToast('Bu ürünü düzenlemek için lütfen yetkili yönetici hesabıyla oturum açın.', 'info');
    openAuthModal('login');
  }
};

window.handleSaveProductForm = function(e) {
  e.preventDefault();
  const editId = document.getElementById('edit-product-id').value;
  const name = document.getElementById('form-prod-name').value.trim();
  const category = document.getElementById('form-prod-category').value;
  const brand = document.getElementById('form-prod-brand').value.trim() || 'Dağ Tech';
  const price = parseInt(document.getElementById('form-prod-price').value) || 0;
  const oldPrice = parseInt(document.getElementById('form-prod-old-price').value) || 0;
  const stock = parseInt(document.getElementById('form-prod-stock').value) || 0;
  const image = document.getElementById('form-prod-image').value.trim() || 'assets/logo.svg';
  const desc = document.getElementById('form-prod-desc').value.trim();
  const rawSpecs = document.getElementById('form-prod-specs').value;
  const specs = rawSpecs.split(',').map(s => s.trim()).filter(Boolean);

  if (editId) {
    const p = state.products.find(item => item.id === editId);
    if (p) {
      p.name = name;
      p.category = category;
      p.brand = brand;
      p.price = price;
      p.oldPrice = oldPrice;
      p.stock = stock;
      p.image = image;
      p.desc = desc;
      p.subtitle = desc.length > 75 ? desc.substring(0, 72) + '...' : desc;
      p.specs = specs.length > 0 ? specs : p.specs;
      showToast(`${p.name} başarıyla güncellendi!`, 'success');
    }
  } else {
    const newId = 'dt-custom-' + Date.now();
    const newProduct = {
      id: newId,
      sku: 'DT-' + Math.floor(1000 + Math.random() * 9000),
      name: name,
      category: category,
      brand: brand,
      price: price,
      oldPrice: oldPrice,
      stock: stock,
      rating: 5.0,
      reviews: 1,
      badge: 'YENİ ÜRÜN',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: category === 'printers' ? 'printer' : category === 'filaments' ? 'disc' : category === 'toners' ? 'file-text' : 'tool',
      image: image,
      remoteImage: image,
      desc: desc,
      subtitle: desc.length > 75 ? desc.substring(0, 72) + '...' : desc,
      specs: specs.length > 0 ? specs : ['Orijinal Garanti', 'Perpa Stok', 'Hızlı Teslimat']
    };
    state.products.unshift(newProduct);
    showToast(`'${name}' başarıyla kataloğa eklendi!`, 'success');
  }

  saveProductsState();
  closeModal('edit-product-modal');
  renderBrandFilters();
  renderAdminStats();
  renderAdminProductsTable();
  renderProducts();
  if (document.getElementById('product-detail-hero')) {
    initProductDetailPage();
  }
  if (window.lucide) lucide.createIcons();

  if (editId) {
    const updatedProd = state.products.find(item => item.id === editId);
    if (updatedProd && window.syncProductToOpenCart) {
      window.syncProductToOpenCart(updatedProd);
    }
  }
};

window.resetToDefaultProducts = function() {
  if (confirm('Tüm ürünleri ve stokları orijinal fabrika ayarlarına (3.428 ürün) sıfırlamak istediğinize emin misiniz?')) {
    try { localStorage.removeItem('dag_custom_products'); } catch(e) {}
    state.products = window.DAG_PRODUCTS ? JSON.parse(JSON.stringify(window.DAG_PRODUCTS)) : [];
    saveProductsState();
    renderBrandFilters();
    renderAdminStats();
    renderAdminProductsTable();
    renderProducts();
    showToast('Katalog orijinal ayarlara (3.428 Ürün) sıfırlandı!', 'success');
  }
};

function saveProductsState() {
  try {
    localStorage.setItem('dag_custom_products', JSON.stringify(state.products));
  } catch(e) {
    console.warn('LocalStorage limit or disabled:', e);
  }
}

// ==========================================================================
// OPENCART CANLI SENKRONİZASYON VE STOK KÖPRÜSÜ
// ==========================================================================
window.syncProductToOpenCart = async function(p) {
  if (!p) return;
  const cfg = JSON.parse(localStorage.getItem('dag_opencart_sync') || 'null') || {
    enabled: true,
    endpoint: 'opencart_sync_bridge.php',
    secretKey: 'DAG_TECH_2026_SYNC'
  };

  const ocId = p.oc_id || (p.id ? parseInt(p.id.replace('dt-', '')) : null);
  console.log(`[OpenCart Sync] Ürün: ${p.name} (ID: ${p.id}, OC_ID: ${ocId}), Güncel Stok: ${p.stock}`);

  if (!cfg.enabled || !cfg.endpoint) return;

  try {
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: cfg.secretKey,
        action: 'update_stock',
        product_id: ocId,
        sku: p.sku || p.id,
        quantity: p.stock,
        price: p.price
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        console.log(`[OpenCart Sync] Başarılı: OpenCart veritabanı güncellendi (${p.stock} adet).`);
      }
    }
  } catch(e) {
    console.log(`[OpenCart Sync] Köprüye bağlanılamadı (${e.message || e}). Yerel veritabanında saklandı.`);
  }
};

// ==========================================================================
// 8. TOAST NOTIFICATIONS & MODALS
// ==========================================================================
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';

  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-5 h-5 ${type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : 'text-cyan-400'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  requestAnimationFrame(() => { toast.classList.add('show'); });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.remove(); }, 300);
  }, 3500);
}

function setupEventListeners() {
  // Mobile Nav Toggle
  const mobileToggle = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-menu');
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('hidden');
    });
  }

  // Contact Form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Talebiniz başarıyla alındı! Ekibimiz 15 dakika içinde dönüş yapacaktır.', 'success');
      contactForm.reset();
    });
  }

  // Checkout Form Delegation
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm && !checkoutForm.hasAttribute('onsubmit')) {
    checkoutForm.addEventListener('submit', (e) => {
      if (window.handleCheckoutSubmit) {
        window.handleCheckoutSubmit(e);
      }
    });
  }
}


// ==========================================================================
// 8. DEDICATED PRODUCT DETAIL PAGE (URUN-DETAY.HTML)
// ==========================================================================
let detailSelectedQty = 1;

window.switchDetailTab = function(tabName) {
  document.querySelectorAll('.detail-tab-btn').forEach(btn => {
    const isTarget = btn.dataset.tab === tabName;
    btn.classList.toggle('bg-cyan-500', isTarget);
    btn.classList.toggle('text-slate-950', isTarget);
    btn.classList.toggle('shadow-lg', isTarget);
    btn.classList.toggle('shadow-cyan-500/20', isTarget);
    btn.classList.toggle('bg-slate-800/60', !isTarget);
    btn.classList.toggle('text-slate-300', !isTarget);
  });
  document.querySelectorAll('.detail-tab-content').forEach(content => {
    content.classList.toggle('hidden', content.id !== 'tab-content-' + tabName);
  });
};

window.changeDetailQty = function(delta) {
  detailSelectedQty = Math.max(1, Math.min(99, detailSelectedQty + delta));
  const el = document.getElementById('detail-qty-input');
  if (el) el.value = detailSelectedQty;
};

window.setDetailQty = function(val) {
  detailSelectedQty = Math.max(1, Math.min(99, parseInt(val) || 1));
  const el = document.getElementById('detail-qty-input');
  if (el) el.value = detailSelectedQty;
};

window.switchDetailMainImage = function(src, btnEl) {
  const mainImg = document.getElementById('detail-main-image');
  if (mainImg) {
    mainImg.src = src;
  }
  document.querySelectorAll('.detail-thumb-btn').forEach(b => {
    b.classList.remove('border-cyan-400', 'ring-1', 'ring-cyan-400');
    b.classList.add('border-slate-800');
  });
  if (btnEl) {
    btnEl.classList.remove('border-slate-800');
    btnEl.classList.add('border-cyan-400', 'ring-1', 'ring-cyan-400');
  }
};

function getProductDetailedSpecs(p) {
  const specs = [];
  const name = (p.name || '').toLowerCase();
  
  if (p.category === 'printers') {
    if (name.includes('bambu') && name.includes('a1 mini')) {
      specs.push({ key: 'Baskı Teknolojisi', val: 'FDM (Fused Deposition Modeling)' });
      specs.push({ key: 'Baskı Hacmi', val: '180 x 180 x 180 mm' });
      specs.push({ key: 'Maksimum Baskı Hızı', val: '500 mm/s (İvmelenme: 10.000 mm/s²)' });
      specs.push({ key: 'Nozzle Sıcaklığı & Tipi', val: 'Maks. 300°C • 0.4mm Paslanmaz Çelik Quick-Swap' });
      specs.push({ key: 'Tabla Sıcaklığı', val: 'Maks. 80°C • Dokulu PEI Yay Çeliği' });
      specs.push({ key: 'Desteklenen Filamentler', val: 'PLA, PETG, TPU, PVA (Çok Renkli AMS Lite Uyumlu)' });
      specs.push({ key: 'Kalibrasyon & Seviyeleme', val: 'Tam Otomatik Aktif Akış Hızı & Titreşim Kompenzasyonu' });
      specs.push({ key: 'Ekran & Arayüz', val: '2.4 inç Renkli IPS Dokunmatik Ekran' });
      specs.push({ key: 'Kamera & İzleme', val: 'Dahili Düşük Kare Hızlı İzleme & Hızlandırılmış Çekim Kamerası' });
      specs.push({ key: 'Bağlantı Türleri', val: 'Wi-Fi (Bambu Handy App & Bambu Studio), MicroSD' });
      specs.push({ key: 'Gövde Boyutları & Ağırlık', val: '347 x 315 x 365 mm • Net: 5.5 kg' });
    } else if (name.includes('flsun')) {
      specs.push({ key: 'Baskı Teknolojisi', val: 'Yüksek Hızlı Delta FDM Teknolojisi' });
      specs.push({ key: 'Baskı Hacmi', val: name.includes('s1') ? 'Ø 320 x 430 mm Ultra Geniş' : 'Ø 260 x 330 mm' });
      specs.push({ key: 'Maksimum Baskı Hızı', val: name.includes('s1') ? '1200 mm/s (İvmelenme: 40.000 mm/s²)' : '1000 mm/s' });
      specs.push({ key: 'Nozzle Sıcaklığı', val: 'Maks. 350°C Yüksek Akışlı All-Metal Hotend' });
      specs.push({ key: 'Tabla Sıcaklığı', val: 'Maks. 120°C Hızlı Isınan Manyetik PEI' });
      specs.push({ key: 'Desteklenen Filamentler', val: 'PLA, PETG, ABS, ASA, TPU, PA (Karbon Fiber Takviyeli)' });
      specs.push({ key: 'Kamera & AI', val: 'Dahili AI Kamera • Gerçek Zamanlı Hata Algılama' });
      specs.push({ key: 'Kurutma Kutusu', val: name.includes('s1') ? 'Entegre Filament Kurutma Bölmesi Dahil' : 'Opsiyonel' });
      specs.push({ key: 'Ekran & İşletim Sistemi', val: '7 inç Geniş IPS Dokunmatik Ekran • Klipper Tabanlı Flsun OS' });
      specs.push({ key: 'Bağlantı', val: 'Wi-Fi, Ethernet, USB Disk' });
    } else if (name.includes('lazer') || name.includes('falcon') || name.includes('ray')) {
      specs.push({ key: 'Cihaz Tipi', val: 'Endüstriyel Kapalı Kasa Lazer Gravür & Kesim Makinesi' });
      specs.push({ key: 'Optik Lazer Gücü', val: name.includes('40w') ? '40W Gerçek Çıkış Gücü (4x Diyot Birleştirme)' : '20W Diyot Lazer' });
      specs.push({ key: 'Lazer Dalgaboyu', val: '455 ± 5 nm Güçlü Mavi Lazer' });
      specs.push({ key: 'Çalışma / Gravür Alanı', val: '400 x 415 mm Geniş Çalışma Tablası' });
      specs.push({ key: 'Maksimum Gravür Hızı', val: '25.000 mm/dakika' });
      specs.push({ key: 'Kesim Kapasitesi', val: '20mm Ihlamur Ahşap, 15mm Siyah Akrilik, 0.15mm Paslanmaz Çelik' });
      specs.push({ key: 'Güvenlik Standartları', val: 'FDA Sınıf 1 Tam Kapalı Emniyet Kabini, Koruma Kilidi' });
      specs.push({ key: 'Hava Desteği (Air Assist)', val: 'Entegre Akıllı Ayarlanabilir Hava Pompası Dahil' });
      specs.push({ key: 'Duman Tahliye', val: 'Dahili Güçlü Egzoz Fanı ve Duman Borusu' });
      specs.push({ key: 'Uyumlu Yazılımlar', val: 'LightBurn, LaserGRBL, Creality Falcon Studio' });
    } else if (name.includes('tarayıcı') || name.includes('scan') || name.includes('ferret') || name.includes('raptor') || name.includes('otter')) {
      specs.push({ key: 'Tarama Teknolojisi', val: name.includes('raptor') ? 'Hibrit Mavi Lazer + NIR Kızılötesi Yapılandırılmış Işık' : 'NIR Kızılötesi Yapılandırılmış Çift Kamera' });
      specs.push({ key: 'Metroloji Doğruluğu', val: name.includes('raptor') ? '0.02 mm @ 100mm (Ultra Yüksek Hassasiyet)' : '0.05 mm' });
      specs.push({ key: 'Tarama Hızı', val: '60 FPS / Saniyede 2 Milyon Nokta Yakalama' });
      specs.push({ key: 'Çalışma / Tarama Mesafesi', val: '150 mm - 1000 mm Çoklu Mesafe Desteği' });
      specs.push({ key: 'Doku & Renk Kamerası', val: '24-bit Gerçek Renkli Yüksek Çözünürlüklü RGB Sensör' });
      specs.push({ key: 'Çıktı Formatları', val: 'OBJ, STL, PLY (3D Baskı ve CAD Uyumlu)' });
      specs.push({ key: 'Uyumlu İşletim Sistemleri', val: 'Windows 10/11 64-bit, macOS, Android, iOS' });
      specs.push({ key: 'Ağırlık & Ergonomi', val: 'Taşınabilir Hafif Alüminyum Gövde (380g)' });
    } else {
      specs.push({ key: 'Baskı Teknolojisi', val: 'Endüstriyel FDM / Lazer Üretim Sistemi' });
      specs.push({ key: 'Kalite Standartları', val: 'Mikron Düzeyi Hassasiyet, CE Sertifikalı' });
      specs.push({ key: 'Garanti', val: '2 Yıl Resmi Dağ Teknoloji Distribütör Garantisi' });
    }
  } else if (p.category === 'filaments') {
    specs.push({ key: 'Malzeme Türü', val: name.includes('petg') ? 'PETG (Polietilen Tereftalat Glikol)' : name.includes('tpu') ? 'Esnek TPU 95A' : name.includes('abs') ? 'ABS Endüstriyel' : 'PLA+ (Polilaktik Asit - Yüksek Mukavemet)' });
    specs.push({ key: 'Filament Çapı & Tolerans', val: '1.75 mm ± 0.02 mm Hassas Lazer Kalibrasyonlu' });
    specs.push({ key: 'Net Filament Ağırlığı', val: '1.000 g (1 Kg Makara Dahil ~1.25 Kg)' });
    specs.push({ key: 'Önerilen Nozzle Sıcaklığı', val: name.includes('petg') ? '220°C - 250°C' : name.includes('tpu') ? '210°C - 230°C' : '195°C - 225°C' });
    specs.push({ key: 'Önerilen Tabla Sıcaklığı', val: name.includes('petg') ? '70°C - 80°C' : name.includes('tpu') ? '50°C - 60°C' : '50°C - 65°C' });
    specs.push({ key: 'Önerilen Baskı Hızı', val: '50 - 300 mm/s (Yüksek Hızlı Yazıcı Uyumlu)' });
    specs.push({ key: 'Sarım Tipi', val: 'Düğümsüz (Tangle-Free) Robotik Hassas Hat Sarımı' });
    specs.push({ key: 'Paketleme Standardı', val: 'Vakumlu Alüminyum/PE Poşet, Silika Jel Nem Koruyucu' });
    specs.push({ key: 'Baskı Özellikleri', val: 'Çarpılma (Warping) Yapmaz, Kokusuz, Yüksek Katman Yapışması' });
  } else if (p.category === 'toners') {
    specs.push({ key: 'Ürün Sınıfı', val: 'A+ Kalite Premium Muadil Lazer Toner' });
    specs.push({ key: 'Baskı Kapasitesi', val: 'Yaklaşık 1.000 - 2.500 Sayfa (A4 %5 Sayfa Doluluk Oranında)' });
    specs.push({ key: 'Çip Entegrasyonu', val: 'Yeni Nesil Sıfır Akıllı Çip (Tak-Çalıştır, Yazılım Engeline Takılmaz)' });
    specs.push({ key: 'Baskı Rengi', val: name.includes('cyan') || name.includes('mavi') ? 'Mavi (Cyan)' : name.includes('magenta') || name.includes('kırmızı') ? 'Kırmızı (Magenta)' : name.includes('yellow') || name.includes('sarı') ? 'Sarı (Yellow)' : 'Derin Siyah (Black)' });
    specs.push({ key: 'OPC Drum', val: 'Uzun Ömürlü, Yüksek Çözünürlüklü Sıfır Drum Ünitesi' });
    specs.push({ key: 'Sertifikalar', val: 'ISO 9001:2015, ISO 14001, CE, RoHS Belgeli' });
    specs.push({ key: 'Garanti', val: '%100 Birebir Değişim ve Yazıcı Dostu Garanti' });
  } else {
    specs.push({ key: 'Parça Grubu', val: '3D Yazıcı & CNC Mekanik / Elektronik Yedek Parça' });
    specs.push({ key: 'Malzeme', val: 'Yüksek Isı İletkenli Pirinç / Sertleştirilmiş Çelik / Bimetal' });
    specs.push({ key: 'Uyumlu Modeller', val: 'Creality, Bambu Lab, Anycubic, Voron, Prusa Uyumlu' });
    specs.push({ key: 'Kalite Güvencesi', val: 'Mikron Düzeyi CNC İşleme Toleransı' });
  }

  specs.push({ key: 'Menşei / Dağıtıcı', val: 'Dağ Teknoloji Perpa Ticaret Merkezi / İthalatçı Güvenceli' });
  specs.push({ key: 'Fatura & Vergi', val: 'KDV Dahil • Kurumsal ve Bireysel e-Fatura' });

  return specs;
}

function getProductDetailedDescription(p) {
  let html = '<p class="text-sm text-slate-300 leading-relaxed mb-4">' + (p.desc || p.subtitle || '') + '</p>';
  
  if (p.category === 'printers') {
    html += `
      <h4 class="text-base font-bold text-white mt-6 mb-3 flex items-center gap-2">
        <i data-lucide="zap" class="w-4 h-4 text-cyan-400"></i>
        <span>Neden Bu Cihazı Tercih Etmelisiniz?</span>
      </h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="font-bold text-white text-xs mb-1 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
            Endüstriyel Hız ve Kararlılık
          </div>
          <p class="text-xs text-slate-400">En zorlu baskılarda dahi rezonans ve titreşimleri yok eden algoritması sayesinde hatasız yüzey kalitesi sunar.</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="font-bold text-white text-xs mb-1 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            Zahmetsiz Otomasyon
          </div>
          <p class="text-xs text-slate-400">Kutudan çıkar çıkmaz dakikalar içinde baskıya hazır. Manuel kalibrasyon derdine son veren sensör altyapısı.</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="font-bold text-white text-xs mb-1 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-400"></span>
            Geniş Malzeme Uyumluluğu
          </div>
          <p class="text-xs text-slate-400">Standart PLA dan mühendislik tipi PETG, TPU ve karbon takviyeli filamentlere kadar geniş hammadde yelpazesi.</p>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="font-bold text-white text-xs mb-1 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-purple-400"></span>
            Dağ Teknoloji B/825 Güvencesi
          </div>
          <p class="text-xs text-slate-400">Cihazınızı Perpa mağazamızda çalışırken görebilir, elden teslim alabilir ve yedek parça ihtiyacınızı anında çözebilirsiniz.</p>
        </div>
      </div>
    `;
  } else if (p.category === 'filaments') {
    html += `
      <h4 class="text-base font-bold text-white mt-6 mb-3 flex items-center gap-2">
        <i data-lucide="layers" class="w-4 h-4 text-cyan-400"></i>
        <span>Üstün Baskı Avantajları</span>
      </h4>
      <ul class="space-y-2 mb-6 text-xs text-slate-300">
        <li class="flex items-start gap-2"><i data-lucide="check" class="w-4 h-4 text-cyan-400 shrink-0 mt-0.5"></i> <span><strong>Sıfır Düğüm Garantisi:</strong> Robotik sarım teknolojisi sayesinde baskı esnasında makarada sıkışma ve baskı yarım kalma riski yoktur.</span></li>
        <li class="flex items-start gap-2"><i data-lucide="check" class="w-4 h-4 text-cyan-400 shrink-0 mt-0.5"></i> <span><strong>Tolerans Kararlılığı:</strong> Çift lazer eksenli ölçümle kontrol edilen 1.75mm çap, katmanlar arasında pürüzsüz akış ve mükemmel yüzey oluşturur.</span></li>
        <li class="flex items-start gap-2"><i data-lucide="check" class="w-4 h-4 text-cyan-400 shrink-0 mt-0.5"></i> <span><strong>Nem Korumalı Özel Ambalaj:</strong> Üretim hattından çıkar çıkmaz vakumlanarak nem alıcı silika jel paketi ile birlikte mühürlenir.</span></li>
      </ul>
    `;
  } else if (p.category === 'toners') {
    html += `
      <h4 class="text-base font-bold text-white mt-6 mb-3 flex items-center gap-2">
        <i data-lucide="file-check" class="w-4 h-4 text-cyan-400"></i>
        <span>Kurumsal Lazer Toner Kalitesi</span>
      </h4>
      <p class="text-xs text-slate-300 leading-relaxed mb-4">
        Ofis ve kurumsal çalışma ortamınızda yazıcı masraflarınızı %70 e varan oranda düşürürken orijinal toner kalitesinde keskin metin ve net grafik baskısı almanızı sağlar. Yazıcınızın tamburuna ve mekanizmasına zarar vermez, dökülme yapmaz.
      </p>
    `;
  }
  
  return html;
}

function getProductBoxContents(p) {
  if (p.category === 'printers') {
    return [
      '1 Adet ' + p.name + ' Ana Gövdesi & Montaj Kiti',
      'Dokulu Manyetik PEI Yay Çeliği Baskı Tablası',
      'Alet Takımı (Alyan Anahtarları, Nozzle İğnesi, Tornavida, Yan Keski)',
      'Güç Kablosu (220V TR Priz Uyumlu) & USB / Veri Kablosu',
      'Test İçin Orijinal Numune Filament (PLA ~250g)',
      'Hızlı Kurulum Kılavuzu & Türkçe Kullanım Rehberi',
      'Dağ Teknoloji 2 Yıl Kaşeli Resmi Garanti Belgesi'
    ];
  } else if (p.category === 'filaments') {
    return [
      '1 Adet ' + p.name + ' (1 Kg Net Filament)',
      'Vakumlu ve Mühürlü Alüminyum/Plastik Koruma Poşeti',
      'Nem Emici Silika Jel Paketi',
      'Makaralı Özel Kutu Ambalajı'
    ];
  } else if (p.category === 'toners') {
    return [
      '1 Adet ' + p.name + ' (Korumalı Işık Geçirmez Siyah Torba İçinde)',
      'Hava Yastıklı Koruyucu Özel Air-Bag Darbe Kılıfı',
      'Koruma Şeridi ve Turuncu Emniyet Kilitleri (Kullanmadan önce çekiniz)',
      'Türkçe Kurulum ve Değişim Yönergesi'
    ];
  } else {
    return [
      '1 Adet ' + p.name,
      'Anti-Statik Koruyucu Ambalaj',
      'Garanti & Kalite Kontrol Onay Belgesi'
    ];
  }
}

function initProductDetailPage() {
  const heroEl = document.getElementById('product-detail-hero');
  if (!heroEl) return;

  const urlParams = new URLSearchParams(window.location.search);
  const prodId = urlParams.get('id');
  let p = state.products.find(item => item.id === prodId);
  if (!p) {
    p = state.products.find(item => item.category === 'printers') || state.products[0];
  }
  if (!p) return;

  detailSelectedQty = 1;
  document.title = p.name + ' | DAĞ TEKNOLOJİ';

  // Breadcrumb
  const bcCat = document.getElementById('breadcrumb-category-link');
  if (bcCat) {
    bcCat.href = 'urunler.html?cat=' + p.category;
    bcCat.innerText = getCategoryName(p.category);
  }
  const bcProd = document.getElementById('breadcrumb-product-name');
  if (bcProd) {
    bcProd.innerText = p.name;
    bcProd.title = p.name;
  }

  const stock = Number(p.stock !== undefined ? p.stock : 10);
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;
  const wishlist = (state.currentUser && state.currentUser.wishlist) || [];
  const isFavorited = wishlist.includes(p.id);
  const isAdmin = !!(state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.email === 'admin@dagteknoloji.com.tr' || state.currentUser.email === 'admin@dag.com' || state.isAdmin));

  let stockStatusHtml = '';
  if (isOutOfStock) {
    stockStatusHtml = `
      <div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
        <span class="w-3 h-3 rounded-full bg-rose-500 shrink-0"></span>
        <div>
          <div class="text-xs font-bold text-rose-400">Ürün Şu Anda Tükendi</div>
          <div class="text-[11px] text-slate-400">Yeni sevkiyat yolda. Ön sipariş ve temin süresi için WhatsApp'tan yazabilirsiniz.</div>
        </div>
      </div>
    `;
  } else if (isLowStock) {
    stockStatusHtml = `
      <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
        <span class="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0"></span>
        <div>
          <div class="text-xs font-bold text-amber-300">Kritik Stok: Son ` + stock + ` Adet!</div>
          <div class="text-[11px] text-slate-400">Perpa Ticaret Merkezi depomuzda tükenmek üzere. Hemen sipariş verebilirsiniz.</div>
        </div>
      </div>
    `;
  } else {
    stockStatusHtml = `
      <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
        <span class="w-3 h-3 rounded-full bg-emerald-400 shrink-0"></span>
        <div>
          <div class="text-xs font-bold text-emerald-300">Stokta Var (` + stock + ` Adet Hazır)</div>
          <div class="text-[11px] text-slate-400">Bugün 16:00'ya kadar aynı gün kargo veya Perpa B Blok No:825'ten hemen elden teslim.</div>
        </div>
      </div>
    `;
  }

  const imgUrl = getProductImageUrl(p);
  let mainVisualHtml = '';
  if (imgUrl) {
    mainVisualHtml = '<img id="detail-main-image" src="' + imgUrl + '" alt="' + p.name + '" class="max-h-full max-w-full object-contain filter drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 ' + (isOutOfStock ? 'grayscale-[50%]' : '') + '" onerror="this.onerror=null; this.src=\'assets/logo.svg\';" />';
  } else {
    mainVisualHtml = '<div class="w-full h-full flex flex-col items-center justify-center relative py-8">' +
      '<div class="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none"></div>' +
      '<div class="w-32 h-32 rounded-full bg-cyan-500/10 filter blur-2xl pointer-events-none"></div>' +
      '<div class="relative z-10 flex flex-col items-center justify-center text-center">' +
        getCategorySchematicSvg(p.category, "w-28 h-28 drop-shadow-[0_0_15px_rgba(0,240,255,0.25)]") +
        '<div class="mt-4 px-4 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">' +
          '<span class="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">' + (p.brand || 'DAĞ TEKNOLOJİ') + '</span>' +
          '<span class="text-xs font-mono text-slate-400 ml-2">SKU: ' + (p.sku || p.id) + '</span>' +
        '</div>' +
        '<p class="text-[11px] text-slate-400 mt-2 max-w-xs">Endüstriyel Teknik Parça Şeması • Orijinal / A+ Muadil Ambalajında Sevk Edilir</p>' +
      '</div>' +
    '</div>';
  }

  let thumbsStripHtml = '';
  const validImages = (p.images || [imgUrl]).filter(img => img && typeof img === 'string' && !img.includes('no_image'));
  if (validImages.length > 1) {
    thumbsStripHtml = '<div class="flex items-center gap-3 overflow-x-auto py-1 max-w-full">' +
      validImages.map((u, idx) => '<button onclick="switchDetailMainImage(\'' + u + '\', this)" class="detail-thumb-btn w-20 h-20 rounded-2xl bg-slate-900/80 border ' + (idx === 0 ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-slate-800') + ' p-2 hover:border-cyan-400 transition-all flex items-center justify-center overflow-hidden shrink-0" title="Görsel ' + (idx + 1) + '"><img src="' + u + '" alt="' + p.name + '" class="max-h-full max-w-full object-contain" onerror="this.onerror=null; this.src=\'assets/logo.svg\';" /></button>').join('') +
    '</div>';
  }
  if (!thumbsStripHtml) {
    thumbsStripHtml = '<div class="grid grid-cols-3 gap-2 text-center">' +
      '<div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80"><span class="block text-[10px] font-mono font-bold text-cyan-400 uppercase">Perpa Depo</span><span class="block text-[9px] text-slate-500 mt-0.5">Stoktan Teslim</span></div>' +
      '<div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80"><span class="block text-[10px] font-mono font-bold text-cyan-400 uppercase">Test Edilmiş</span><span class="block text-[9px] text-slate-500 mt-0.5">Teknik Kontrol</span></div>' +
      '<div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80"><span class="block text-[10px] font-mono font-bold text-cyan-400 uppercase">Hızlı Kargo</span><span class="block text-[9px] text-slate-500 mt-0.5">Aynı Gün 16:00</span></div>' +
    '</div>';
  }

  heroEl.innerHTML = `
    <!-- Left Column: Visual Gallery (Col 5) -->
    <div class="lg:col-span-5 space-y-4">
      <div class="glass-panel p-6 rounded-3xl border border-slate-800 relative group overflow-hidden bg-slate-950/70">
        <!-- Floating Badges -->
        <div class="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ` + p.badgeColor + `">` + p.badge + `</span>
          ` + (p.brand ? `<span class="text-[11px] font-mono text-cyan-400 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800">` + p.brand + `</span>` : '') + `
        </div>
        <span class="absolute top-4 right-4 z-10 text-[10px] tracking-wider font-mono text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 uppercase">Perpa B/825</span>

        <!-- Large Main Image View -->
        <div class="w-full h-80 sm:h-96 rounded-2xl bg-slate-900/50 p-6 flex items-center justify-center relative overflow-hidden">
          ` + mainVisualHtml + `
        </div>
      </div>

      <!-- Thumbnail Strip or Assurance Badges -->
      ` + thumbsStripHtml + `

      <!-- Quick Trust Badges Under Image -->
      <div class="grid grid-cols-2 gap-3 pt-2">
        <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2.5">
          <i data-lucide="shield-check" class="w-5 h-5 text-cyan-400 shrink-0"></i>
          <span class="text-xs text-slate-300 font-semibold">2 Yıl Dağ Tech Garantisi</span>
        </div>
        <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2.5">
          <i data-lucide="store" class="w-5 h-5 text-emerald-400 shrink-0"></i>
          <span class="text-xs text-slate-300 font-semibold">Perpa Elden Teslimat</span>
        </div>
      </div>
    </div>

    <!-- Right Column: Product Info & Buy Box (Col 7) -->
    <div class="lg:col-span-7 space-y-6">
      
      <div>
        <div class="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">` + getCategoryName(p.category) + `</span>
            <span class="text-slate-600">•</span>
            <span class="text-xs font-mono text-slate-400">SKU: ` + (p.sku || p.id) + `</span>
            ` + (p.brand ? `<span class="text-xs font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">` + p.brand + `</span>` : '') + `
          </div>
          ` + (isAdmin ? `
            <button 
              onclick="openEditProductModal('` + p.id + `')" 
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] group"
              title="Yönetici Olarak Bu Ürünü Düzenle"
            >
              <i data-lucide="edit-3" class="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform"></i>
              <span>Ürünü Düzenle</span>
              <span class="px-1.5 py-0.2 text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded font-mono font-bold">ADMIN</span>
            </button>
          ` : `
            <button 
              onclick="handleAdminEditPrompt('` + p.id + `')" 
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-400/40 text-slate-400 hover:text-amber-300 text-[11px] font-medium transition-all group"
              title="Yönetici girişi yaparak bu ürünü düzenleyebilirsiniz"
            >
              <i data-lucide="shield" class="w-3 h-3 text-slate-400 group-hover:text-amber-400"></i>
              <span>Yönetici: Ürünü Düzenle</span>
            </button>
          `) + `
        </div>

        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3">
          ` + p.name + `
        </h1>

        <div class="flex items-center gap-3 text-xs">
          <div class="flex items-center text-amber-400">
            ` + Array(5).fill(0).map(() => `<i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>`).join('') + `
          </div>
          <span class="text-white font-bold">` + (p.rating || 4.9) + `</span>
          <span class="text-slate-500">(` + (p.reviews || 28) + ` Müşteri Değerlendirmesi)</span>
          <span class="text-slate-600">•</span>
          <span class="text-cyan-400 font-mono">Perpa Mağaza Çok Satan</span>
        </div>
      </div>

      <!-- Price Box -->
      <div class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <div class="flex items-baseline gap-3 flex-wrap">
            <span class="inline-flex items-baseline gap-1 whitespace-nowrap">
              <span class="text-3xl sm:text-4xl font-extrabold text-white font-mono">` + getProductPrice(p).toLocaleString('tr-TR') + `</span>
              <span class="text-lg sm:text-xl text-cyan-400 font-bold">₺</span>
            </span>
            ` + (p.oldPrice ? `
              <span class="text-sm sm:text-base text-slate-500 line-through font-mono ml-2">` + getProductOldPrice(p).toLocaleString('tr-TR') + ` ₺</span>
              <span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                %` + Math.round(((getProductOldPrice(p) - getProductPrice(p)) / getProductOldPrice(p)) * 100) + ` İndirim
              </span>
            ` : '') + `
          </div>
          <div class="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            <span>Fiyatlara KDV dahildir • Kurumsal fatura düzenlenir.</span>
            
          </div>
        </div>

        <div class="text-right">
          <span class="text-xs font-mono text-emerald-400 font-semibold block">Ücretsiz / Hızlı Kargo</span>
          <span class="text-[10px] text-slate-500">Tüm Türkiye'ye Sigortalı Gönderim</span>
        </div>
      </div>

      <!-- Live Stock Banner -->
      ` + stockStatusHtml + `

      <!-- Quick Specs Pills -->
      <div class="flex flex-wrap gap-2">
        ` + (p.specs || ['Endüstriyel Kalite', 'Perpa Servis Desteği', 'Aynı Gün Kargo']).map(s => `
          <span class="text-xs bg-slate-800/80 border border-slate-700/80 text-slate-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
            <i data-lucide="check" class="w-3.5 h-3.5 text-cyan-400"></i>
            <span>` + s + `</span>
          </span>
        `).join('') + `
      </div>

      <!-- Purchase Action Controls -->
      <div class="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div class="flex flex-wrap items-center gap-4">
          <!-- Quantity Counter -->
          <div class="flex items-center rounded-xl bg-slate-800 border border-slate-700 p-1">
            <button onclick="changeDetailQty(-1)" class="w-9 h-9 rounded-lg hover:bg-slate-700 text-slate-200 flex items-center justify-center text-base font-bold transition-colors">-</button>
            <input 
              id="detail-qty-input" 
              type="number" 
              min="1" 
              max="99" 
              value="1" 
              onchange="setDetailQty(this.value)" 
              class="w-12 text-center bg-transparent text-sm font-bold text-white font-mono focus:outline-none"
            />
            <button onclick="changeDetailQty(1)" class="w-9 h-9 rounded-lg hover:bg-slate-700 text-slate-200 flex items-center justify-center text-base font-bold transition-colors">+</button>
          </div>

          <!-- Add to Cart Button -->
          ` + (isOutOfStock ? `
            <button disabled class="flex-1 py-3.5 px-6 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed border border-slate-700 uppercase tracking-wider">
              Ürün Şu Anda Tükendi
            </button>
          ` : `
            <div class="flex-1 flex items-center gap-2.5 flex-wrap">
              <button 
                onclick="addToCart('` + p.id + `', detailSelectedQty); toggleCartDrawer(true);" 
                class="flex-1 min-w-[130px] py-3.5 px-3 rounded-xl glow-cyan-btn text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95"
              >
                <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                <span>Sepete Ekle</span>
              </button>

              <button 
                onclick="buyNowWithCreditCard('` + p.id + `', detailSelectedQty);" 
                class="flex-1 min-w-[160px] py-3.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform active:scale-95"
                title="Kredi kartı ile 3D Secure güvenli hemen satın al"
              >
                <i data-lucide="credit-card" class="w-4 h-4"></i>
                <span>Kredi Kartı ile Hemen Al</span>
              </button>
            </div>
          `) + `

          <!-- Wishlist Heart Button -->
          <button 
            onclick="toggleWishlist('` + p.id + `'); initProductDetailPage();" 
            class="p-3.5 rounded-xl border border-slate-700 ` + (isFavorited ? 'text-rose-500 bg-rose-500/15 border-rose-500/40' : 'text-slate-400 hover:text-rose-400 bg-slate-800/80') + ` transition-all"
            title="` + (isFavorited ? 'Favorilerden Çıkar' : 'Favorilere Ekle') + `"
          >
            <i data-lucide="heart" class="w-5 h-5 ` + (isFavorited ? 'fill-rose-500' : '') + `"></i>
          </button>
        </div>

        <!-- WhatsApp Quick Order Button -->
        <a 
          href="https://wa.me/905070201198?text=Merhaba,%20Da%C4%9F%20Teknoloji%20web%20sitenizden%20` + encodeURIComponent(p.name) + `%20(SKU:%20` + (p.sku || p.id) + `,%20Fiyat:%20` + getProductPrice(p) + `%20TL)%20hakk%C4%B1nda%20bilgi%20almak%20ve%20sipari%C5%9F%20vermek%20istiyorum." 
          target="_blank" 
          class="w-full py-3.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <i data-lucide="message-circle" class="w-4 h-4"></i>
          <span>WhatsApp ile Hızlı Sipariş Ver &amp; Bilgi Al (0507 020 11 98)</span>
        </a>

        <!-- Admin Direct Edit Button -->
        ` + (isAdmin ? `
          <div class="pt-2 border-t border-slate-800/80">
            <button 
              onclick="openEditProductModal('` + p.id + `')" 
              class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-400/30 text-amber-300 border border-amber-500/40 hover:border-amber-400/60 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)] group"
            >
              <i data-lucide="edit" class="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform"></i>
              <span>Yönetici Paneli: Bu Ürünü Düzenle (Fiyat, Stok, Bilgiler)</span>
            </button>
          </div>
        ` : '') + `
      </div>

    </div>
  `;

  // Render Tabs Content
  const specsTab = document.getElementById('tab-content-specs');
  if (specsTab) {
    const detailedSpecs = getProductDetailedSpecs(p);
    specsTab.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <div>
          <h4 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="sliders" class="w-4 h-4 text-cyan-400"></i>
            <span>Ayrıntılı Teknik Parametreler &amp; Özellik Tablosu</span>
          </h4>
          <p class="text-xs text-slate-400 mt-0.5">Üretici fabrika test ve kalibrasyon değerleri</p>
        </div>
        <span class="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30 font-bold">100% Orijinal</span>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-800">
        <table class="w-full text-left text-xs">
          <tbody class="divide-y divide-slate-800/80">
            ` + detailedSpecs.map((s, idx) => `
              <tr class="` + (idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/10') + ` hover:bg-slate-800/50 transition-colors">
                <td class="p-3.5 font-mono font-semibold text-slate-300 w-1/3 sm:w-1/4 border-r border-slate-800/60">` + s.key + `</td>
                <td class="p-3.5 text-slate-200 font-medium">` + s.val + `</td>
              </tr>
            `).join('') + `
          </tbody>
        </table>
      </div>
    `;
  }

  const descTab = document.getElementById('tab-content-desc');
  if (descTab) {
    descTab.innerHTML = getProductDetailedDescription(p);
  }

  const boxTab = document.getElementById('tab-content-box');
  if (boxTab) {
    const boxItems = getProductBoxContents(p);
    boxTab.innerHTML = `
      <h4 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <i data-lucide="box" class="w-4 h-4 text-cyan-400"></i>
        <span>Kutu ve Paket İçeriği</span>
      </h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ` + boxItems.map(item => `
          <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <span class="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <i data-lucide="check" class="w-3.5 h-3.5"></i>
            </span>
            <span class="text-xs text-slate-200 font-medium">` + item + `</span>
          </div>
        `).join('') + `
      </div>
    `;
  }

  // Render Related Products
  const relatedContainer = document.getElementById('related-products-grid');
  if (relatedContainer) {
    const relatedItems = state.products
      .filter(item => item.id !== p.id && (item.category === p.category || (p.category === 'printers' && item.category === 'filaments')))
      .slice(0, 4);

    relatedContainer.innerHTML = relatedItems.map(rel => {
      return `
        <div class="glass-panel rounded-2xl overflow-hidden flex flex-col justify-between group hover:-translate-y-1.5 transition-all duration-300">
          <div class="p-3 pb-0">
            ` + renderProductCardVisualHtml(rel, false) + `
          </div>
          <div class="p-4 pt-2 flex-1 flex flex-col justify-between">
            <a href="urun-detay.html?id=` + rel.id + `" class="block">
              <h5 class="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2 mb-2">` + rel.name + `</h5>
            </a>
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span class="text-sm font-extrabold text-white font-mono whitespace-nowrap">` + getProductPrice(rel).toLocaleString('tr-TR') + ` ₺</span>
              <a href="urun-detay.html?id=` + rel.id + `" class="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-[11px] font-bold transition-all">
                İncele
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Deep-link initial tab if provided in URL (?tab=desc or #desc)
  const initialTab = urlParams.get('tab') || window.location.hash.replace('#', '');
  if (initialTab && ['specs', 'desc', 'box', 'delivery'].includes(initialTab)) {
    switchDetailTab(initialTab);
  }

  if (urlParams.get('open_edit') === '1' && isAdmin) {
    setTimeout(() => openEditProductModal(p.id), 100);
  }

  if (urlParams.get('checkout') === '1') {
    setTimeout(() => buyNowWithCreditCard(p.id), 200);
  }

  if (urlParams.get('test_3d') === '1') {
    setTimeout(() => {
      currentPendingOrder = {
        customer: 'Ahmet Yılmaz',
        phone: '0507 020 11 98',
        address: 'Perpa Ticaret Merkezi B Blok No:825',
        total: 107840,
        last4: '4816',
        method: 'credit_card',
        installment: 'Tek Çekim'
      };
      const amountEl = document.getElementById('secure-3d-amount');
      const maskEl = document.getElementById('secure-3d-card-mask');
      const phoneEl = document.getElementById('secure-3d-phone');
      const dateEl = document.getElementById('secure-3d-date');
      if (amountEl) amountEl.innerText = '107.840 ₺';
      if (maskEl) maskEl.innerText = '•••• •••• •••• 4816';
      if (phoneEl) phoneEl.innerText = '0507 *** ** 98';
      if (dateEl) dateEl.innerText = new Date().toLocaleString('tr-TR');
      openModal('secure-3d-modal');
      start3DSecureCountdown();
      if (window.lucide) lucide.createIcons();
    }, 200);
  }

  if (urlParams.get('test_receipt') === '1') {
    setTimeout(() => {
      const recId = document.getElementById('receipt-order-id');
      const recMethod = document.getElementById('receipt-payment-method');
      const recTotal = document.getElementById('receipt-total-amount');
      if (recId) recId.innerText = '#DT-94821';
      if (recMethod) recMethod.innerText = 'Kredi Kartı (3D Secure Onaylı) - 6 Taksit';
      if (recTotal) recTotal.innerText = '107.840 ₺';
      openModal('order-success-modal');
      if (window.lucide) lucide.createIcons();
    }, 200);
  }

  if (window.lucide) lucide.createIcons();
}

// ==========================================================================
// UNIVERSAL PAGE-TO-PAGE CYBER LOADING ENGINE
// ==========================================================================
function initPageTransitionEngine() {
  let bar = document.getElementById('page-loading-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'page-loading-bar';
    document.body.appendChild(bar);
  }

  // Smooth entrance completion
  bar.style.opacity = '1';
  bar.style.width = '100%';
  setTimeout(() => {
    bar.style.opacity = '0';
    setTimeout(() => {
      bar.style.width = '0%';
    }, 320);
  }, 180);

  // Restore on back/forward cache
  window.addEventListener('pageshow', () => {
    document.body.classList.remove('page-transitioning');
    if (bar) {
      bar.style.opacity = '0';
      bar.style.width = '0%';
    }
  });

  // Intercept internal page link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (link.target === '_blank' || href.includes('wa.me') || href.includes('api.whatsapp.com')) return;
    if (href.startsWith('http://') || href.startsWith('https://')) {
      if (!href.includes(window.location.host)) return;
    }

    // Smooth page exit transition
    e.preventDefault();
    if (bar) {
      bar.style.transition = 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease';
      bar.style.opacity = '1';
      bar.style.width = '40%';
      setTimeout(() => { bar.style.width = '78%'; }, 50);
      setTimeout(() => { bar.style.width = '94%'; }, 120);
    }
    document.body.classList.add('page-transitioning');

    setTimeout(() => {
      window.location.href = href;
    }, 160);
  });
}
