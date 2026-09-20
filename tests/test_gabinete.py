"""Testes isolados; API interceptada não representa conexão real com Sheets."""
import functools
import http.server
import json
from pathlib import Path
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def copyfile(self, source, outputfile):
        try: super().copyfile(source, outputfile)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError): pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(reduced_motion='reduce')
        page.set_default_timeout(10000)
        page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('dialog', lambda dialog: dialog.accept())
        page.goto(base + '/gabinete-interno.html')
        page.wait_for_url('**/index.html#login')
        page.evaluate("localStorage.setItem('onca-lince.producao.v01.session',JSON.stringify({access:'caio'}))")
        page.goto(base + '/producao.html')
        link = page.locator('.production-sectors').get_by_role('button', name='Gabinete Internacional', exact=True)
        assert link.get_attribute('aria-disabled') == 'false'
        link.focus()
        page.keyboard.press('Enter')
        page.wait_for_url('**/gabinete-interno.html')
        assert page.locator('.portal-gabinete-link').get_attribute('href') == 'gabinete_internacional.html'
        page.wait_for_function("document.querySelector('#connection-status').textContent.includes('Diário local')")
        assert page.locator('#dashboard-data').is_visible()
        page.get_by_role('link', name='Diário de Produção', exact=True).click()
        page.locator('#new-record').click()
        assert page.locator('#save-record').is_enabled()
        assert page.locator('[name=responsible]').input_value() == 'Caio Rodrigues'
        page.locator('[name=subject]').fill('Rascunho não persistido')
        assert page.evaluate('localStorage.length') == 1
        page.locator('#cancel-record').click()
        # Fixture somente em memória do teste, nunca nos arquivos da aplicação.
        rows = []
        mode = {'error':None}
        requests = []
        page.route('**/gabinete-config.js', lambda route: route.fulfill(content_type='application/javascript', body="window.gabineteConfig = Object.freeze({apiBase:'/api/gabinete'});"))
        def api(route):
            req = route.request
            requests.append(req.method)
            if mode['error']:
                route.fulfill(status=mode['error'], content_type='application/json', body='{}')
                return
            if req.method == 'GET':
                data = {'records':rows}
            else:
                body = req.post_data_json
                assert body['requestId'] and 'access' not in body
                saved = dict(body['record'])
                if req.method == 'POST':
                    saved.update(id='test-record', version=1)
                    rows.append(saved)
                else:
                    assert body['version'] == rows[0]['version']
                    saved.update(id=rows[0]['id'], version=rows[0]['version']+1)
                    rows[0] = saved
                data = {'record':saved}
            route.fulfill(content_type='application/json', body=json.dumps(data))
        page.route('**/api/gabinete/**', api)
        page.reload()
        page.wait_for_function("document.querySelector('#connection-status').textContent.includes('confirmada')")
        assert page.locator('#dashboard-data').is_hidden() # Aba Diário ativa.
        assert 'Nenhum registro' in page.locator('#records').inner_text()
        page.locator('#new-record').click()
        page.locator('[name=subject]').fill('Contato de produção')
        page.locator('[name=description]').fill('Reunião de acompanhamento')
        assert page.locator('#gabinete-form input:visible, #gabinete-form select:visible, #gabinete-form textarea:visible').evaluate_all('(els)=>els.map(e=>e.name)') == ['subject','type','status','description','tags']
        page.locator('[name=tags]').fill('instituição, Portugal')
        page.locator('#save-record').click()
        page.wait_for_function("document.querySelector('#feedback').textContent === 'Registro salvo.'")
        assert len(rows) == 1 and rows[0]['version'] == 1
        assert page.locator('#records .entry').count() == 1
        page.locator('#records summary').click()
        assert 'instituição, Portugal' in page.locator('#records').inner_text()
        page.locator('#records').get_by_role('button', name='Editar', exact=True).click()
        page.locator('[name=subject]').fill('Contato atualizado')
        mode['error'] = 409
        page.locator('#save-record').click()
        page.wait_for_function("document.querySelector('#feedback').textContent.includes('outra pessoa')")
        assert page.locator('[name=subject]').input_value() == 'Contato atualizado'
        mode['error'] = None
        page.locator('#save-record').click()
        page.wait_for_function("document.querySelector('#feedback').textContent === 'Registro salvo.'")
        assert rows[0]['version'] == 2
        page.locator('#search').fill('inexistente')
        assert page.locator('#records .entry').count() == 0
        page.locator('#search').fill('atualizado')
        assert page.locator('#records .entry').count() == 1
        page.locator('#filter-status').select_option('concluído')
        assert page.locator('#records .entry').count() == 0
        page.locator('#filter-status').select_option('')
        page.locator('#date-from').fill('2099-01-01')
        assert page.locator('#records .entry').count() == 0
        page.locator('#date-from').fill('')
        page.get_by_role('link', name='Dashboard', exact=True).click()
        page.locator('[data-gabinete-view=dashboard]').wait_for(state='visible')
        assert page.locator('#dashboard-data').is_visible()
        assert 'Não informado · 1' in page.locator('#by-territory').inner_text()
        assert 'Nenhum próximo prazo informado.' in page.locator('#deadlines').inner_text()
        for width in [390,768,1440,1920]:
            page.set_viewport_size({'width':width,'height':1000})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(Path(tempfile.gettempdir()) / f'gabinete-{width}.png'))
            page.get_by_role('link', name='Diário de Produção', exact=True).click()
            page.locator('#new-record').click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('#cancel-record').click()
            page.get_by_role('link', name='Dashboard', exact=True).click()
            page.locator('[data-gabinete-view=dashboard]').wait_for(state='visible')
        # Erros de consulta não mostram indicadores antigos como atuais.
        mode['error'] = 403
        page.locator('#refresh').click()
        page.wait_for_function("document.querySelector('#feedback').textContent.includes('não autorizou')")
        assert page.locator('#dashboard-data').is_hidden()
        assert page.locator('#records').inner_html() == ''
        assert page.evaluate("(() => {try {gabineteService.normalize({date:'2026-02-31',responsible:'R',subject:'S',description:'D',status:'aberto'});return false;}catch{return true;}})()")
        page.locator('#logout-button').click()
        page.wait_for_url('**/index.html')
        assert not errors, errors
        assert all(method in requests for method in ['GET','POST','PATCH'])
        browser.close()
        print('PASS: rotas, sessão, sem configuração, CRUD via API interceptada, conflito, filtros, dashboard, erros e quatro larguras; nenhum pageerror. Sheets real não conectado.')
finally:
    server.shutdown()
