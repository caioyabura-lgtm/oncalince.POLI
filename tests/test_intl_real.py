"""LIST/CREATE INTL com Web App interceptado; nenhuma chave ou gravação real."""
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://caioyabura-lgtm.github.io/oncalince.POLI/'
API = 'https://script.google.com/macros/s/AKfycbyNxGJv2TUDPMBnIpz1WC2gQPP-qoTZSIUYgUPuxd5os4ERbbtua0BSPSH7ojQDVA9J/exec'
KEY = 'onca-lince.gabinete.v01.intl-access-key'
EXEC_KEY = 'onca-lince.producao.v01.executive-access-key'
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_default_timeout(10000)
    rows, calls, errors, prompts = [], [], [], []
    state = {'deny':False, 'foreign':False, 'cancel':False}
    page.on('pageerror', lambda e: errors.append(str(e)))
    def dialog(d):
        prompts.append(d.message)
        assert d.message == 'Chave de acesso — Gabinete Internacional'
        d.dismiss() if state['cancel'] else d.accept('INTL-TEST-ONLY')
    page.on('dialog', dialog)
    def serve(route):
        url = route.request.url
        if url == API:
            assert route.request.method == 'POST'
            assert route.request.headers['content-type'].startswith('text/plain')
            body = json.loads(route.request.post_data)
            assert body['accessKey'] == 'INTL-TEST-ONLY'
            calls.append(body)
            if state['deny']:
                result = {'ok':False,'error':'INTL_UNAVAILABLE'}
            elif body['operation'] == 'list':
                assert set(body) == {'operation','accessKey'}
                result = {'ok':True,'data':[{**row,'area_id':'TECH' if state['foreign'] else 'INTL'} for row in rows]}
            else:
                assert body['operation'] == 'create'
                assert set(body) == {'operation','accessKey','data'}
                assert set(body['data']) == {'titulo','registro','tipo','status','tags'}
                rows.append({**body['data'],'diary_id':'INTL-1','area_id':'INTL','user_id':'SERVER-USER','criado_em':'2026-09-18T12:30:00Z'})
                result = {'ok':True,'data':rows[-1]}
            return route.fulfill(content_type='application/json',body=json.dumps(result),headers={'Access-Control-Allow-Origin':'*'})
        if not url.startswith(BASE): return route.abort()
        file = (ROOT/urlparse(url).path.removeprefix('/oncalince.POLI/')).resolve()
        if not file.is_relative_to(ROOT) or not file.is_file(): return route.fulfill(status=404,body='')
        route.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    page.route('**/*',serve)
    page.goto(BASE+'gabinete-interno.html')
    page.wait_for_url('**/index.html#login')
    page.evaluate("""() => {
      localStorage.setItem('onca-lince.producao.v01.session',JSON.stringify({access:'caio'}));
      localStorage.setItem('onca-lince.producao.v01.diary.gabinete_internacional','[]');
      localStorage.setItem('preserve','sentinel');
    }""")
    page.evaluate('(key)=>sessionStorage.setItem(key,"EXEC-TEST-ONLY")',EXEC_KEY)
    before = page.evaluate('JSON.stringify(localStorage)')
    page.goto(BASE+'gabinete-interno.html#diario')
    page.wait_for_function("document.querySelector('#connection-status').textContent.includes('Diário local')")
    assert not calls and not prompts
    page.locator('a',has_text='Diário real INTL').click()
    page.wait_for_function("document.querySelector('#connection-status').textContent.includes('leitura confirmada')")
    assert len(prompts) == 1
    page.locator('#new-record').click()
    assert page.locator('[name=responsible]').is_disabled()
    assert page.locator('#gabinete-form input:visible, #gabinete-form select:visible, #gabinete-form textarea:visible').evaluate_all('(els)=>els.map(e=>e.name)') == ['subject','type','status','description','tags']
    page.locator('[name=subject]').fill('Primeiro registro simplificado do Gabinete')
    page.locator('[name=description]').fill('Contato com instituição internacional e acompanhamento das condições da candidatura.')
    page.locator('[name=type]').select_option('acompanhamento')
    page.locator('[name=status]').select_option('aberto')
    page.locator('[name=tags]').fill('goethe, candidatura, internacional')
    page.locator('#save-record').click()
    page.locator('#records .entry').wait_for()
    assert [call['operation'] for call in calls] == ['list','create','list']
    assert calls[1]['data']['tags'] == ['goethe','candidatura','internacional']
    assert '18/09/2026' in page.locator('#records .entry').inner_text()
    page.locator('#records summary').click()
    assert 'goethe, candidatura, internacional' in page.locator('#records .entry').inner_text()
    assert page.locator('#records button',has_text='Editar').count() == 0
    page.reload()
    page.locator('#records .entry').wait_for()
    assert len(prompts) == 1
    assert page.evaluate('JSON.stringify(localStorage)') == before
    assert page.evaluate('(key)=>sessionStorage.getItem(key)',KEY) == 'INTL-TEST-ONLY'
    assert page.evaluate('(key)=>sessionStorage.getItem(key)',EXEC_KEY) == 'EXEC-TEST-ONLY'
    # Nenhuma área externa é silenciosamente incorporada à lista INTL.
    state['foreign'] = True
    page.locator('#refresh').click()
    page.wait_for_function("document.querySelector('#feedback').textContent.includes('outra área')")
    assert page.locator('#records .entry').count() == 0
    state['foreign'] = False
    state['deny'] = True
    page.locator('#refresh').click()
    page.wait_for_function("document.querySelector('#feedback').textContent==='Acesso ao Gabinete Internacional não autorizado ou indisponível.'")
    assert page.evaluate('(key)=>sessionStorage.getItem(key)',KEY) is None
    assert page.evaluate('(key)=>sessionStorage.getItem(key)',EXEC_KEY) == 'EXEC-TEST-ONLY'
    state['deny'] = False
    state['cancel'] = True
    count = len(calls)
    page.locator('#refresh').click()
    page.wait_for_function("document.querySelector('#feedback').textContent.includes('cancelado')")
    assert len(calls) == count
    state['cancel'] = False
    page.locator('#refresh').click()
    page.locator('#records .entry').wait_for()
    # TECH/ART não selecionam o adapter INTL, mesmo com diary=real.
    count = len(calls)
    page.goto(BASE+'gabinete-interno.html?area=diretoria_tecnica&diary=real#diario')
    page.wait_for_function("document.querySelector('#connection-status').textContent==='Não foi possível consultar a base.'")
    assert len(calls) == count
    # Logout a partir de outra página também remove a chave INTL.
    page.goto(BASE+'producao.html')
    page.locator('#logout-button').click()
    page.wait_for_url('**/index.html')
    assert page.evaluate('(key)=>sessionStorage.getItem(key)',KEY) is None
    assert not errors, errors
    browser.close()
print('PASS: INTL LIST/CREATE, payload editorial, F5, isolamento local/EXEC/TECH, rejeição de outra área, chave inválida/cancelamento e logout.')
