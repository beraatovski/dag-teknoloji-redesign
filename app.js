/**
 * DAĞ TEKNOLOJİ - MODERN WEB PLATFORM
 * Interactive 3D Engine, Slicing Cost Estimator, Catalog, and Cart
 */

// --- PRODUCT DATABASE ---
// Loads all real scraped products from products.js (132 products from dagteknoloji.com.tr)
const PRODUCTS = (window.DAG_PRODUCTS && window.DAG_PRODUCTS.length > 0) ? window.DAG_PRODUCTS : [
  // 3D Yazıcılar
  {
    id: 'pr-1',
    category: 'printers',
    name: 'Bambu Lab P1S Combo (AMS 4 Renk)',
    subtitle: 'Kapalı Kasa Çok Renkli Yüksek Hızlı 3D Yazıcı',
    price: 38990,
    oldPrice: 42500,
    rating: 4.9,
    reviews: 64,
    badge: 'ÇOK SATAN',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: 'printer',
    specs: ['500 mm/s Hız', 'Otomatik Kalibrasyon', 'Kapalı Gövde', '4 Renkli Baskı'],
    desc: 'Endüstriyel seviye hassasiyet ve kutudan çıkar çıkmaz dakikalar içinde baskı deneyimi. Karbon hava filtreleme ve AMS çok renkli baskı sistemiyle profesyonellerin ilk tercihi.'
  },
  {
    id: 'pr-2',
    category: 'printers',
    name: 'Creality K1C Carbon Flagship',
    subtitle: 'Karbon Fiber Takviyeli Filament Uyumlu 600 mm/s',
    price: 24490,
    oldPrice: 26900,
    rating: 4.8,
    reviews: 42,
    badge: 'KARBON ÖZEL',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: 'zap',
    specs: ['600 mm/s Hız', 'Sertleştirilmiş Çelik Nozzle', 'AI Kamera', '300°C Hotend'],
    desc: 'Aşındırıcı karbon fiber kompozit filamentlerle kesintisiz baskı için özel tasarlanmış unicorn nozzle ve dahili yapay zeka gözetleme kamerası.'
  },
  {
    id: 'pr-3',
    category: 'printers',
    name: 'Anycubic Kobra 2 Max',
    subtitle: 'Devasa Baskı Hacmi: 420 x 420 x 500 mm',
    price: 21750,
    oldPrice: 23900,
    rating: 4.7,
    reviews: 29,
    badge: 'GENİŞ ALAN',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    icon: 'maximize-2',
    specs: ['420x420x500 mm Hacim', 'LeviQ 2.0 Otomatik Tesviye', 'Hızlı Soğutma', '500 mm/s Hız'],
    desc: 'Mimarlık ofisleri, cosplay tasarımcıları ve büyük ölçekli prototip üretenler için devasa baskı alanı sunan uygun maliyetli canavar.'
  },
  {
    id: 'pr-4',
    category: 'printers',
    name: 'Elegoo Saturn 3 Ultra 12K (SLA Reçine)',
    subtitle: 'Mikron Hassasiyetinde Endüstriyel Reçine Yazıcı',
    price: 27900,
    oldPrice: 30500,
    rating: 4.9,
    reviews: 38,
    badge: '12K EKRAN',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: 'sparkles',
    specs: ['12K Mono LCD', '19x24 Mikron Detay', 'ACF Hızlı Film', 'Dahili Hava Filtresi'],
    desc: 'Diş hekimliği, kuyumculuk ve minyatür modellemede pürüzsüz yüzey kalitesi arayanlar için 12K çözünürlüklü amiral gemisi.'
  },
  {
    id: 'pr-5',
    category: 'printers',
    name: 'Revopoint Inspire 3D El Tarayıcısı',
    subtitle: 'Tersine Mühendislik & Metrik 0.02 mm Hassasiyet',
    price: 18950,
    oldPrice: 21000,
    rating: 4.8,
    reviews: 19,
    badge: '3D TARAMA',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: 'scan',
    specs: ['0.02 mm Hassasiyet', 'Renk & Doku Desteği', 'Kablosuz Wi-Fi 6', 'Hafif 140g'],
    desc: 'Fiziksel parçaları saniyeler içinde dijital CAD modellerine dönüştürün. Perpa teknik atölyemizde de aktif kullandığımız yüksek hassasiyetli tarayıcı.'
  },

  // Filamentler & Sarflar
  {
    id: 'fl-1',
    category: 'filaments',
    name: 'DağTech Hyper PLA+ Pro Filament (1kg)',
    subtitle: '1.75mm Çap - 600 mm/s Yüksek Hız Formüllü',
    price: 469,
    oldPrice: 540,
    rating: 4.9,
    reviews: 142,
    badge: 'YERLİ STOK',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: 'disc',
    specs: ['±0.02mm Tolerans', 'Tıkanma Yapmaz', 'Yüksek Katman Yapışması', 'Saf Hammadde'],
    desc: 'Dağ Teknoloji özel üretimi yüksek hızlı yazıcılarla tam senkronize, bükülme ve ipliklenme yapmayan üstün kalite PLA+ filament.'
  },
  {
    id: 'fl-2',
    category: 'filaments',
    name: 'Sunlu PETG Dayanıklı Endüstriyel Filament',
    subtitle: '1.75mm 1kg - UV, Kimyasal ve Su Dirençli',
    price: 499,
    oldPrice: 580,
    rating: 4.8,
    reviews: 95,
    badge: 'DAYANIKLI',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: 'shield-check',
    specs: ['Yüksek Darbe Direnci', 'Gıda ile Uyumlu', 'Düşük Çekme Oranı', 'Suya Dayanıklı'],
    desc: 'Mekanik parçalar ve dış ortam uygulamaları için ideal darbe ve kimyasal direnç sağlayan yüksek kaliteli PETG makara.'
  },
  {
    id: 'fl-3',
    category: 'filaments',
    name: 'PA-CF Karbon Fiber Takviyeli Naylon',
    subtitle: '1.75mm 500g - Metal Sertliğinde Mühendislik Malzemesi',
    price: 1190,
    oldPrice: 1350,
    rating: 5.0,
    reviews: 31,
    badge: 'MÜHENDİSLİK',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: 'cpu',
    specs: ['150°C Isı Dayanımı', 'Hafif & Süper Rijit', 'Mekanik Aşınmaz', '%20 Karbon Oranı'],
    desc: 'İHA parçaları, otomotiv aparatları ve ağır sanayi prototipleri için alüminyuma alternatif süper sert karbon lifli filament.'
  },
  {
    id: 'fl-4',
    category: 'filaments',
    name: 'eSUN TPU 95A Esnek Filament (1kg)',
    subtitle: '1.75mm Esnek Kauçuk Benzeri Yapı',
    price: 689,
    oldPrice: 760,
    rating: 4.7,
    reviews: 44,
    badge: 'ESNEK KAUÇUK',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: 'repeat',
    specs: ['95A Shore Sertlik', '%400 Uzama Kapasitesi', 'Titreşim Emici', 'Aşınmaz'],
    desc: 'Conta, telefon kılıfı, robot tekerleği ve titreşim takozları üretimi için mükemmel elastikiyete sahip TPU filament.'
  },

  // Muadil & Orijinal Tonerler
  {
    id: 'tn-1',
    category: 'toners',
    name: 'HP W1106A (106A) Muadil Lazer Toner',
    subtitle: 'Yeni Nesil Akıllı Çipli - 1.000 Sayfa Net Baskı',
    price: 339,
    oldPrice: 390,
    rating: 4.9,
    reviews: 180,
    badge: 'EN ÇOK SATAN',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: 'file-text',
    specs: ['Çipli Tak-Çalıştır', 'Yoğun Siyah Formül', 'HP 107a / 107w / 135a Uyumlu', 'Birebir Değişim Garantisi'],
    desc: 'Perpa stoklarımızdan hemen teslim, drum korumalı ve orijinal kalitesinde koyu siyah çıktı garantili muadil toner.'
  },
  {
    id: 'tn-2',
    category: 'toners',
    name: 'Canon CRG-057 Yüksek Kapasiteli Toner',
    subtitle: '3.100 Sayfa Garantili Muadil Toner Kartuşu',
    price: 395,
    oldPrice: 470,
    rating: 4.8,
    reviews: 73,
    badge: 'YÜKSEK KAPASİTE',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    icon: 'layers',
    specs: ['3.100 Sayfa Baskı', 'LBP223dw / LBP226dw Uyumlu', 'Sıfır Atık Toz', 'Mükemmel Netlik'],
    desc: 'Ofis ve kurumsal iş yükleri için tasarlanmış yüksek sayfa kapasiteli ve lekesiz pürüzsüz baskı veren ekonomik çözüm.'
  },
  {
    id: 'tn-3',
    category: 'toners',
    name: 'Xerox Phaser 3020 / WorkCentre 3025 Toner',
    subtitle: '106R02773 Çipli Muadil Siyah Toner (1.500 Sayfa)',
    price: 320,
    oldPrice: 380,
    rating: 4.7,
    reviews: 88,
    badge: 'OFİS DOSTU',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: 'copy',
    specs: ['1.500 Sayfa', 'Yeni Versiyon Çip', 'Xerox 3020/3025 Uyumlu', 'Homojen Toz'],
    desc: 'Kompakt ofis yazıcıları için yüksek kontrastlı metin ve tablo baskıları sunan, drum dostu mikronize toner tozu.'
  },
  {
    id: 'tn-4',
    category: 'toners',
    name: 'Pantum PA-210EV Çipli Muadil Toner',
    subtitle: 'P2500 / M6500 Serisi Uyumlu 1.600 Sayfa',
    price: 410,
    oldPrice: 480,
    rating: 4.8,
    reviews: 51,
    badge: 'GARANTİLİ',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: 'archive',
    specs: ['Yeni Akıllı Çip', '1.600 Sayfa', 'Korumalı Ambalaj', 'Sıfır Çizgi'],
    desc: 'Pantum yazıcılar için takıldığında uyarı vermeyen sorunsuz akıllı çip donanımı ve net baskı sağlayan toner.'
  },

  // Yedek Parça & Nozzle
  {
    id: 'pt-1',
    category: 'parts',
    name: 'Hardened Steel Sertleştirilmiş Nozzle Seti',
    subtitle: '0.4mm & 0.6mm Karbon Fiber ve Glow Filament Dayanımlı',
    price: 349,
    oldPrice: 420,
    rating: 4.9,
    reviews: 67,
    badge: 'AŞINMAZ',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: 'tool',
    specs: ['550°C Isı Dayanımı', 'Mohs 7.8 Sertlik', 'CNC Hassas İşleme', 'M6 / Bambu Uyumlu'],
    desc: 'Aşındırıcı filament türlerinde pirinç nozzle gibi erimez ve genişlemez; pürüzsüz akışkanlık sunar.'
  },
  {
    id: 'pt-2',
    category: 'parts',
    name: 'Çift Taraflı Dokulu PEI Manyetik Yay Çeliği Tabla',
    subtitle: '235 x 235 mm - Ender / K1 / Neptune Uyumlu',
    price: 520,
    oldPrice: 610,
    rating: 4.9,
    reviews: 114,
    badge: 'MÜKEMMEL YAPIŞMA',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: 'box',
    specs: ['Tutkalsız Baskı', 'Bük ve Ayrıl Mekanizma', 'Çift Yüzey (Gold PEI)', 'Dayanıklı Yay Çeliği'],
    desc: 'Isındığında parçayı güçlü tutar, soğuduğunda tablayı hafif bükerek parçayı sıfır çizikle elinize alırsınız.'
  },
  {
    id: 'pt-3',
    category: 'parts',
    name: 'Bimetal Titanyum & Bakır All-Metal Boğaz (Heatbreak)',
    subtitle: 'Tıkanma ve Isı Kaçağına Karşı Üstün Termal Bariyer',
    price: 290,
    oldPrice: 350,
    rating: 4.8,
    reviews: 43,
    badge: 'HOTEND PRO',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    icon: 'flame',
    specs: ['300°C+ Yüksek Isı', 'Titanyum Alaşım', 'Ultra İnce Duvar', 'Isı İletim Ayrımı'],
    desc: 'Isının soğutucu bloğa kaçmasını engelleyerek filament şişmesini ve nozzle tıkanmasını kökten çözer.'
  }
];

