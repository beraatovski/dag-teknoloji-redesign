/**
 * DAĞ TEKNOLOJİ - MODERN WEB PLATFORM & E-COMMERCE ENGINE
 * Real Products (132 Items), Multi-Filter, Stock System, Admin Panel, Membership System & 3D Engine
 */

// --- INITIAL STATE SETUP ---
const initialProducts = (function() {
  const saved = localStorage.getItem('dag_custom_products');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch(e) { console.error('Error parsing stored products', e); }
  }
  return window.DAG_PRODUCTS || [];
})();

// Default demo registered user
const defaultUsers = [
  {
    id: 'usr-1',
    name: 'Ahmet Yılmaz',
    email: 'ahmet@dag.com',
    password: '123',
    phone: '0555 123 4567',
    company: 'Yılmaz 3D Prototip & Tasarım',
    accountType: 'corporate',
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
    try { return JSON.parse(u); } catch(e) {}
  }
  return defaultUsers;
})();

const storedCurrentUser = (function() {
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
  isAdmin: sessionStorage.getItem('dag_is_admin') === 'true',
  
  // Catalog Filters
  filters: {
    category: 'all',
    brand: 'all',
    stockStatus: 'all', // 'all', 'in_stock', 'low_stock', 'out_of_stock'
    searchQuery: '',
    priceMax: 65000,
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
    stockOnly: 'all'
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

  initThreeJsViewport();
  renderUserNav();
  renderBrandFilters();
  renderProducts();
  updateCartBadge();
  setupEventListeners();
  updateCalculatorUI();
  updateAdminUI();
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
  buildMechanicalPart(modelGroup);
  modelGroup.position.y = 1.2;
  scene.add(modelGroup);

  createPrintHead();

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
    modelGroup.rotation.x = Math.max(-0.6, Math.min(0.6, modelGroup.rotation.x));
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

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

  window.addEventListener('resize', () => {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight || 450;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  let clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    if (!isDragging) {
      modelGroup.rotation.y += 0.006;
    }
    modelGroup.position.y = 1.2 + Math.sin(elapsedTime * 1.5) * 0.15;
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
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.8, metalness: 0.2 });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.y = -1.5;
  plate.receiveShadow = true;
  scene.add(plate);

  const gridHelper = new THREE.GridHelper(6.6, 22, 0x00f0ff, 0x1e293b);
  gridHelper.position.y = -1.39;
  scene.add(gridHelper);
}

function buildMechanicalPart(group) {
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

  const torusGeo = new THREE.TorusGeometry(1.6, 0.45, 16, 40);
  const torus = new THREE.Mesh(torusGeo, mat);
  torus.rotation.x = Math.PI / 2;
  group.add(torus);

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

  const cylinderGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.4, 6);
  const coreMesh = new THREE.Mesh(cylinderGeo, darkMat);
  group.add(coreMesh);

  const coneGeo = new THREE.ConeGeometry(0.5, 0.9, 16);
  const coneMesh = new THREE.Mesh(coneGeo, mat);
  coneMesh.position.y = -1.1;
  coneMesh.rotation.x = Math.PI;
  group.add(coneMesh);

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
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 });
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
// 3. MEMBERSHIP & USER AUTHENTICATION SYSTEM (ÜYELİK SİSTEMİ)
// ==========================================================================
function renderUserNav() {
  const container = document.getElementById('user-nav-container');
  const mobileContainer = document.getElementById('mobile-user-nav-container');
  if (!container) return;

  if (state.currentUser) {
    const u = state.currentUser;
    const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const wishlistCount = (u.wishlist || []).length;

    container.innerHTML = `
      <div class="relative">
        <button onclick="toggleUserDropdown()" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-xs text-white font-medium transition-all shadow-lg">
          <span class="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px]">${initials}</span>
          <span class="max-w-[100px] truncate hidden md:inline">${u.name}</span>
          <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400"></i>
        </button>

        <!-- Dropdown Menu -->
        <div id="user-dropdown-menu" class="hidden absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 space-y-1">
          <div class="px-3 py-2 border-b border-slate-800/80 mb-1">
            <div class="text-xs font-bold text-white truncate">${u.name}</div>
            <div class="text-[10px] text-cyan-400 font-mono truncate">${u.email}</div>
            ${u.company ? `<div class="text-[10px] text-slate-400 truncate mt-0.5">${u.company}</div>` : ''}
          </div>

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
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">${initials}</span>
            <div>
              <div class="text-xs font-bold text-white">${u.name}</div>
              <div class="text-[10px] text-cyan-400 font-mono">${u.email}</div>
            </div>
          </div>
          <button onclick="userLogout()" class="text-xs text-rose-400 hover:underline">Çıkış</button>
        </div>
      `;
    }
  } else {
    // Guest state
    container.innerHTML = `
      <button onclick="openAuthModal('login')" class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400 text-xs text-slate-300 hover:text-white transition-all font-semibold">
        <i data-lucide="user" class="w-4 h-4 text-cyan-400"></i>
        <span class="hidden md:inline">Giriş Yap / Üye Ol</span>
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

  lucide.createIcons();
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

  const found = state.users.find(u => (u.email.toLowerCase() === emailInput || u.phone === emailInput) && u.password === passwordInput);
  
  if (found) {
    state.currentUser = found;
    localStorage.setItem('dag_current_user', JSON.stringify(found));
    closeModal('auth-modal');
    renderUserNav();
    renderProducts();
    showToast(`Hoş geldiniz Sayın ${found.name}!`, 'success');
  } else {
    showToast('Hatalı e-posta veya şifre! (Demo için: ahmet@dag.com / 123)', 'error');
  }
};

window.handleDemoLogin = function() {
  const demoUser = state.users[0] || defaultUsers[0];
  state.currentUser = demoUser;
  localStorage.setItem('dag_current_user', JSON.stringify(demoUser));
  closeModal('auth-modal');
  renderUserNav();
  renderProducts();
  showToast(`Demo hesabı ile giriş yapıldı: ${demoUser.name}`, 'success');
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
    address: 'İstanbul, Türkiye',
    orders: [],
    wishlist: []
  };

  state.users.push(newUser);
  localStorage.setItem('dag_users', JSON.stringify(state.users));

  state.currentUser = newUser;
  localStorage.setItem('dag_current_user', JSON.stringify(newUser));

  closeModal('auth-modal');
  renderUserNav();
  renderProducts();
  showToast(`Aramıza hoş geldiniz Sayın ${name}! Hesabınız oluşturuldu.`, 'success');
};

window.userLogout = function() {
  state.currentUser = null;
  localStorage.removeItem('dag_current_user');
  renderUserNav();
  renderProducts();
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
  lucide.createIcons();
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
              <img src="${p.image || p.remoteImage}" class="w-12 h-12 object-contain rounded-lg bg-slate-900 p-1 border border-slate-700/60" onerror="this.src='assets/logo.svg';" />
              <div>
                <h4 class="text-xs font-bold text-white line-clamp-1">${p.name}</h4>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs font-bold text-cyan-400">${p.price.toLocaleString('tr-TR')} ₺</span>
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
  lucide.createIcons();
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
  let items = state.products.filter(p => {
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

  const brandsSet = new Set();
  state.products.forEach(p => {
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
  state.filters.priceMax = 65000;
  state.filters.sortBy = 'default';
  state.filters.displayLimit = 24;

  const searchInput = document.getElementById('product-search-input');
  if (searchInput) searchInput.value = '';
  const priceSlider = document.getElementById('price-filter-slider');
  if (priceSlider) priceSlider.value = 65000;
  const priceDisplay = document.getElementById('price-filter-display');
  if (priceDisplay) priceDisplay.innerText = 'Maks: 65.000 ₺';
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'default';
  const stockSelect = document.getElementById('stock-filter-select');
  if (stockSelect) stockSelect.value = 'all';

  renderBrandFilters();
  filterCategory('all');
};

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
    lucide.createIcons();
    return;
  }

  const wishlist = (state.currentUser && state.currentUser.wishlist) || [];

  container.innerHTML = visibleItems.map(p => {
    const stock = Number(p.stock !== undefined ? p.stock : 10);
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 5;
    const isFavorited = wishlist.includes(p.id);

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
      <div class="glass-panel rounded-2xl overflow-hidden flex flex-col justify-between group hover:-translate-y-1.5 transition-all duration-300 ${isOutOfStock ? 'opacity-85' : ''}">
        <!-- Product Header & Visual -->
        <div class="p-5 pb-3 relative bg-gradient-to-b from-white/[0.03] to-transparent">
          <div class="flex items-center justify-between mb-3">
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${p.badgeColor}">${p.badge}</span>
            ${stockBadgeHtml}
          </div>

          <!-- Real Product Image Display -->
          <div class="w-full h-44 rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 flex items-center justify-center relative overflow-hidden group-hover:border-cyan-500/40 transition-all">
            <img 
              src="${p.image || p.remoteImage}" 
              alt="${p.name}" 
              class="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'grayscale-[60%]' : ''}"
              loading="lazy"
              onerror="if(this.src!=='${p.remoteImage}' && '${p.remoteImage}'){this.src='${p.remoteImage}';}else{this.style.display='none';this.nextElementSibling.classList.remove('hidden');}"
            />
            <div class="hidden w-20 h-20 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-cyan-400">
              <i data-lucide="${p.icon || 'box'}" class="w-10 h-10"></i>
            </div>
            
            ${p.brand ? `<span class="absolute top-2 left-2 text-[9px] tracking-wider font-mono text-cyan-400/90 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">${p.brand}</span>` : ''}
            <span class="absolute bottom-2 right-2 text-[9px] tracking-wider font-mono text-slate-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 uppercase">Perpa Stok</span>
          </div>
        </div>

        <!-- Content -->
        <div class="p-5 pt-0 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-[11px] font-mono tracking-wider text-slate-400 mb-1">
              <span class="uppercase text-cyan-400 font-semibold">${getCategoryName(p.category)}</span>
              ${p.sku ? `<span class="text-slate-500 font-mono text-[10px]">${p.sku}</span>` : ''}
            </div>

            <h3 class="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors mb-1.5 line-clamp-2" title="${p.name}">
              ${p.name}
            </h3>
            
            <p class="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
              ${p.subtitle || p.desc}
            </p>

            <div class="flex flex-wrap gap-1 mb-5">
              ${(p.specs || []).slice(0, 2).map(s => `
                <span class="text-[10px] bg-slate-800/80 border border-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                  ${s}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Pricing & Stock Action Row -->
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              ${p.oldPrice ? `<span class="text-[11px] text-slate-500 line-through block">${p.oldPrice.toLocaleString('tr-TR')} ₺</span>` : ''}
              <div class="text-lg font-extrabold text-white">
                ${p.price.toLocaleString('tr-TR')} <span class="text-xs text-cyan-400 font-normal">₺</span>
              </div>
            </div>
            
            <div class="flex items-center gap-1.5">
              <!-- Wishlist Heart Button -->
              <button onclick="toggleWishlist('${p.id}')" title="${isFavorited ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}" class="wishlist-btn ${isFavorited ? 'active text-rose-500 bg-rose-500/15 border-rose-500/40' : 'text-slate-400 hover:text-rose-400 bg-slate-800/80'} p-2 rounded-xl transition-all border border-slate-700">
                <i data-lucide="heart" class="w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}"></i>
              </button>

              <button onclick="openProductModal('${p.id}')" title="Hızlı İncele" class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
              
              ${isOutOfStock ? `
                <button disabled class="px-3.5 py-2 rounded-xl bg-slate-800/80 text-slate-500 font-bold text-xs cursor-not-allowed border border-slate-700">
                  <span>Tükendi</span>
                </button>
              ` : `
                <button onclick="addToCart('${p.id}')" class="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
                  <i data-lucide="shopping-bag" class="w-4 h-4"></i>
                  <span>Ekle</span>
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
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
      price: prod.price,
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
    setTimeout(() => { backdrop.classList.add('hidden'); }, 300);
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
          ${item.image ? `<img src="${item.image}" class="w-10 h-10 object-contain rounded bg-slate-900 p-1 border border-slate-700/60" onerror="this.style.display='none'" />` : ''}
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

  lucide.createIcons();
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

window.processCheckout = function() {
  if (state.cart.length === 0) return;
  toggleCartDrawer(false);

  // Autofill user information if logged in
  if (state.currentUser) {
    const u = state.currentUser;
    const nameEl = document.getElementById('checkout-name');
    const phoneEl = document.getElementById('checkout-phone');
    const addrEl = document.getElementById('checkout-address');

    if (nameEl) nameEl.value = u.name;
    if (phoneEl) phoneEl.value = u.phone || '';
    if (addrEl) addrEl.value = u.address || '';
  }

  openModal('checkout-modal');
};

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

        <div class="flex items-baseline gap-3 mb-6">
          <span class="text-3xl font-extrabold text-white">${p.price.toLocaleString('tr-TR')} ₺</span>
          ${p.oldPrice ? `<span class="text-sm text-slate-500 line-through">${p.oldPrice.toLocaleString('tr-TR')} ₺</span>` : ''}
          <span class="text-xs text-emerald-400 font-medium">KDV Dahil</span>
        </div>

        <div class="flex items-center gap-2.5">
          ${isOutOfStock ? `
            <button disabled class="flex-1 py-3 px-6 rounded-xl bg-slate-800 text-slate-500 font-bold text-sm cursor-not-allowed">
              Ürün Şu Anda Tükendi
            </button>
          ` : `
            <button onclick="addToCart('${p.id}'); closeModal('product-modal');" class="flex-1 py-3 px-6 rounded-xl glow-cyan-btn text-slate-950 font-bold text-sm flex items-center justify-center gap-2">
              <i data-lucide="shopping-bag" class="w-4 h-4"></i>
              <span>Hemen Sepete Ekle</span>
            </button>
          `}
          
          <button onclick="toggleWishlist('${p.id}'); openProductModal('${p.id}');" class="p-3 rounded-xl border border-slate-800 ${isFavorited ? 'text-rose-500 bg-rose-500/15' : 'text-slate-400 hover:text-rose-400 bg-slate-800'}" title="Favorilere Ekle">
            <i data-lucide="heart" class="w-5 h-5 ${isFavorited ? 'fill-rose-500' : ''}"></i>
          </button>

          <a href="https://wa.me/905070201198?text=Merhaba,%20${encodeURIComponent(p.name)}%20(SKU:%20${p.sku || p.id})%20hakkında%20bilgi%20almak%20istiyorum." target="_blank" class="p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors" title="WhatsApp ile Sor">
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
// 7. ADMIN PANEL SYSTEM (YÖNETİCİ PANELİ - CRUD & STOK)
// ==========================================================================
window.openAdminLogin = function() {
  if (state.isAdmin) {
    openAdminDashboard();
  } else {
    openModal('admin-login-modal');
  }
};

window.handleAdminLogin = function(e) {
  e.preventDefault();
  const pinInput = document.getElementById('admin-pin-input');
  if (pinInput && pinInput.value === '1234') {
    state.isAdmin = true;
    sessionStorage.setItem('dag_is_admin', 'true');
    closeModal('admin-login-modal');
    pinInput.value = '';
    showToast('Yönetici girişi başarılı!', 'success');
    updateAdminUI();
    openAdminDashboard();
  } else {
    showToast('Hatalı PIN kodu! (Varsayılan PIN: 1234)', 'error');
  }
};

window.adminLogout = function() {
  state.isAdmin = false;
  sessionStorage.removeItem('dag_is_admin');
  closeModal('admin-panel-modal');
  updateAdminUI();
  showToast('Yönetici oturumu kapatıldı.');
};

function updateAdminUI() {
  const adminBadge = document.getElementById('admin-status-badge');
  if (adminBadge) {
    adminBadge.classList.toggle('hidden', !state.isAdmin);
  }
}

window.openAdminDashboard = function() {
  renderAdminStats();
  renderAdminProductsTable();
  renderAdminOrdersTable();
  openModal('admin-panel-modal');
};

function renderAdminStats() {
  const totalProductsEl = document.getElementById('admin-stat-total-products');
  const totalStockEl = document.getElementById('admin-stat-total-stock');
  const lowStockEl = document.getElementById('admin-stat-low-stock');
  const totalValueEl = document.getElementById('admin-stat-total-value');

  const totalProducts = state.products.length;
  const totalStock = state.products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const lowStockCount = state.products.filter(p => Number(p.stock || 0) <= 5).length;
  const totalValue = state.products.reduce((sum, p) => sum + (p.price * Number(p.stock || 0)), 0);

  if (totalProductsEl) totalProductsEl.innerText = totalProducts;
  if (totalStockEl) totalStockEl.innerText = `${totalStock.toLocaleString('tr-TR')} Adet`;
  if (lowStockEl) lowStockEl.innerText = `${lowStockCount} Ürün`;
  if (totalValueEl) totalValueEl.innerText = `${totalValue.toLocaleString('tr-TR')} ₺`;
}

function renderAdminProductsTable() {
  const tbody = document.getElementById('admin-products-tbody');
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
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = (p.sku || '').toLowerCase().includes(q);
      const matchBrand = (p.brand || '').toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchBrand) return false;
    }
    return true;
  });

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500">Aramaya uygun ürün bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.slice(0, 100).map((p, idx) => {
    const stock = Number(p.stock !== undefined ? p.stock : 10);
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
        
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img src="${p.image || p.remoteImage}" class="w-10 h-10 object-contain rounded-lg bg-slate-900 border border-slate-800 p-1 flex-shrink-0" onerror="this.src='assets/logo.svg';" />
            <div>
              <div class="text-xs font-bold text-white line-clamp-1 max-w-[220px]" title="${p.name}">${p.name}</div>
              <div class="text-[10px] text-slate-500 font-mono">${p.sku || p.id} • ${p.brand || 'Dağ Tech'}</div>
            </div>
          </div>
        </td>

        <td class="py-3 px-4 text-xs text-slate-300 font-mono">${getCategoryName(p.category)}</td>
        
        <td class="py-3 px-4 text-xs font-bold text-cyan-400 font-mono">${p.price.toLocaleString('tr-TR')} ₺</td>
        
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

  lucide.createIcons();
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

  document.getElementById('product-form-title').innerText = 'Ürünü Düzenle';
  document.getElementById('edit-product-id').value = p.id;
  document.getElementById('form-prod-name').value = p.name;
  document.getElementById('form-prod-category').value = p.category;
  document.getElementById('form-prod-brand').value = p.brand || '';
  document.getElementById('form-prod-price').value = p.price;
  document.getElementById('form-prod-old-price').value = p.oldPrice || '';
  document.getElementById('form-prod-stock').value = p.stock !== undefined ? p.stock : 10;
  document.getElementById('form-prod-image').value = p.image || p.remoteImage || '';
  document.getElementById('form-prod-desc').value = p.desc || '';
  document.getElementById('form-prod-specs').value = (p.specs || []).join(', ');

  openModal('edit-product-modal');
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
};

window.resetToDefaultProducts = function() {
  if (confirm('Tüm ürünleri ve stokları orijinal fabrika ayarlarına (132 ürün) sıfırlamak istediğinize emin misiniz?')) {
    localStorage.removeItem('dag_custom_products');
    state.products = window.DAG_PRODUCTS ? JSON.parse(JSON.stringify(window.DAG_PRODUCTS)) : [];
    saveProductsState();
    renderBrandFilters();
    renderAdminStats();
    renderAdminProductsTable();
    renderProducts();
    showToast('Katalog orijinal ayarlara sıfırlandı!', 'success');
  }
};

function saveProductsState() {
  localStorage.setItem('dag_custom_products', JSON.stringify(state.products));
}

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
  lucide.createIcons();

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

  // Checkout Form - Real Stock Deduction & Order Record
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const nameInput = document.getElementById('checkout-name');
      const customerName = (nameInput && nameInput.value.trim()) || (state.currentUser ? state.currentUser.name : 'Müşteri');

      let totalAmount = 0;
      const itemsSummaryList = [];

      state.cart.forEach(cartItem => {
        const prod = state.products.find(p => p.id === cartItem.id);
        if (prod) {
          prod.stock = Math.max(0, (prod.stock || 0) - cartItem.quantity);
          totalAmount += cartItem.price * cartItem.quantity;
          itemsSummaryList.push(`${cartItem.quantity}x ${cartItem.name}`);
        }
      });

      const newOrder = {
        id: Math.floor(10000 + Math.random() * 90000),
        customer: customerName,
        itemsCount: state.cart.reduce((s, i) => s + i.quantity, 0),
        itemsSummary: itemsSummaryList.slice(0, 2).join(', '),
        total: totalAmount,
        status: 'Sipariş Alındı',
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

      state.cart = [];
      saveCart();
      updateCartBadge();
      closeModal('checkout-modal');

      renderProducts();
      renderAdminStats();
      renderAdminProductsTable();

      showToast(`Tebrikler ${customerName}! Siparişiniz alındı ve stoktan ayrıldı.`, 'success');
    });
  }
}
