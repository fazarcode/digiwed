"""Feature 1: Admin Template Code Editor Backend Tests

Tests for digiwed-invitation app (Next.js 15 App Router + Prisma + MariaDB).
Tests admin-only template file editor endpoints with path traversal protection.

AUTH: NextAuth v5 (Credentials)
- Admin: admin@example.com / Admin@12345
- Template: slug 'elegant-brown', contains index.html + manifest.json

ENDPOINTS TESTED:
1. GET /api/admin/templates/{id}/files - List files
2. GET /api/admin/templates/{id}/file?path=... - Read file
3. PUT /api/admin/templates/{id}/file - Write file
4. POST /api/admin/templates/{id}/preview - Live preview
5. GET /api/admin/templates/{id}/render - Backward compat
"""
import os
import subprocess
import requests
import pytest

# Use the app's external URL from .env
BASE_URL = os.environ.get("NEXT_PUBLIC_BASE_URL", "https://digiwed-editor-suite.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin@12345"


def _login(email, password):
    """Authenticate via NextAuth v5 credentials flow and return session."""
    s = requests.Session()
    # Get CSRF token
    csrf_resp = s.get(f"{BASE_URL}/api/auth/csrf", timeout=15)
    assert csrf_resp.status_code == 200, f"CSRF fetch failed: {csrf_resp.status_code}"
    csrf = csrf_resp.json()["csrfToken"]
    
    # Sign in via credentials callback
    r = s.post(
        f"{BASE_URL}/api/auth/callback/credentials",
        data={
            "csrfToken": csrf,
            "email": email,
            "password": password,
            "redirect": "false",
            "json": "true"
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        allow_redirects=False,
        timeout=20,
    )
    assert r.status_code in (200, 302), f"Login failed: {r.status_code} {r.text[:300]}"
    
    # Verify session
    sess_resp = s.get(f"{BASE_URL}/api/auth/session", timeout=15)
    sess = sess_resp.json()
    assert sess.get("user", {}).get("email") == email, f"Session mismatch: {sess}"
    return s, sess


def _get_template_id():
    """Get the ID of the seeded 'elegant-brown' template using Prisma."""
    p = subprocess.run(
        ["node", "/app/tests/get_template_id.js"],
        capture_output=True, text=True, timeout=15, cwd="/app"
    )
    if p.returncode != 0:
        raise RuntimeError(f"Failed to get template ID: {p.stderr}")
    template_id = p.stdout.strip()
    if not template_id:
        raise RuntimeError("Template 'elegant-brown' not found in database")
    return template_id


@pytest.fixture(scope="module")
def admin_client():
    """Admin authenticated session."""
    s, sess = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    s.user = sess["user"]
    return s


@pytest.fixture(scope="module")
def template_id():
    """Get the ID of the seeded 'elegant-brown' template."""
    return _get_template_id()


@pytest.fixture(scope="module")
def original_index_html(admin_client, template_id):
    """Fetch and store original index.html content for restoration."""
    r = admin_client.get(f"{BASE_URL}/api/admin/templates/{template_id}/file?path=index.html")
    assert r.status_code == 200, f"Failed to fetch original index.html: {r.status_code}"
    return r.json()["content"]


class TestAdminTemplateFilesEndpoint:
    """Test GET /api/admin/templates/{id}/files"""
    
    def test_anonymous_returns_403(self, template_id):
        """Anonymous request should return 403 Forbidden."""
        r = requests.get(f"{BASE_URL}/api/admin/templates/{template_id}/files")
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text[:200]}"
        print("✅ Anonymous GET /files => 403")
    
    def test_admin_lists_files(self, admin_client, template_id):
        """Admin should get list of files with editable flags."""
        r = admin_client.get(f"{BASE_URL}/api/admin/templates/{template_id}/files")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"
        
        data = r.json()
        assert "files" in data, f"Response missing 'files' key: {data}"
        files = data["files"]
        
        # Should contain index.html and manifest.json
        file_paths = [f["path"] for f in files]
        assert "index.html" in file_paths, f"index.html not in files: {file_paths}"
        assert "manifest.json" in file_paths, f"manifest.json not in files: {file_paths}"
        
        # Check editable flags
        for f in files:
            if f["path"] in ["index.html", "manifest.json"]:
                assert f["editable"] is True, f"{f['path']} should be editable"
        
        print(f"✅ Admin GET /files => 200, found {len(files)} files: {file_paths}")


class TestAdminTemplateFileReadEndpoint:
    """Test GET /api/admin/templates/{id}/file?path=..."""
    
    def test_anonymous_returns_403(self, template_id):
        """Anonymous request should return 403."""
        r = requests.get(f"{BASE_URL}/api/admin/templates/{template_id}/file?path=index.html")
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text[:200]}"
        print("✅ Anonymous GET /file?path=index.html => 403")
    
    def test_admin_reads_index_html(self, admin_client, template_id):
        """Admin should read index.html content."""
        r = admin_client.get(f"{BASE_URL}/api/admin/templates/{template_id}/file?path=index.html")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"
        
        data = r.json()
        assert "content" in data, f"Response missing 'content': {data}"
        assert len(data["content"]) > 0, "index.html content is empty"
        assert "<!DOCTYPE html>" in data["content"] or "<html" in data["content"], "Not valid HTML"
        
        print(f"✅ Admin GET /file?path=index.html => 200, content length: {len(data['content'])}")
    
    def test_admin_reads_manifest_json(self, admin_client, template_id):
        """Admin should read manifest.json content."""
        r = admin_client.get(f"{BASE_URL}/api/admin/templates/{template_id}/file?path=manifest.json")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"
        
        data = r.json()
        assert "content" in data, f"Response missing 'content': {data}"
        assert len(data["content"]) > 0, "manifest.json content is empty"
        
        print(f"✅ Admin GET /file?path=manifest.json => 200, content length: {len(data['content'])}")
    
    def test_path_traversal_parent_directory(self, admin_client, template_id):
        """Path traversal with ../ should return 400."""
        paths = [
            "../../auth.js",
            "../../../etc/passwd",
            "..%2F..%2Fauth.js",
            "../package.json",
            "../../app/api/auth.js"
        ]
        
        for path in paths:
            r = admin_client.get(f"{BASE_URL}/api/admin/templates/{template_id}/file?path={path}")
            assert r.status_code == 400, f"Path traversal '{path}' should return 400, got {r.status_code}: {r.text[:200]}"
            
            # Verify it doesn't return actual file content
            if r.status_code == 200:
                data = r.json()
                assert "content" not in data or "Invalid path" in str(data), f"Path traversal succeeded for {path}"
        
        print(f"✅ Path traversal attacks blocked (tested {len(paths)} variants)")