// --- APP STATE ---
const state = {
  cart: JSON.parse(localStorage.getItem('dag_cart') || '[]'),
  activeCategory: 'all',
  searchQuery: '',
  calc: {
    material: 'pla',
    modelSize: 60, // simulated size factor
    infill: 20,
    layerHeight: 0.20,
    color: '#00f0ff',
    tech: 'fdm',
    fileName: 'ornek_disli_mekanizmasi.stl',
    fileSizeMb: 4.2
  }
};

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
  initThreeJsViewport();
  renderProducts();
  updateCartBadge();
  setupEventListeners();
  updateCalculatorUI();
  lucide.createIcons();
});

// ==========================================================================
// 1. THREE.JS 3D INTERACTIVE ENGINE
// ==========================================================================
let scene, camera, renderer, modelGroup, printHead;
let isWireframe = false;
let currentMaterialColor = 0x00f0ff;

function initThreeJsViewport() {
  const container = document.getElementById('canvas-3d-container');
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight || 450;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07090e, 0.035);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 5, 11);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // Lights
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

  // Build Plate Grid
  createBuildPlate();

  // Create 3D Model Group (Extruder / Mechanical Core)
  modelGroup = new THREE.Group();
  buildMechanicalPart(modelGroup);
  modelGroup.position.y = 1.2;
  scene.add(modelGroup);

  // Simulated 3D Printing Laser / Toolhead
  createPrintHead();

  // Mouse Interaction (Orbit / Drag)
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - prevMousePos.x;
    const deltaY = e.clientY - prevMousePos.y;

    modelGroup.rotation.y += deltaX * 0.008;
    modelGroup.rotation.x += deltaY * 0.008;

    // clamp X
    modelGroup.rotation.x = Math.max(-0.6, Math.min(0.6, modelGroup.rotation.x));

    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  // Touch Support
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  });

  window.addEventListener('touchend', () => { isDragging = false; });

  container.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevMousePos.x;
    const deltaY = e.touches[0].clientY - prevMousePos.y;

    modelGroup.rotation.y += deltaX * 0.008;
    modelGroup.rotation.x += deltaY * 0.008;

    prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  });

  // Window resize
  window.addEventListener('resize', () => {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight || 450;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Animation Loop
  let clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    if (!isDragging) {
      modelGroup.rotation.y += 0.006;
    }

    // Gentle float
    modelGroup.position.y = 1.2 + Math.sin(elapsedTime * 1.5) * 0.15;

    // Print head laser oscillation
    if (printHead) {
      printHead.position.x = Math.sin(elapsedTime * 2.5) * 1.8;
      printHead.position.z = Math.cos(elapsedTime * 1.8) * 1.8;
      printHead.position.y = 3.6 + Math.sin(elapsedTime * 3) * 0.2;
    }

    renderer.render(scene, camera);
  }
  animate();
}

