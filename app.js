import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// إعدادات مشروعك qahwati-menu
const firebaseConfig = {
  apiKey: "AIzaSyAqzmVaomFwvsyEN4Y4l9kOVEpw3NWjb5Y",
  authDomain: "qahwati-menu.firebaseapp.com",
  projectId: "qahwati-menu",
  storageBucket: "qahwati-menu.firebasestorage.app",
  messagingSenderId: "198495934574",
  appId: "1:198495934574:web:20ab853b71f2410c282e7f",
  measurementId: "G-VRKM8C2K0G"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// إضافة واجهة الإدارة برمجياً
document.body.insertAdjacentHTML('afterbegin', `
    <div id="admin-toolbar" class="admin-toolbar hidden">
        <span class="admin-status">● وضع التعديل نشط (اضغط على أي نص لتغييره)</span>
        <div class="admin-btns">
            <button id="save-btn" class="btn-primary">حفظ جميع التعديلات</button>
            <button id="logout-btn" class="btn-secondary">تسجيل خروج</button>
        </div>
    </div>
    <button id="login-trigger" style="position:fixed; bottom:10px; right:10px; opacity:0.1; background:none; border:none; color:white; cursor:pointer; z-index:999;">Admin</button>
    <div id="login-modal" class="modal hidden">
        <div class="modal-content">
            <h3>تسجيل دخول المالك</h3>
            <input type="email" id="admin-email" placeholder="البريد الإلكتروني">
            <input type="password" id="admin-pass" placeholder="كلمة المرور">
            <button id="login-btn" class="btn-primary">دخول</button>
            <button id="close-modal" style="background:none; border:none; color:#b0a090; margin-top:10px; cursor:pointer;">إلغاء</button>
        </div>
    </div>
`);

// دالة تفعيل التعديل على العناصر
function toggleEditMode(isAdmin) {
    const fields = document.querySelectorAll('.item-name, .item-desc, .price');
    fields.forEach(field => {
        field.contentEditable = isAdmin;
        if (isAdmin) {
            field.style.borderBottom = "1px dashed #d4a373";
            field.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
        } else {
            field.style.borderBottom = "none";
            field.style.backgroundColor = "transparent";
        }
    });
    document.getElementById('admin-toolbar').classList.toggle('hidden', !isAdmin);
    document.querySelectorAll('.add-item-btn').forEach(btn => btn.classList.toggle('hidden', !isAdmin));
}

// تحميل البيانات من السيرفر
async function loadMenu() {
    try {
        const querySnapshot = await getDocs(collection(db, "menu"));
        if (querySnapshot.empty) return;

        querySnapshot.forEach((docSnap) => {
            const catId = docSnap.id;
            const items = docSnap.data().items;
            const container = document.querySelector(`#${catId} .items-container`);
            
            if (container && items.length > 0) {
                container.innerHTML = items.map(item => `
                    <div class="menu-card">
                        <div class="card-info">
                            <h3 class="item-name">${item.name}</h3>
                            <p class="item-desc">${item.desc}</p>
                        </div>
                        <div class="card-price">
                            <span class="price">${item.price}</span>
                            <span class="currency">سعر</span>
                        </div>
                    </div>
                `).join('');
            }
        });
        if (auth.currentUser) toggleEditMode(true);
    } catch (e) { console.error("Error loading menu:", e); }
}

// مراقبة الدخول والخروج
onAuthStateChanged(auth, (user) => {
    toggleEditMode(!!user);
    loadMenu();
});

// حفظ البيانات
document.getElementById('save-btn').onclick = async () => {
    const btn = document.getElementById('save-btn');
    btn.innerText = "جاري الحفظ...";
    const categories = ['coffee', 'hot-drinks', 'cold-drinks', 'desserts'];
    
    try {
        for (const cat of categories) {
            const container = document.querySelector(`#${cat} .items-container`);
            const cards = container.querySelectorAll('.menu-card');
            const items = Array.from(cards).map(card => ({
                name: card.querySelector('.item-name').innerText,
                desc: card.querySelector('.item-desc').innerText,
                price: card.querySelector('.price').innerText
            }));
            await setDoc(doc(db, "menu", cat), { items });
        }
        alert("تم حفظ التعديلات بنجاح ✅");
    } catch (e) { alert("حدث خطأ أثناء الحفظ!"); }
    btn.innerText = "حفظ جميع التعديلات";
};

// الدخول والخروج
document.getElementById('login-btn').onclick = () => {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    signInWithEmailAndPassword(auth, email, pass).then(() => {
        document.getElementById('login-modal').classList.add('hidden');
    }).catch(() => alert("بيانات الدخول غير صحيحة"));
};

document.getElementById('logout-btn').onclick = () => signOut(auth);
document.getElementById('login-trigger').onclick = () => document.getElementById('login-modal').classList.remove('hidden');
document.getElementById('close-modal').onclick = () => document.getElementById('login-modal').classList.add('hidden');

// إضافة صنف جديد
document.querySelectorAll('.add-item-btn').forEach(btn => {
    btn.onclick = (e) => {
        const container = e.target.closest('section').querySelector('.items-container');
        const div = document.createElement('div');
        div.className = 'menu-card';
        div.innerHTML = `
            <div class="card-info">
                <h3 class="item-name" contenteditable="true">اسم صنف جديد</h3>
                <p class="item-desc" contenteditable="true">وصف الصنف الجديد هنا</p>
            </div>
            <div class="card-price">
                <span class="price" contenteditable="true">00</span>
                <span class="currency">سعر</span>
            </div>
        `;
        container.appendChild(div);
    };
});