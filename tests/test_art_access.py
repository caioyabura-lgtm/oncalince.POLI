"""ART access and local diary regression; browser storage is isolated."""
import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SESSION = 'onca-lince.producao.v01.session'
with sync_playwright() as p:
    browser = p.chromium.launch()
    for base in ['http://localhost/', 'https://caioyabura-lgtm.github.io/oncalince.POLI/']:
        for account in ['caio', 'mariana', None]:
            context = browser.new_context()
            def serve(route):
                if not route.request.url.startswith(base):
                    return route.abort()
                file = (ROOT / unquote(urlparse(route.request.url).path[len(urlparse(base).path):])).resolve()
                if not file.is_relative_to(ROOT) or not file.is_file():
                    return route.fulfill(status=404, body='')
                route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
            context.route('**/*', serve)
            if account:
                context.add_init_script(f"localStorage.setItem('{SESSION}', JSON.stringify({{access:'{account}'}}))")
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(base + 'departamento_arte_performance.html')
            if account is None:
                page.wait_for_url('**/index.html#login')
            elif account != 'caio':
                page.wait_for_function("document.querySelector('#workspace').textContent.includes('acesso') && !document.querySelector('#art-content')")
                assert page.evaluate("(async()=>{try{await ProductionDiary('arte_performance').list();return false}catch{return true}})()")
            else:
                page.wait_for_function("document.querySelector('#connection-status').textContent.includes('local')")
                assert page.locator('#feedback').inner_text() == ''
                page.locator('.category-tabs a[href="#diario"]').click()
                page.locator('#new-record').click()
                page.locator('#gabinete-form').wait_for(state='visible')
                page.locator('[name=subject]').fill('ART regression record')
                page.locator('[name=description]').fill('Isolated browser test')
                page.locator('#save-record').click()
                page.locator('#gabinete-form').wait_for(state='hidden')
                assert 'ART regression record' in page.locator('#records').inner_text()
                page.reload()
                page.wait_for_function("document.querySelector('#records').textContent.includes('ART regression record')")
                page.locator('.category-tabs a[href="#inputs"]').click()
                page.locator('#art-inputs').wait_for(state='visible')
                page.goto(base + 'producao.html')
                page.wait_for_function("!document.querySelector('[data-area-id=ART]').disabled")
                page.locator('[data-area-id=ART]').click()
                page.wait_for_url('**/departamento_arte_performance.html*')
                page.locator('#art-content').wait_for(state='visible')
            assert not errors, errors
            print('PASS', base, account or 'signed out', flush=True)
            context.close()
    browser.close()
