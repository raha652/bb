const usersStorageKey = 'userAccountsData'; 
let allUsers = [];
let currentUser = null;

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

async function loadUsers() {
  try {
    const stored = localStorage.getItem(usersStorageKey);
    allUsers = stored ? JSON.parse(stored) : [];
    return allUsers;
  } catch (error) {
    console.error('Error loading users from localStorage:', error);
    return [];
  }
}

async function saveUsers(users) {
  try {
    localStorage.setItem(usersStorageKey, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users to localStorage:', error);
    showToast('خطا در ذخیره کاربران', '❌');
  }
}

function previewPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview-img').src = e.target.result;
      document.getElementById('photo-preview').classList.remove('hidden');
      if (currentUser) {
        currentUser.tempPhoto = e.target.result;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function updateProfile(event) {
  event.preventDefault();

  const fullName = document.getElementById('profile-fullname').value.trim();
  const newPassword = document.getElementById('profile-password').value;

  if (!fullName) {
    showToast('نام کامل الزامی است', '⚠️');
    return;
  }

  if (!currentUser) {
    showToast('کاربر یافت نشد', '❌');
    return;
  }

  // آپدیت اطلاعات کاربر
  currentUser.fullName = fullName;
  if (newPassword) currentUser.password = newPassword;

  // اگر عکس جدید آپلود شده
  if (currentUser.tempPhoto) {
    currentUser.photo = currentUser.tempPhoto;
    delete currentUser.tempPhoto;
  }

  // === مهم‌ترین قسمت: آپدیت کامل در Google Sheets ===
  try {
    const gsData = {
      '__backendId': currentUser.__backendId,
      'نام کامل': currentUser.fullName,
      'نام کاربری': currentUser.username,
      'رمز عبور': currentUser.password || '',
      'نقش': currentUser.role || 'user',
      'عکس پروفایل': currentUser.photo || ''
    };

    const result = await callGoogleSheets('update', 'accounts', gsData);

    if (result.success) {
      console.log('عکس و اطلاعات با موفقیت در Google Sheets ذخیره شد');
    } else {
      console.warn('خطا از سرور:', result.error);
      showToast('تغییرات محلی ذخیره شد ولی در سرور نه', '⚠️');
    }
  } catch (err) {
    console.error('خطا در ارتباط با Google Sheets:', err);
    showToast('عکس فقط محلی ذخیره شد', '⚠️');
  }

  // آپدیت localStorage
  const userIndex = allUsers.findIndex(u => u.__backendId === currentUser.__backendId);
  if (userIndex !== -1) allUsers[userIndex] = currentUser;
  await saveUsers(allUsers);

  // آپدیت session برای نمایش فوری
  let session = JSON.parse(localStorage.getItem('session') || '{}');
  session.fullName = fullName;
  session.photo = currentUser.photo || '';
  localStorage.setItem('session', JSON.stringify(session));

  showToast('پروفایل با موفقیت به‌روزرسانی شد!', '✅');
  setTimeout(() => navigateTo('./index.html'), 1500);
}

function showToast(message, icon = '✅') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-message').textContent = message;
  document.getElementById('toast-icon').textContent = icon;
  toast.classList.add('active');
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

function navigateTo(path) {
  window.location.href = path;
}

function logout() {
  localStorage.removeItem('session');
  window.location.href = './login.html';
}

function updateDateTime() {
  const now = new Date();
  const weekday = now.toLocaleString('en-US', { weekday: 'short' });
  const month = now.toLocaleString('en-US', { month: 'short' });
  const day = now.getDate();
  const year = now.getFullYear();
  const formatted = `${weekday}, ${month}, ${day}, ${year}`;
  document.getElementById('current-date').textContent = formatted;
}

async function initProfilePage() {
  const sessionStr = localStorage.getItem('session');
  if (!sessionStr) {
    window.location.href = './login.html';
    return;
  }
  let session;
  try {
    session = JSON.parse(sessionStr);
  } catch (e) {
    localStorage.removeItem('session');
    window.location.href = './login.html';
    return;
  }
  if (!session.loggedIn) {
    localStorage.removeItem('session');
    window.location.href = './login.html';
    return;
  }
  await loadUsers();
  currentUser = allUsers.find(u => u.username === session.username);
  if (!currentUser) {
    localStorage.removeItem('session');
    window.location.href = './login.html';
    return;
  }
  document.getElementById('profile-fullname').value = currentUser.fullName || '';
  document.getElementById('profile-password').value = currentUser.password || '';
  const preview = document.getElementById('photo-preview');
  const previewImg = document.getElementById('preview-img');
if (currentUser.photo && currentUser.photo.trim() !== '') {
  previewImg.src = currentUser.photo;
  preview.classList.remove('hidden');
} else {
  preview.classList.add('hidden');
}
  updateDateTime();
  setInterval(updateDateTime, 60000);
}

document.addEventListener('DOMContentLoaded', initProfilePage);