function createBuildPlate() {
  const plateGeo = new THREE.BoxGeometry(7, 0.2, 7);
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x121826,
    roughness: 0.8,
    metalness: 0.2
  });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.y = -1.5;
  plate.receiveShadow = true;
  scene.add(plate);

  // Grid
  const gridHelper = new THREE.GridHelper(6.6, 22, 0x00f0ff, 0x1e293b);
  gridHelper.position.y = -1.39;
  scene.add(gridHelper);
}

function buildMechanicalPart(group) {
  // Clear any existing children
  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }

  const mat = new THREE.MeshStandardMaterial({
    color: currentMaterialColor,
    roughness: 0.25,
    metalness: 0.7,
    wireframe: isWireframe
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.9,
    wireframe: isWireframe
  });

  // Central Core Turbine / Gear
  const torusGeo = new THREE.TorusGeometry(1.6, 0.45, 16, 40);
  const torus = new THREE.Mesh(torusGeo, mat);
  torus.rotation.x = Math.PI / 2;
  group.add(torus);

  // Mechanical Teeth / Blades
  const teethCount = 8;
  for (let i = 0; i < teethCount; i++) {
    const angle = (i / teethCount) * Math.PI * 2;
    const toothGeo = new THREE.BoxGeometry(0.35, 0.7, 0.8);
    const tooth = new THREE.Mesh(toothGeo, mat);
    tooth.position.x = Math.cos(angle) * 1.8;
    tooth.position.z = Math.sin(angle) * 1.8;
    tooth.rotation.y = -angle;
    group.add(tooth);
  }

  // Inner Hex Core
  const cylinderGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.4, 6);
  const coreMesh = new THREE.Mesh(cylinderGeo, darkMat);
  group.add(coreMesh);

  // Precision Nozzle Pin
  const coneGeo = new THREE.ConeGeometry(0.5, 0.9, 16);
  const coneMesh = new THREE.Mesh(coneGeo, mat);
  coneMesh.position.y = -1.1;
  coneMesh.rotation.x = Math.PI;
  group.add(coneMesh);

  // Top Precision Collar
  const ringGeo = new THREE.TorusGeometry(0.6, 0.12, 12, 24);
  const ring = new THREE.Mesh(ringGeo, mat);
  ring.position.y = 0.8;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
}

