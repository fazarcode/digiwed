"""Backend regression + feature tests for Digital Invitation Platform.

Covers new features:
- WhatsApp message template (GET/PUT/DELETE)
- Custom domain PATCH on invitation
- Event moments: public GET/POST, listing, delete, download-all zip, QR
- Admin packages CRUD + activate
- Regression: session, invitations list, guests list

Auth is NextAuth (JWT cookie via credentials provider). CSRF fetched first,
then POST /api/auth/callback/credentials with x-www-form-urlencoded.
"""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://workspace-migration-1.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin@12345"
USER_EMAIL = "user@example.com"
USER_PASSWORD = "Test@1234"


def _login(email, password):
    s = requests.Session()
    csrf = s.get(f"{BASE_URL}/api/auth/csrf", timeout=15).json()["csrfToken"]
    r = s.post(
        f"{BASE_URL}/api/auth/callback/credentials",
        data={"csrfToken": csrf, "email": email, "password": password, "redirect": "false", "json": "true"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        allow_redirects=False,
        timeout=20,
    )
    assert r.status_code in (200, 302), f"Login failed: {r.status_code} {r.text[:200]}"
    sess = s.get(f"{BASE_URL}/api/auth/session", timeout=15).json()
    assert sess.get("user", {}).get("email") == email, f"Session mismatch: {sess}"
    return s, sess


@pytest.fixture(scope="session")
def user_client():
    s, sess = _login(USER_EMAIL, USER_PASSWORD)
    s.user = sess["user"]
    return s


@pytest.fixture(scope="session")
def admin_client():
    s, sess = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    s.user = sess["user"]
    return s


# ---------- Regression: auth/session ----------
class TestAuthRegression:
    def test_user_session(self, user_client):
        r = user_client.get(f"{BASE_URL}/api/auth/session")
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "USER"

    def test_admin_session(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/auth/session")
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "ADMIN"


# ---------- Message Template ----------
class TestMessageTemplate:
    def test_get_default(self, user_client):
        r = user_client.get(f"{BASE_URL}/api/message-template")
        assert r.status_code == 200
        d = r.json()
        assert "template" in d and "defaultTemplate" in d and "isCustom" in d
        assert "{guest_name}" in d["defaultTemplate"]

    def test_put_and_persist(self, user_client):
        custom = "Hi {guest_name} - test-template"
        r = user_client.put(f"{BASE_URL}/api/message-template", json={"template": custom})
        assert r.status_code == 200
        g = user_client.get(f"{BASE_URL}/api/message-template").json()
        assert g["template"] == custom
        assert g["isCustom"] is True

    def test_delete_resets(self, user_client):
        r = user_client.delete(f"{BASE_URL}/api/message-template")
        assert r.status_code == 200
        g = user_client.get(f"{BASE_URL}/api/message-template").json()
        assert g["isCustom"] is False
        assert "{guest_name}" in g["template"]

    def test_unauth(self):
        r = requests.get(f"{BASE_URL}/api/message-template")
        assert r.status_code == 401


# ---------- Invitations regression + custom domain PATCH ----------
def _db_query(sql):
    import subprocess
    p = subprocess.run(
        ["mysql", "--socket=/app/data/mysql-run/mysqld.sock", "-uroot", "-proot",
         "-B", "-N", "digiwed", "-e", sql],
        capture_output=True, text=True, timeout=15,
    )
    return [line.split("\t") for line in p.stdout.strip().splitlines() if line]


@pytest.fixture(scope="session")
def alice_bob_invitation(user_client):
    # Look up in DB (there's no GET /api/invitations endpoint)
    rows = _db_query(
        "SELECT id, slug, brideName, groomName FROM Invitation "
        "WHERE brideName='Alice' ORDER BY createdAt DESC LIMIT 1;"
    )
    if not rows:
        # Create via API using an active template and Premium package
        tpl = _db_query("SELECT id FROM Template WHERE enabled=1 LIMIT 1;")
        pkg = _db_query("SELECT id FROM Package WHERE name='Premium' LIMIT 1;")
        assert tpl and pkg, "Missing template or Premium package in DB"
        r = user_client.post(
            f"{BASE_URL}/api/invitations",
            json={
                "templateId": tpl[0][0],
                "brideName": "Alice",
                "groomName": "Bob",
                "packageId": pkg[0][0],
            },
        )
        assert r.status_code == 200, f"create failed: {r.status_code} {r.text[:300]}"
        inv = r.json()["invitation"]
        return {"id": inv["id"], "slug": inv["slug"], "brideName": "Alice", "groomName": "Bob"}
    return {"id": rows[0][0], "slug": rows[0][1], "brideName": rows[0][2], "groomName": rows[0][3]}


class TestInvitationsRegression:
    def test_public_invite_page(self, alice_bob_invitation):
        slug = alice_bob_invitation["slug"]
        r = requests.get(f"{BASE_URL}/invite/{slug}")
        assert r.status_code == 200


class TestCustomDomain:
    def test_patch_custom_domain(self, user_client, alice_bob_invitation):
        inv_id = alice_bob_invitation["id"]
        r = user_client.patch(
            f"{BASE_URL}/api/invitations/{inv_id}",
            json={"customDomain": "my-wedding.com"},
        )
        assert r.status_code == 200, r.text[:300]
        j = r.json()
        # Response may wrap in {invitation:{}} or return directly
        payload = j.get("invitation", j)
        assert payload.get("customDomain") == "my-wedding.com"

    def test_patch_subdomain(self, user_client, alice_bob_invitation):
        inv_id = alice_bob_invitation["id"]
        r = user_client.patch(
            f"{BASE_URL}/api/invitations/{inv_id}",
            json={"subdomain": "alicebob", "customDomain": None},
        )
        assert r.status_code == 200, r.text[:300]


# ---------- Event Moments ----------
class TestMoments:
    def test_download_all_empty_returns_404(self, user_client, alice_bob_invitation):
        # Ensure no moments first via listing
        inv_id = alice_bob_invitation["id"]
        lst = user_client.get(f"{BASE_URL}/api/invitations/{inv_id}/moments")
        assert lst.status_code == 200
        moments = lst.json()
        moments = moments if isinstance(moments, list) else moments.get("moments", moments.get("items", []))
        for m in moments:
            user_client.delete(f"{BASE_URL}/api/invitations/{inv_id}/moments/{m['id']}")
        r = user_client.get(f"{BASE_URL}/api/invitations/{inv_id}/moments/download-all")
        assert r.status_code == 404

    def test_public_upload_no_auth(self, alice_bob_invitation):
        slug = alice_bob_invitation["slug"]
        r = requests.get(f"{BASE_URL}/api/moments/{slug}")
        assert r.status_code == 200

        # Upload a small image (fake PNG bytes)
        png = (b"\x89PNG\r\n\x1a\n" + b"\x00" * 32)
        files = {"files": ("test.png", io.BytesIO(png), "image/png")}
        data = {"senderName": "Tester", "message": "Great event"}
        up = requests.post(f"{BASE_URL}/api/moments/{slug}", files=files, data=data)
        assert up.status_code in (200, 201), f"{up.status_code}: {up.text[:300]}"

    def test_list_and_download_all_zip(self, user_client, alice_bob_invitation):
        inv_id = alice_bob_invitation["id"]
        lst = user_client.get(f"{BASE_URL}/api/invitations/{inv_id}/moments")
        assert lst.status_code == 200
        moments = lst.json()
        moments = moments if isinstance(moments, list) else moments.get("moments", moments.get("items", []))
        assert len(moments) >= 1, "expected at least 1 uploaded moment"
        r = user_client.get(f"{BASE_URL}/api/invitations/{inv_id}/moments/download-all")
        assert r.status_code == 200
        assert "zip" in r.headers.get("content-type", "").lower()
        assert r.content[:2] == b"PK", "not a zip"

    def test_moments_qr_png(self, user_client, alice_bob_invitation):
        inv_id = alice_bob_invitation["id"]
        r = user_client.get(f"{BASE_URL}/api/invitations/{inv_id}/moments-qr")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")


# ---------- Admin Packages ----------
class TestAdminPackages:
    def test_list_packages(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/packages")
        assert r.status_code == 200
        data = r.json()
        pkgs = data if isinstance(data, list) else data.get("packages", data.get("items", []))
        names = [p.get("name") for p in pkgs]
        for expected in ["Basic", "Professional", "Premium"]:
            assert expected in names, f"missing {expected} in {names}"

    def test_user_facing_packages_endpoint(self, user_client):
        r = user_client.get(f"{BASE_URL}/api/packages")
        assert r.status_code == 200

    def test_create_toggle_delete(self, admin_client):
        payload = {
            "name": "TEST_Starter",
            "sortOrder": 99,
            "isActive": True,
            "features": {"GUEST": True, "DASHBOARD": True},
        }
        r = admin_client.post(f"{BASE_URL}/api/admin/packages", json=payload)
        assert r.status_code in (200, 201), r.text[:300]
        created = r.json()
        pkg = created.get("package", created)
        pid = pkg["id"]

        # Toggle isActive (endpoint uses PUT)
        r2 = admin_client.put(f"{BASE_URL}/api/admin/packages/{pid}", json={"isActive": False})
        assert r2.status_code == 200, r2.text[:200]

        # Delete cleanup
        r3 = admin_client.delete(f"{BASE_URL}/api/admin/packages/{pid}")
        assert r3.status_code in (200, 204)


# ---------- Guest regression ----------
class TestGuestsRegression:
    def test_list_guests(self, user_client, alice_bob_invitation):
        inv_id = alice_bob_invitation["id"]
        r = user_client.get(f"{BASE_URL}/api/invitations/{inv_id}/guests")
        assert r.status_code == 200