class TestAdminTemplateFileWriteEndpoint:
    """Test PUT /api/admin/templates/{id}/file"""
    
    def test_anonymous_returns_403(self, template_id):
        """Anonymous PUT should return 403."""
        r = requests.put(
            f"{BASE_URL}/api/admin/templates/{template_id}/file",
            json={"path": "index.html", "content": "<html></html>"}
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text[:200]}"
        print("✅ Anonymous PUT /file => 403")
    
    def test_admin_writes_and_reads_back(self, admin_client, template_id, original_index_html):
        """Admin should write to index.html and read it back, then restore."""
        # Add a marker to the original content
        marker = "<!-- TEST_MARKER_12345 -->"
        modified_content = original_index_html + "\n" + marker
        
        # Write modified content
        r = admin_client.put(
            f"{BASE_URL}/api/admin/templates/{template_id}/file",
            json={"path": "index.html", "content": modified_content}
        )
        assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text[:300]}"
        assert r.json().get("ok") is True, f"PUT response missing 'ok': {r.json()}"
        
        # Read back and verify
        r2 = admin_client.get(f"{BASE_URL}/api/admin/templates/{template_id}/file?path=index.html")
        assert r2.status_code == 200, f"GET after PUT failed: {r2.status_code}"
        content = r2.json()["content"]
        assert marker in content, f"Marker not found in content after PUT"
        
        print(f"✅ Admin PUT /file => 200, marker verified in content")
        
        # Restore original content
        r3 = admin_client.put(
            f"{BASE_URL}/api/admin/templates/{template_id}/file",
            json={"path": "index.html", "content": original_index_html}
        )
        assert r3.status_code == 200, f"Restore failed: {r3.status_code}"
        
        # Verify restoration
        r4 = admin_client.get(f"{BASE_URL}/api/admin/templates/{template_id}/file?path=index.html")
        restored = r4.json()["content"]
        assert marker not in restored, "Marker still present after restoration"
        
        print(f"✅ Original index.html restored successfully")
    
    def test_path_traversal_write_blocked(self, admin_client, template_id):
        """Path traversal in PUT should return 400."""
        paths = [
            "../../malicious.html",
            "../../../etc/passwd",
            "..%2F..%2Fmalicious.js"
        ]
        
        for path in paths:
            r = admin_client.put(
                f"{BASE_URL}/api/admin/templates/{template_id}/file",
                json={"path": path, "content": "malicious content"}
            )
            assert r.status_code == 400, f"Path traversal write '{path}' should return 400, got {r.status_code}"
        
        print(f"✅ Path traversal writes blocked (tested {len(paths)} variants)")
    
    def test_disallowed_extension_blocked(self, admin_client, template_id):
        """Writing to non-editable extension should return 400."""
        # Try to write a .exe file (not in EDITABLE set)
        r = admin_client.put(
            f"{BASE_URL}/api/admin/templates/{template_id}/file",
            json={"path": "malicious.exe", "content": "binary content"}
        )
        assert r.status_code == 400, f"Non-editable extension should return 400, got {r.status_code}"
        print("✅ Non-editable extension (.exe) write blocked")


