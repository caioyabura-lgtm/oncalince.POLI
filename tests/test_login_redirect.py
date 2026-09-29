"""Post-login navigation: intercepted test credentials, no real services."""
import hashlib
import mimetypes
from pathlib import Path
import re
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EXTERNAL = 'https://caioyabura-lgtm.github.io/production.department.oncalince/'
PASSWORD = 'isolated-login-navigation-test'
CASES = [('jaime.reis', 'ART'), ('leonardo.trindade', 'ADMIN'), ('jose.akashi', 'INTL'), ('ricardo.almeida', 'PROD')]
AUTH = (ROOT / 'auth.js').read_text(encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch()
    for base in ['http://localhost/', 'https://caioyabura-lgtm.github.io/oncalince.POLI/']:
        for account, area in CASES:
            # Test verifier exists only in the intercepted response, never in auth.js.
            # Real PBKDF2, session creation and area permissions execute unchanged.
            digest = hashlib.pbkdf2_hmac('sha256', PASSWORD.encode(), ('onca-lince.v01.' + account).encode(), 100000).hex()
            fixture, count = re.subn(r"('" + re.escape(account) + r"': \{ name: '[^']+', hash: ')[^']+", lambda m: m[1] + digest, AUTH)
            assert count == 1
            context = browser.new_context(reduced_motion='reduce')
            external_requests = []
            def serve(route):
                url = route.request.url
                if url.startswith(EXTERNAL):
                    external_requests.append(url)
                    return route.fulfill(content_type='text/html', body='<title>PROD test</title>')
                if not url.startswith(base):
                    return route.abort()
                relative = unquote(urlparse(url).path[len(urlparse(base).path):])
                if relative == 'auth.js':
                    return route.fulfill(content_type='application/javascript; charset=utf-8', body=fixture)
                file = (ROOT / relative).resolve()
                if not file.is_relative_to(ROOT) or not file.is_file():
                    return route.fulfill(status=404, body='')
                return route.fulfill(body=file.read_bytes(), content_type=(mimetypes.guess_type(file)[0] or 'application/octet-stream') + '; charset=utf-8')
            context.route('**/*', serve)
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(base + 'index.html#login')
            page.evaluate("window.dispatchEvent(new Event('lab-earth-ready'))")
            page.locator('#login-email').fill(account)
            page.locator('#login-password').fill('incorrect-test-password')
            page.locator('.login-submit').click()
            page.wait_for_function("document.querySelector('#login-error').textContent.length > 0")
            assert page.url == base + 'index.html#login'
            assert page.evaluate('productionAuth.current()') is None
            page.locator('#login-password').fill(PASSWORD)
            page.locator('.login-submit').click()
            page.wait_for_url(base + 'producao.html#overview')
            page.wait_for_function('Boolean(window.poliService?.current())')
            assert page.evaluate('productionAuth.current().access') == account
            assert page.evaluate('productionAuth.current().sessionId').startswith('SES-')
            assert page.locator('[data-view="overview"]').is_visible()
            assert page.locator('[data-area-id="' + area + '"]').is_enabled()
            assert page.evaluate('area => poliService.canReadArea(area)', area)
            assert not external_requests and len(context.pages) == 1
            if area == 'PROD':
                with context.expect_page() as popup_event:
                    page.locator('[data-area-id="PROD"]').click()
                popup = popup_event.value
                popup.wait_for_url(EXTERNAL)
                popup.wait_for_load_state()
                assert popup.evaluate('window.opener === null')
                assert page.url == base + 'producao.html#overview'
                assert external_requests == [EXTERNAL]
            assert not errors, errors
            print('PASS', base, area, account, flush=True)
            context.close()
    browser.close()
