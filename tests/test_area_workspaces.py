"""Integração multiárea; concessões de teste interceptadas, sem alterar a política real."""
import functools
import http.server
import json
import re
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
        page.on('dialog', lambda dialog: dialog.accept())
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        config = {'mode':'local','apiUrl':None,'localScenario':'A','timeoutMs':1000,
                  'audit':{'mode':'local','apiUrl':None,'timeoutMs':150}}
        page.route('**/poli-config.js', lambda r: r.fulfill(content_type='application/javascript', body='window.poliConfig='+json.dumps(config)))
        # POLI controla abertura; fixture separada dos direitos legados de DADOS.
        grants = [{'areaId':'TECH','level':'READ'}]
        local_bootstrap = (ROOT/'poli-local.js').read_text(encoding='utf-8')
        page.route('**/poli-local.js', lambda r: r.fulfill(content_type='application/javascript', body=local_bootstrap+
            '\nconst testBootstrap=window.poliLocalBootstrap; window.poliLocalBootstrap=(...args)=>({...testBootstrap(...args),permissions:'+json.dumps(grants)+'});'))
        page.goto(base + '/gabinete-interno.html?area=diretoria_tecnica')
        page.wait_for_url('**/index.html#login')
        page.evaluate("localStorage.setItem('onca-lince.producao.v01.session',JSON.stringify({access:'mariana'}))")
        # Política controlada do teste: Mariana somente Técnica; Caio nas três áreas.
        original = (ROOT / 'area-workspaces.js').read_text(encoding='utf-8')
        test_policy = re.sub(r'diretoria_tecnica: Object.freeze\(\[[^\]]*\]\)', "diretoria_tecnica: Object.freeze(['caio', 'mariana'])", original)
        test_policy = re.sub(r'arte_performance: Object.freeze\(\[[^\]]*\]\)', "arte_performance: Object.freeze(['caio'])", test_policy)
        page.route('**/area-workspaces.js', lambda route: route.fulfill(content_type='application/javascript', body=test_policy))
        page.goto(base + '/producao.html')
        page.wait_for_function('Boolean(window.poliService?.current())')
        assert page.locator('.production-sectors [data-area-id]').evaluate_all('(els)=>els.map(e=>e.dataset.areaId)') == ['EXEC','ART','PROD','TECH','MKT','ADMIN','INTL']
        assert page.locator('[data-area-id=EXEC]').is_disabled()
        assert page.locator('[data-area-id=ART]').is_disabled()
        assert page.locator('[data-area-id=TECH]').is_enabled()
        assert page.locator('[data-executive-link], [data-area-link]').count() == 0
        assert page.locator('.production-input').get_attribute('href') == 'input.html'
        page.goto(base + '/gabinete-interno.html?area=arte_performance')
        assert 'não tem acesso' in page.locator('#workspace').inner_text()
        assert page.evaluate("(async()=>{try{await ProductionDiary('arte_performance').list();return false;}catch{return true;}})()")
        assert page.evaluate("(async()=>{try{await inputService.listForArea('producao_executiva');return false;}catch{return true;}})()")
        page.goto(base + '/producao.html#executivo')
        page.wait_for_function("location.hash === '#overview'")
        page.evaluate("localStorage.setItem(productionAuth.key,JSON.stringify({access:'caio'}))")
        grants = [{'areaId':area,'level':'WRITE'} for area in ['EXEC','ART','TECH','INTL']]
        page.reload()
        page.wait_for_function('Boolean(window.poliService?.current())')
        for area in ['PROD','MKT','ADMIN']:
            assert page.locator('[data-area-id='+area+']').is_disabled()
        # Tentativas de escolher departamentos nunca desviam a entrada de EXEC.
        ids = page.evaluate("""async () => {
          const ids = [];
          for (const patch of ['direcao-tecnica','arte-performance','administracao-internacional','producao-executiva','direcao-producao','marketing']) {
            const r = await inputService.create({title:'Entrada '+patch,synopsis:'Um parágrafo.',link:'https://example.org',licenseCategory:'registro',patch});
            if (r.initialAreaId !== 'EXEC' || 'patch' in r) throw new Error('INPUT desviou de EXEC');
            ids.push(r.id);
          }
          return ids;
        }""")
        original_inputs = page.evaluate('localStorage.getItem(inputService.key)')
        assert len(ids) == 6
        for area in ['gabinete_internacional','diretoria_tecnica','arte_performance']:
            page.goto(base + '/producao.html')
            area_id = {'gabinete_internacional':'INTL','diretoria_tecnica':'TECH','arte_performance':'ART'}[area]
            page.locator('[data-area-id='+area_id+']').click()
            expected = base+'/gabinete-interno.html'+('' if area_id=='INTL' else '?area='+area)
            page.wait_for_url(expected)
            page.wait_for_function("document.querySelector('#connection-status').textContent.includes('Diário local')")
            page.wait_for_function("document.querySelector('#input-count').textContent === '0 INPUTS recebidos'")
            page.get_by_role('link', name='Inputs recebidos', exact=True).click()
            assert page.locator('#area-input-list .entry').count() == 0
            page.get_by_role('link', name='Diário de Produção', exact=True).click()
            page.locator('#new-record').click()
            page.locator('[name=subject]').fill('Diário ' + area)
            page.locator('[name=description]').fill('Registro exclusivo da área')
            page.locator('[name=tags]').fill('processo, teste')
            page.locator('[name=type]').select_option('reunião')
            page.locator('#save-record').click()
            page.wait_for_function("document.querySelector('#feedback').textContent.includes('salvo neste navegador')")
            saved = page.evaluate('(area)=>JSON.parse(localStorage.getItem(ProductionDiary(area).key))', area)
            assert len(saved) == 1 and saved[0]['area'] == area and saved[0]['time']
            page.locator('#records summary').click()
            page.locator('#records').get_by_role('button', name='Editar', exact=True).click()
            assert page.locator('[name=tags]').input_value() == 'processo, teste'
            page.locator('[name=description]').fill('Registro editado')
            page.locator('#save-record').click()
            page.wait_for_function("document.querySelector('#records').textContent.includes('Registro editado')")
            page.locator('#filter-type').select_option('decisão')
            assert page.locator('#records .entry').count() == 0
            page.locator('#filter-type').select_option('reunião')
            page.locator('#search').fill('processo')
            assert page.locator('#records .entry').count() == 1
            page.reload()
            page.locator('#records .entry').wait_for()
            assert page.locator('#records .entry').count() == 1
            assert page.evaluate('localStorage.getItem(inputService.key)') == original_inputs
            for width in [390,768,1440,1920]:
                page.set_viewport_size({'width':width,'height':1000})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(Path(tempfile.gettempdir()) / (area + '.png')))
        page.goto(base + '/producao.html#executivo')
        page.wait_for_function("document.querySelector('#executive-input-count').textContent.includes('6 INPUTS')")
        page.locator('[data-view=executivo] a[href="#executive-inputs"]').click()
        page.wait_for_function("document.querySelectorAll('#executive-input-list .entry').length === 6")
        assert page.locator('#executive-input-list .entry').count() == 6
        assert page.evaluate('localStorage.getItem(inputService.key)') == original_inputs
        # Sem encaminhamento implementado, Técnica não recebe INPUT de outro autor.
        page.evaluate("localStorage.setItem(productionAuth.key,JSON.stringify({access:'mariana'}))")
        grants = [{'areaId':'TECH','level':'READ'}]
        page.goto(base + '/gabinete-interno.html?area=diretoria_tecnica#inputs')
        page.wait_for_function("document.querySelector('#input-count').textContent === '0 INPUTS recebidos'")
        assert page.locator('#area-input-list .entry').count() == 0
        assert page.evaluate('localStorage.getItem(inputService.key)') == original_inputs
        assert page.evaluate("(async()=>{try{await ProductionDiary('arte_performance').create({});return false;}catch{return true;}})()")
        assert page.evaluate("productionAreas.fromPatch('diretoria_tecnica') === 'diretoria_tecnica' && productionAreas.fromPatch({primary:'arte-performance'}) === 'arte_performance'")
        # Falha local preserva formulário e coleção.
        page.get_by_role('link', name='Diário de Produção', exact=True).click()
        page.locator('#new-record').click()
        page.locator('[name=subject]').fill('Preservar')
        page.locator('[name=description]').fill('Texto')
        page.evaluate("localStorage.setItem(ProductionDiary('diretoria_tecnica').key,'corrupt')")
        page.locator('#save-record').click()
        page.wait_for_function("document.querySelector('#feedback').textContent.includes('preservados')")
        assert page.locator('[name=subject]').input_value() == 'Preservar'
        assert not errors, errors
        browser.close()
        print('PASS: shell por area_id, abertura POLI, dados isolados, INPUT somente EXEC, edição, filtros, persistência, erros e responsividade. Concessões temporárias somente no teste.')
finally:
    server.shutdown()