class TestAdminTemplatePreviewEndpoint:
    """Test POST /api/admin/templates/{id}/preview"""
    
    def test_anonymous_returns_403(self, template_id):
        """Anonymous POST should return 403."""
        r = requests.post(
            f"{BASE_URL}/api/admin/templates/{template_id}/preview",
            json={"files": {"index.html": "<h1>Test</h1>"}}
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text[:200]}"
        print("✅ Anonymous POST /preview => 403")
    
    def test_admin_preview_with_token_replacement(self, admin_client, template_id):
        """Admin preview should replace tokens with sample data."""
        # Post HTML with tokens
        html = "<h1>{BRIDE_NAME}</h1><p>{VENUE}</p><p>{GROOM_NAME}</p>"
        r = admin_client.post(
            f"{BASE_URL}/api/admin/templates/{template_id}/preview",
            json={"files": {"index.html": html}}
        )
        assert r.status_code == 200, f"Preview failed: {r.status_code} {r.text[:300]}"
        assert r.headers.get("content-type", "").startswith("text/html"), "Response not HTML"
        
        content = r.text
        # Verify token replacement (BRIDE_NAME should be 'Amelia' from SAMPLE_INVITATION)
        assert "Amelia" in content, f"BRIDE_NAME token not replaced with 'Amelia': {content[:500]}"
        assert "The Ritz Ballroom" in content, f"VENUE token not replaced: {content[:500]}"
        assert "Fazar" in content, f"GROOM_NAME token not replaced: {content[:500]}"
        
        print(f"✅ Admin POST /preview => 200 HTML, tokens replaced (Amelia, The Ritz Ballroom, Fazar found)")
    
    def test_preview_does_not_write_to_disk(self, admin_client, template_id):
        """Preview should not modify the actual template file."""
        # Get original content
        r1 = admin_client.get(f"{BASE_URL}/api/admin/templates/{template_id}/file?path=index.html")
        original = r1.json()["content"]
        
        # Post different content to preview
        preview_html = "<h1>PREVIEW_ONLY_CONTENT_XYZ</h1>"
        r2 = admin_client.post(
            f"{BASE_URL}/api/admin/templates/{template_id}/preview",
            json={"files": {"index.html": preview_html}}
        )
        assert r2.status_code == 200, f"Preview failed: {r2.status_code}"
        
        # Verify original file unchanged
        r3 = admin_client.get(f"{BASE_URL}/api/admin/templates/{template_id}/file?path=index.html")
        current = r3.json()["content"]
        assert current == original, "Preview modified the actual template file!"
        assert "PREVIEW_ONLY_CONTENT_XYZ" not in current, "Preview content leaked to disk"
        
        print("✅ Preview does not write to disk (verified file unchanged)")


class TestBackwardCompatibility:
    """Test GET /api/admin/templates/{id}/render - existing endpoint still works"""
    
    def test_render_endpoint_still_works(self, admin_client, template_id):
        """Existing render endpoint should still return 200 HTML after engine refactor."""
        r = admin_client.get(f"{BASE_URL}/api/admin/templates/{template_id}/render")
        assert r.status_code == 200, f"Render endpoint failed: {r.status_code} {r.text[:300]}"
        assert r.headers.get("content-type", "").startswith("text/html"), "Response not HTML"
        
        content = r.text
        assert len(content) > 0, "Render returned empty HTML"
        # Should contain sample data
        assert "Amelia" in content, f"Sample BRIDE_NAME not in render output"
        
        print(f"✅ Backward compat: GET /render => 200 HTML (length: {len(content)})")


if __name__ == "__main__":
    # Run with pytest
    pytest.main([__file__, "-v", "-s"])
