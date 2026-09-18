"""Hosted demo: navegador com origem simulada; nenhuma chamada externa real."""
import mimetypes
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HOST = 'https://caioyabura-lgtm.github.io'
PREFIX = '/oncalince.POLI/'
with sync_playwright() as p:
    browser = p.chromium.launch()
    def case(origin=HOST, prefix=PREFIX, access='caio', forced=None):
        context = browser.new_context()
        errors = []
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        def serve(route):
            url = urlparse(route.request.url)
            if url.netloc != urlparse(origin).netloc:
                return route.abort()
            relative = unquote(url.path[len(prefix):])
            file = (ROOT / relative).resolve()
            if not file.is_relative_to(ROOT) or not file.is_file():
                return route.fulfill(status=404, body='')
            if forced and file.name == 'poli-config.js':
                return route.fulfill(content_type='application/javascript', body=
                    "window.poliConfig={mode:'hosted-demo',localScenario:'A',audit:{mode:'local'}};")
            route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
        page.route('**/*', serve)
        page.add_init_script("localStorage.setItem('onca-lince.producao.v01.session', JSON.stringify({access:" + repr(access) + "}));")
        page.goto(origin + prefix + 'producao.html')
        return context, page, errors
    for origin, prefix, access, forced, expected in [
        ('http://localhost', '/', 'caio', None, ['EXEC','TECH','INTL']),
        (HOST, PREFIX, 'caio', None, ['EXEC','ART','TECH','INTL']),
        (HOST, PREFIX, 'mariana', None, []),
        ('https://example.org', PREFIX, 'caio', True, None),
        (HOST, '/other/', 'caio', True, None),
        (HOST, '/oncalince.POLI-evil/', 'caio', True, None),
    ]:
        context, page, errors = case(origin, prefix, access, forced)
        if expected is None:
            page.wait_for_function("document.querySelector('#feedback').textContent.includes('permissões')")
            assert page.evaluate('poliService.current()') is None
            assert page.locator('.production-sectors button:enabled').count() == 0
        else:
            page.wait_for_function('Boolean(poliService.current())')
            assert page.locator('.production-sectors button:enabled').evaluate_all('(els)=>els.map(e=>e.dataset.areaId)') == expected
            for area in ['PROD','MKT','ADMIN']:
                assert page.locator('[data-area-id='+area+']').is_disabled()
                assert page.evaluate('(id)=>poliService.current().areas.find(a=>a.id===id).dashboardActive', area) is False
            if origin == HOST and access == 'caio':
                assert page.evaluate("['EXEC','ART','TECH','INTL'].every(id=>poliService.isAreaAdmin(id))")
                page.locator('#profile-button').click()
                assert 'Demonstração hospedada' in page.locator('#poli-mode-note').inner_text()
                page.locator('#profile-dialog button').click()
                page.locator('[data-area-id=EXEC]').click()
                page.wait_for_function("location.hash==='#executivo'")
                page.locator('[data-view=executivo] a[href="#diary"]').click() if page.locator('[data-view=executivo] a[href="#diary"]').count() else page.evaluate("location.hash='diary'")
                page.locator('#new-diary').wait_for(state='visible')
                for area, slug in [('TECH','diretoria_tecnica'),('ART','arte_performance'),('INTL','gabinete_internacional')]:
                    page.goto(origin+prefix+'producao.html')
                    page.wait_for_function('Boolean(poliService.current())')
                    page.locator('[data-area-id='+area+']').click()
                    page.wait_for_url('**/gabinete-interno.html' if area == 'INTL' else '**/gabinete-interno.html?area='+slug)
                    assert 'não tem acesso' not in page.locator('#workspace').inner_text()
        assert not errors, errors
        context.close()
    browser.close()
print('PASS: local preservado; hosted-demo ADMIN EXEC/ART/TECH/INTL; Diário local e workspaces; outros usuários fechados; domínio/caminhos recusados; áreas futuras inativas.')