function createPrintHead() {
  printHead = new THREE.Group();
  const nozzleTip = new THREE.ConeGeometry(0.18, 0.4, 8);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const tip = new THREE.Mesh(nozzleTip, tipMat);
  tip.rotation.x = Math.PI;

  const beamGeo = new THREE.CylinderGeometry(0.015, 0.05, 1.8, 8);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.7
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = -1.0;

  printHead.add(tip);
  printHead.add(beam);
  printHead.position.set(0, 3.5, 0);
  scene.add(printHead);
}

window.set3dColor = function(hexColor) {
  currentMaterialColor = parseInt(hexColor.replace('#', '0x'));
  buildMechanicalPart(modelGroup);
  showToast(`Filament rengi güncellendi: ${hexColor}`);
};

window.toggle3dWireframe = function() {
  isWireframe = !isWireframe;
  buildMechanicalPart(modelGroup);
  showToast(isWireframe ? 'Tel Kafes (Wireframe) Modu Açık' : 'Katı Yüzey Moduna Geçildi');
};

// ==========================================================================
// 2. 3D BASKI FİYAT & SÜRE HESAPLAYICI (SLICER ENGINE)
// ==========================================================================
function updateCalculatorUI() {
  const matKey = state.calc.material;
  const matInfo = MATERIAL_DATA[matKey] || MATERIAL_DATA.pla;

  const sizeFactor = state.calc.modelSize / 60; // relative base size
  const infillRatio = state.calc.infill / 100;
  const layerCoeff = 0.20 / state.calc.layerHeight; // thinner layers take longer

  // Simulated weight: shell weight + infill volume
  const baseVolumeCm3 = 35 * Math.pow(sizeFactor, 3);
  const shellVolume = baseVolumeCm3 * 0.35;
  const internalVolume = baseVolumeCm3 * 0.65 * infillRatio;
  const totalVolume = shellVolume + internalVolume;
  const totalWeightGrams = Math.round(totalVolume * matInfo.density);

  // Simulated print duration in hours
  const baseSpeedHours = (totalVolume * 0.09) * layerCoeff * matInfo.timeFactor;
  const hours = Math.floor(baseSpeedHours);
  const minutes = Math.round((baseSpeedHours - hours) * 60);

  // Price calculation
  const materialCost = totalWeightGrams * matInfo.pricePerGram;
  const machinePrepCost = 75; // Machine setup + slice prep fee
  const printHourlyRate = 22; // Machine running cost / hr
  const totalPrice = Math.round(materialCost + machinePrepCost + (baseSpeedHours * printHourlyRate));

  // Update DOM elements
  const weightEl = document.getElementById('calc-weight');
  const timeEl = document.getElementById('calc-time');
  const priceEl = document.getElementById('calc-price');
  const strengthEl = document.getElementById('calc-strength');
  const matNameEl = document.getElementById('calc-mat-name');

  if (weightEl) weightEl.innerText = `${totalWeightGrams} gr`;
  if (timeEl) timeEl.innerText = `${hours} sa ${minutes} dk`;
  if (priceEl) priceEl.innerText = `${totalPrice} ₺`;
  if (strengthEl) strengthEl.innerText = matInfo.strength;
  if (matNameEl) matNameEl.innerText = matInfo.name;
}

