async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

async function bootstrap() {
  try {
    const session = await api('/api/admin/session');
    if (session.authenticated) {
      window.location.replace('/admin/');
      return;
    }
  } catch {
    // Stay on login page.
  }

  const form = document.getElementById('admin-login-form');
  const alert = document.getElementById('login-alert');
  const submit = document.getElementById('login-submit');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alert.classList.add('d-none');
    submit.disabled = true;
    submit.textContent = 'Signing In...';

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    try {
      await api('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      window.location.replace('/admin/');
    } catch (error) {
      alert.textContent = error instanceof Error ? error.message : 'Unable to sign in.';
      alert.classList.remove('d-none');
      submit.disabled = false;
      submit.textContent = 'Sign In';
    }
  });
}

bootstrap();
