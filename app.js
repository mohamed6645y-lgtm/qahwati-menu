import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// إعدادات Firebase الخاصة بمشروعك qahwati-menu
const firebaseConfig = {
  apiKey: "AIzaSyAqzmVaomFwvsyEN4Y4l9kOVEpw3NWjb5Y",
  authDomain: "qahwati-menu.firebaseapp.com",
  projectId: "qahwati-menu",
  storageBucket: "qahwati-menu.firebasestorage.app",
  messagingSenderId: "198495934574",
  appId: "1:198495934574:web:20ab853b71f2410c282e7f",
  measurementId: "G-VRKM8C2K0G"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// إضافة واجهة الإدارة برمجياً (Toolbar + Login Modal)
document.body.insertAdjacentHTML('afterbegin', `
    <div id="admin-toolbar" class="admin-toolbar hidden">
        <span class="admin-status">🟢 وضع التعديل نشط (اضغط على الاسم أو السعر للتعديل)</span>
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

/**
 * دالة للتحكم في وضع التعديل
 * @param {boolean} isAdmin - حالة المستخدم (مسجل دخول أم لا)
 */
function toggleEditMode(isAdmin) {
    const fields = document.querySelectorAll('.item-name, .item-desc, .price');
    fields.forEach(field => {
        // لا يمكن التعديل إلا إذا كان isAdmin يساوي true
        field.contentEditable = isAdmin;
        
        if (isAdmin) {
            field.style.borderBottom = "1px dashed #d4a373";
            field.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
        } else {
            field.style.borderBottom = "none";
            field.style.backgroundColor = "transparent";
        }
    });

    // إظهار أو إخفاء شريط الإدارة وأزرار الإضافة بناءً على حالة الدخول
    const toolbar = document.getElementById('admin-toolbar');
    if (toolbar) toolbar.classList.toggle('hidden', !isAdmin);
    
    document.querySelectorAll('.add-item-btn').forEach(btn => {
        btn.classList.toggle('hidden', !isAdmin);
    });
}

/**
 * دالة لجلب البيانات من Firestore وتحديث المنيو
 */
async function syncMenuWithFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "menu"));
        
        // إذا كانت قاعدة البيانات تحتوي على بيانات، قم بتحديث الـ HTML
        if (!querySnapshot.empty) {
            querySnapshot.forEach((docSnap) => {
                const catId = docSnap.id;
                const items = docSnap.data().items;
                const container = document.querySelector(`#${catId} .items-container`);
                
                if (container && items && items.length > 0) {
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
        }
        
        // بعد جلب البيانات، تأكد من وضع التعديل بناءً على حالة المستخدم الحالي
        toggleEditMode(!!auth.currentUser);
        
    } catch (e) {
        console.error("Firebase Sync Error: ", e);
    }
}

// مراقبة حالة تسجيل الدخول (Firebase Auth Observer)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Logged in as Admin");
        toggleEditMode(true);
    } else {
        console.log("Logged out / Guest mode");
        toggleEditMode(false);
    }
    // في كل الحالات، نحمل البيانات من السيرفر
    syncMenuWithFirebase();
});

// وظيفة حفظ البيانات في Firestore
document.getElementById('save-btn').onclick = async () => {
    const btn = document.getElementById('save-btn');
    const originalText = btn.innerText;
    btn.innerText = "جاري الحفظ...";
    btn.disabled = true;

    const categories = ['coffee', 'hot-drinks', 'cold-drinks', 'desserts'];
    
    try {
        for (const cat of categories) {
            const section = document.getElementById(cat);
            if (!section) continue;

            const container = section.querySelector('.items-container');
            const cards = container.querySelectorAll('.menu-card');
            
            const items = Array.from(cards).map(card => ({
                name: card.querySelector('.item-name').innerText,
                desc: card.querySelector('.item-desc').innerText,
                price: card.querySelector('.price').innerText
            }));

            // حفظ كل قسم في وثيقة (Document) منفصلة داخل مجموعة (Collection) "menu"
            await setDoc(doc(db, "menu", cat), { items });
        }
        alert("تم حفظ التعديلات بنجاح! جميع الزوار سيرون الأسعار الجديدة الآن. ✅");
    } catch (e) { 
        console.error(e);
        alert("حدث خطأ أثناء الحفظ! تأكد من إعدادات الـ Rules في Firebase.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

// وظائف تسجيل الدخول
document.getElementById('login-btn').onclick = () => {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;

    if (!email || !pass) {
        alert("يرجى إدخال البريد الإلكتروني وكلمة المرور");
        return;
    }

    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            document.getElementById('login-modal').classList.add('hidden');
        })
        .catch((error) => {
            console.error(error);
            alert("فشل الدخول: تأكد من صحة البيانات أو تفعيل الـ Authentication");
        });
};

// تسجيل الخروج
document.getElementById('logout-btn').onclick = () => {
    signOut(auth).then(() => {
        alert("تم تسجيل الخروج");
        window.location.reload(); // إعادة تحميل للتأكد من قفل وضع التعديل
    });
};

// إظهار وإخفاء نافذة الدخول
document.getElementById('login-trigger').onclick = () => {
    document.getElementById('login-modal').classList.remove('hidden');
};

document.getElementById('close-modal').onclick = () => {
    document.getElementById('login-modal').classList.add('hidden');
};

// وظيفة إضافة صنف جديد (تظهر للمالك فقط)
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
        
        // تفعيل وضع التعديل فوراً للعنصر الجديد
        div.querySelectorAll('[contenteditable]').forEach(el => {
            el.style.borderBottom = "1px dashed #d4a373";
        });
    };
});