window.handleMaterialSelect = function(matKey) {
  state.calc.material = matKey;
  document.querySelectorAll('.mat-pill').forEach(btn => {
    btn.classList.toggle('border-cyan-400', btn.dataset.mat === matKey);
    btn.classList.toggle('bg-cyan-500/10', btn.dataset.mat === matKey);
  });
  updateCalculatorUI();
};

window.handleInfillChange = function(val) {
  state.calc.infill = parseInt(val);
  const label = document.getElementById('infill-value-display');
  if (label) label.innerText = `%${val}`;
  updateCalculatorUI();
};

window.handleLayerChange = function(val) {
  state.calc.layerHeight = parseFloat(val);
  updateCalculatorUI();
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

  // Simulate instant slicing analysis
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
      showToast(`${file.name} başarıyla analiz edildi. Fiyat hesaplandı!`, 'success');
      state.calc.fileName = file.name;
      state.calc.modelSize = Math.floor(Math.random() * 40) + 70;
      updateCalculatorUI();
    }
  }, 200);
};

// ==========================================================================
// 3. PRODUCT CATALOG RENDERING & FILTERING
// ==========================================================================
function renderProducts() {
  const container = document.getElementById('products-grid');
  if (!container) return;

  let filtered = PRODUCTS.filter(p => {
    const matchesCat = state.activeCategory === 'all' || p.category === state.activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                          p.subtitle.toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i data-lucide="package-search" class="w-16 h-16 mx-auto mb-4 text-slate-600"></i>
        <h4 class="text-xl font-bold text-white mb-2">Aradığınız Ürün Bulunamadı</h4>
        <p class="text-sm">Filtreleri sıfırlayabilir veya farklı bir arama terimi deneyebilirsiniz.</p>
        <button onclick="resetFilters()" class="mt-4 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700">Filtreleri Sıfırla</button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(p => `
    <div class="glass-panel rounded-2xl overflow-hidden flex flex-col justify-between group hover:-translate-y-1.5 transition-all duration-300">
      <!-- Product Header & Visual Representation -->
      <div class="p-6 relative bg-gradient-to-b from-white/[0.04] to-transparent">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full border ${p.badgeColor}">${p.badge}</span>
          <div class="flex items-center gap-1 text-amber-400 text-xs font-bold">
            <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
            <span>${p.rating}</span>
            <span class="text-slate-500 font-normal">(${p.reviews})</span>
          </div>
        </div>

        <!-- Real Product Image Display with Graceful Fallback -->
        <div class="w-full h-48 rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 flex items-center justify-center relative overflow-hidden group-hover:border-cyan-500/40 transition-all">
          <img 
            src="${p.image || p.remoteImage}" 
            alt="${p.name}" 
            class="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onerror="if(this.src!=='${p.remoteImage}' && '${p.remoteImage}'){this.src='${p.remoteImage}';}else{this.style.display='none';this.nextElementSibling.classList.remove('hidden');}"
          />
          <div class="hidden w-20 h-20 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-cyan-400">
            <i data-lucide="${p.icon}" class="w-10 h-10"></i>
          </div>
          <span class="absolute bottom-2 right-2 text-[9px] tracking-wider font-mono text-slate-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 uppercase">Perpa Stok</span>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 pt-0 flex-1 flex flex-col justify-between">
        <div>
          <span class="text-[11px] font-mono tracking-wider uppercase text-cyan-400/80 font-bold block mb-1">
            ${getCategoryName(p.category)}
          </span>
          <h3 class="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors mb-1 line-clamp-1">
            ${p.name}
          </h3>
          <p class="text-xs text-slate-400 line-clamp-2 mb-4">
            ${p.subtitle}
          </p>

          <!-- Key Features Pills -->
          <div class="flex flex-wrap gap-1.5 mb-6">
            ${p.specs.slice(0, 3).map(s => `
              <span class="text-[11px] bg-slate-800/80 border border-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                ${s}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Pricing & Action Row -->
        <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            ${p.oldPrice ? `<span class="text-xs text-slate-500 line-through block">${p.oldPrice.toLocaleString('tr-TR')} ₺</span>` : ''}
            <div class="text-xl font-extrabold text-white">
              ${p.price.toLocaleString('tr-TR')} <span class="text-xs text-cyan-400 font-normal">₺</span>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <button onclick="openProductModal('${p.id}')" title="Hızlı İncele" class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            <button onclick="addToCart('${p.id}')" class="px-3.5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
              <i data-lucide="shopping-bag" class="w-4 h-4"></i>
              <span>Ekle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  lucide.createIcons();
}

function getCategoryName(cat) {
  switch (cat) {
    case 'printers': return '3D Yazıcı & Tarayıcı';
    case 'filaments': return 'Filament & Sarf';
    case 'toners': return 'Muadil & Orijinal Toner';
    case 'parts': return 'Yedek Parça & Nozzle';
    default: return 'Teknoloji';
  }
}

window.filterCategory = function(cat) {
  state.activeCategory = cat;
  document.querySelectorAll('.cat-tab').forEach(tab => {
    const isActive = tab.dataset.category === cat;
    tab.classList.toggle('bg-cyan-500', isActive);
    tab.classList.toggle('text-slate-950', isActive);
    tab.classList.toggle('bg-slate-800/60', !isActive);
    tab.classList.toggle('text-slate-300', !isActive);
  });
  renderProducts();
};

window.handleProductSearch = function(query) {
  state.searchQuery = query;
  renderProducts();
};

window.resetFilters = function() {
  state.activeCategory = 'all';
  state.searchQuery = '';
  const searchInput = document.getElementById('product-search-input');
  if (searchInput) searchInput.value = '';
  filterCategory('all');
};

// ==========================================================================
// 4. SHOPPING CART ENGINE
// ==========================================================================
window.addToCart = function(productId, qty = 1) {
  const prod = PRODUCTS.find(p => p.id === productId);
  if (!prod) return;

  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    state.cart.push({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      subtitle: prod.subtitle,
      quantity: qty
    });
  }

  saveCart();
  updateCartBadge();
  renderCartDrawer();
  showToast(`${prod.name} sepete eklendi!`, 'success');
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
}

window.toggleCartDrawer = function(forceOpen) {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (!drawer || !backdrop) return;

  const isOpen = !drawer.classList.contains('translate-x-full');
  const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;

  if (shouldOpen) {
    renderCartDrawer();
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('hidden');
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');
  } else {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('opacity-0');
    setTimeout(() => {
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
    return `
      <div class="flex items-center justify-between p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
        <div class="flex-1 pr-3">
          <h4 class="text-sm font-semibold text-white line-clamp-1">${item.name}</h4>
          <span class="text-xs text-cyan-400 font-bold">${item.price.toLocaleString('tr-TR')} ₺</span>
        </div>
        
        <div class="flex items-center gap-2">
          <button onclick="changeCartQty('${item.id}', -1)" class="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-xs">-</button>
          <span class="text-xs font-bold text-white px-1.5">${item.quantity}</span>
          <button onclick="changeCartQty('${item.id}', 1)" class="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-xs">+</button>
          <button onclick="removeFromCart('${item.id}')" class="text-slate-500 hover:text-red-400 ml-2 p-1">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.innerText = `${subtotal.toLocaleString('tr-TR')} ₺`;
  if (totalEl) totalEl.innerText = `${subtotal.toLocaleString('tr-TR')} ₺`;

  lucide.createIcons();
}

window.changeCartQty = function(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;

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

window.processCheckout = function() {
  if (state.cart.length === 0) return;
  toggleCartDrawer(false);
  openModal('checkout-modal');
};

// ==========================================================================
// 5. MODAL SYSTEM
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

window.openProductModal = function(productId) {
  const p = PRODUCTS.find(item => item.id === productId);
  if (!p) return;

  const content = document.getElementById('product-modal-content');
  if (!content) return;

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Visual Column -->
      <div class="p-6 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col items-center justify-center text-center">
        <div class="w-full h-64 rounded-2xl bg-slate-900/60 p-4 flex items-center justify-center mb-4">
          <img 
            src="${p.image || p.remoteImage}" 
            alt="${p.name}" 
            class="max-h-full max-w-full object-contain filter drop-shadow-lg" 
            onerror="if(this.src!=='${p.remoteImage}' && '${p.remoteImage}'){this.src='${p.remoteImage}';}" 
          />
        </div>
        <span class="text-xs font-semibold px-3 py-1 rounded-full border ${p.badgeColor} mb-2">${p.badge}</span>
        <span class="text-xs text-slate-400 font-mono">Perpa Ticaret Merkezi B Blok No:825 Stok Teslim</span>
      </div>

      <!-- Details Column -->
      <div>
        <span class="text-xs font-mono uppercase text-cyan-400 font-bold">${getCategoryName(p.category)}</span>
        <h3 class="text-2xl font-extrabold text-white mt-1 mb-2">${p.name}</h3>
        <p class="text-sm text-slate-300 mb-4">${p.desc}</p>

        <div class="space-y-2 mb-6">
          <h5 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Teknik Özellikler:</h5>
          <div class="grid grid-cols-2 gap-2">
            ${p.specs.map(s => `
              <div class="text-xs bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 text-slate-200 flex items-center gap-1.5">
                <i data-lucide="check" class="w-3.5 h-3.5 text-cyan-400"></i>
                <span>${s}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="flex items-baseline gap-3 mb-6">
          <span class="text-3xl font-extrabold text-white">${p.price.toLocaleString('tr-TR')} ₺</span>
          ${p.oldPrice ? `<span class="text-sm text-slate-500 line-through">${p.oldPrice.toLocaleString('tr-TR')} ₺</span>` : ''}
          <span class="text-xs text-emerald-400 font-medium">KDV Dahil</span>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="addToCart('${p.id}'); closeModal('product-modal');" class="flex-1 py-3 px-6 rounded-xl glow-cyan-btn text-slate-950 font-bold text-sm flex items-center justify-center gap-2">
            <i data-lucide="shopping-bag" class="w-4 h-4"></i>
            <span>Hemen Sepete Ekle</span>
          </button>
          <a href="https://wa.me/905070201198?text=Merhaba,%20${encodeURIComponent(p.name)}%20hakkında%20bilgi%20almak%20istiyorum." target="_blank" class="p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors" title="WhatsApp ile Sor">
            <i data-lucide="message-circle" class="w-5 h-5"></i>
          </a>
        </div>
      </div>
    </div>
  `;

  openModal('product-modal');
  lucide.createIcons();
};

// ==========================================================================
// 6. TOAST NOTIFICATIONS & FORMS
// ==========================================================================
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
  lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
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

  // Quote / Contact Form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Talebiniz başarıyla alındı! Ekibimiz 15 dakika içinde dönüş yapacaktır.', 'success');
      contactForm.reset();
    });
  }

  // Checkout Form
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.cart = [];
      saveCart();
      updateCartBadge();
      closeModal('checkout-modal');
      showToast('Siparişiniz alındı! Perpa ekibimiz hazırlanıyor.', 'success');
    });
  }
}
