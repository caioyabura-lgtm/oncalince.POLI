"""Consulta técnica: navegação, acesso, configuração e responsividade."""
import functools
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def copyfile(self, source, output):
        try: super().copyfile(source, output)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError): pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(base) else r.abort())
        config = {'mode':'local','apiUrl':None,'localScenario':'A','timeoutMs':1000,'audit':{'mode':'local','apiUrl':None,'timeoutMs':150}}
        context.route('**/poli-config.js', lambda r: r.fulfill(content_type='application/javascript',body='window.poliConfig='+json.dumps(config)))
        errors = []
        context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
        page = context.new_page()
        page.goto(base+'/diretoria_tecnica.html')
        page.wait_for_url('**/index.html#login')
        page.evaluate("localStorage.setItem('onca-lince.producao.v01.session', JSON.stringify({access:'pedro.sebastiao'}))")
        page.goto(base+'/producao.html')
        page.wait_for_function("!document.querySelector('[data-area-id=TECH]').disabled")
        routes = page.evaluate('Object.fromEntries(Object.entries(productionAreas.definitions).map(([k,v])=>[k,v.href]))')
        assert routes == {'producao_executiva':'producao.html#executivo','gabinete_internacional':'gabinete-interno.html','diretoria_tecnica':'diretoria_tecnica.html','arte_performance':'gabinete-interno.html?area=arte_performance'}
        with context.expect_page() as popup:
            page.locator('[data-area-id=TECH]').click()
        tech = popup.value
        tech.wait_for_url(base+'/diretoria_tecnica.html')
        tech.locator('#technical-content').wait_for(state='visible')
        assert page.url == base+'/producao.html'
        assert tech.evaluate('window.opener === null')
        assert tech.locator('.technical-category').count() == 6
        assert tech.locator('.technical-folder-state').all_text_contents() == ['Abrir pasta']*6
        assert tech.locator('.technical-empty').count() == 0
        assert tech.locator('.technical-folder[href]').count() == 6
        assert tech.locator('form, input, textarea, select, #gabinete-form, #area-input-list, .category-tabs').count() == 0
        assert tech.locator('meta[name=robots]').get_attribute('content') == 'noindex, nofollow'
        assert tech.locator('h1').inner_text() == 'DIRETORIA TÉCNICA'
        assert tech.locator('.portal-header, .view-return').count() == 0
        assert tech.locator('.technical-team a').count() == 3
        assert 'https://' not in tech.locator('body').inner_text()
        for link in tech.locator('.technical-team a').all():
            assert link.get_attribute('target') == '_blank'
            assert link.get_attribute('rel') == 'noopener noreferrer'
        assert tech.locator('.technical-lynx img').evaluate('(img) => img.complete && img.naturalWidth > 0')
        assert 'International Coproduction Fund (IKF)' in tech.locator('.technical-context').inner_text()
        for width in [320,390,768,1440,1920]:
            tech.set_viewport_size({'width':width,'height':1000})
            assert tech.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        tech.locator('#profile-button').click()
        assert tech.locator('#profile-dialog').is_visible()
        tech.locator('#profile-close').click()
        for lang, title in [('en', 'TECHNICAL DIRECTION'), ('de', 'TECHNISCHE LEITUNG'), ('pt', 'DIRETORIA TÉCNICA')]:
            tech.goto(base+'/diretoria_tecnica.html?lang='+lang)
            tech.locator('#technical-content').wait_for(state='visible')
            assert tech.locator('h1').inner_text() == title
            for width in [320, 768, 1440]:
                tech.set_viewport_size({'width':width,'height':1000})
                assert tech.evaluate('document.documentElement.scrollWidth <= innerWidth'), (lang,width)
        # Dados sintéticos exclusivos do teste, nunca gravados na configuração real.
        fixture = {'folders':{'audio':'https://drive.google.com/drive/folders/test-fixture','video':'javascript:alert(1)'},'documents':[{'technical_id':'TEST','title':'Fixture <b>literal</b>','category':'audio','version':'test','date':'2026-09-18','responsible':'Fixture','territory':'Fixture','status':'Fixture','reference':'Fixture','url':'https://drive.google.com/file/d/test-fixture/view'}]}
        tech.route('**/diretoria-tecnica-config.js', lambda r:r.fulfill(content_type='application/javascript',body='window.technicalConfig='+json.dumps(fixture)))
        tech.goto(base+'/diretoria_tecnica.html')
        tech.locator('#technical-content').wait_for(state='visible')
        assert tech.locator('a.technical-folder').count() == 1
        for link in [tech.locator('a.technical-folder'),tech.locator('.technical-document a')]:
            assert link.get_attribute('target') == '_blank'
            assert link.get_attribute('rel') == 'noopener noreferrer'
        tech.locator('.technical-published summary').first.click()
        assert tech.locator('.technical-document h5').inner_text() == 'Fixture <b>literal</b>'
        assert tech.locator('.technical-document b').count() == 0
        assert tech.locator('.technical-document dd').count() == 6
        assert tech.locator('.technical-document time').get_attribute('datetime') == '2026-09-18'
        assert tech.locator('.technical-document button, .technical-document input').count() == 0
        tech.locator('#logout-button').click()
        tech.wait_for_url('**/index.html')
        tech.goto(base+'/diretoria_tecnica.html')
        tech.wait_for_url('**/index.html#login')
        tech.evaluate("localStorage.setItem('onca-lince.producao.v01.session', JSON.stringify({access:'jose.akashi'}))")
        tech.goto(base+'/diretoria_tecnica.html')
        tech.wait_for_function("document.querySelector('#access-status').textContent.includes('não tem acesso')")
        assert tech.locator('#technical-content').is_hidden()
        assert tech.locator('.technical-category').count() == 0
        assert not errors, errors
        browser.close()
        print('PASS: nova aba isolada; login e permissao TECH; Perfil/Sair; PT/EN/DE; nomes clicáveis; layout autônomo; seis categorias; URLs opcionais; documentos somente consulta; 320-1920px; sem erros JS.')
finally:
    server.shutdown()
