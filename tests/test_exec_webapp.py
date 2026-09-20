"""Web App interceptado: chave fictícia, nenhuma leitura/escrita real."""
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://caioyabura-lgtm.github.io/oncalince.POLI/'
SESSION_KEY = 'onca-lince.producao.v01.executive-access-key'
DEMO_KEY = 'onca-lince.producao.v01.diary'
FAKE_KEY = 'TEST-ONLY-NOT-A-REAL-KEY'
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context()
    page = context.new_page()
    errors, calls, rows = [], [], []
    state = {'deny': False, 'network': False, 'delay': False}
    page.on('pageerror', lambda error: errors.append(str(error)))
    def serve(route):
        url = route.request.url
        if url.startswith('https://script.google.com/macros/s/'):
            assert route.request.method == 'POST'
            assert route.request.headers['content-type'].startswith('text/plain')
            assert '?' not in url and FAKE_KEY not in url
            body = json.loads(route.request.post_data)
            assert set(body) == {'operation', 'accessKey', 'data'}
            assert body['accessKey'] == FAKE_KEY
            assert 'user_id' not in body['data'] and 'criado_em' not in body['data']
            calls.append(body)
            if state['network']:
                return route.abort()
            if state['deny']:
                return route.fulfill(content_type='application/json', body=json.dumps({'ok':False,'error':'EXEC_UNAVAILABLE'}), headers={'Access-Control-Allow-Origin':'*'})
            operation = body['operation']
            if operation == 'list':
                result = list(rows)
            elif operation == 'create':
                assert 'diary_id' not in body['data']
                rows.append({**body['data'], 'diary_id':'EXD-SERVER', 'criado_em':'2026-09-18T12:30:00Z'})
                result = rows[-1]
            elif operation == 'update':
                assert body['data']['diary_id'] == 'EXD-SERVER'
                rows[0].update(body['data'])
                result = rows[0]
            else:
                raise AssertionError(operation)
            return route.fulfill(content_type='application/json', body=json.dumps({'ok':True,'data':result}), headers={'Access-Control-Allow-Origin':'*'})
        if not url.startswith(BASE):
            return route.abort()
        file = (ROOT / urlparse(url).path.removeprefix('/oncalince.POLI/')).resolve()
        if not file.is_relative_to(ROOT) or not file.is_file():
            return route.fulfill(status=404, body='')
        route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    page.route('**/*', serve)
    page.goto(BASE+'producao.html')
    page.wait_for_url('**/index.html#login')
    page.evaluate("localStorage.setItem('onca-lince.producao.v01.session',JSON.stringify({access:'caio'}))")
    page.evaluate('(key)=>localStorage.setItem(key,JSON.stringify([{id:"DEMO",title:"LOCAL ONLY",body:"Texto",date:"2026-09-18",time:"12:00",type:"ideia",status:"aberto",tags:[]}]))', DEMO_KEY)
    page.goto(BASE+'producao.html#diary')
    page.locator('#diary-list .entry').wait_for()
    assert not calls
    local_before = page.evaluate('Object.fromEntries(Object.entries(localStorage))')
    page.locator('[data-view=diary] a[href="?diary=real#diary"]').click()
    page.locator('#executive-key-dialog').wait_for(state='visible')
    assert not calls
    # Cancelar não envia nada e permite tentar novamente.
    page.locator('#executive-key-dialog button[type=button]').click()
    assert not calls
    page.reload()
    page.locator('#executive-key-dialog input').fill(FAKE_KEY)
    page.locator('#executive-key-dialog button[type=submit]').click()
    page.wait_for_function("document.querySelector('[data-executive-connection]').textContent==='Conectado ao POLI_EXECUTIVO'")
    assert page.locator('#executive-key-dialog input').input_value() == ''
    assert page.evaluate('(key)=>sessionStorage.getItem(key)', SESSION_KEY) == FAKE_KEY
    assert FAKE_KEY not in page.locator('body').inner_text()
    assert 'LOCAL ONLY' not in page.locator('#diary-list').inner_text()
    assert page.locator('#clear-demo-diary').is_hidden()
    page.locator('#new-diary').click()
    assert page.locator('#diary-form [name=date]').is_disabled()
    page.locator('#diary-form [name=title]').fill('Registro no backend simulado')
    page.locator('#diary-form [name=body]').fill('Conteúdo editorial')
    page.locator('#diary-form [type=submit]').click()
    page.locator('#diary-list .entry').wait_for()
    page.reload()
    page.locator('#diary-list .entry').wait_for()
    assert page.locator('#executive-key-dialog').is_hidden()
    assert len(rows) == 1
    page.locator('#diary-list .entry button', has_text='Editar').click()
    page.locator('#diary-form [name=title]').fill('Registro atualizado')
    page.locator('#diary-form [type=submit]').click()
    page.wait_for_function("document.querySelector('#diary-list h2')?.textContent==='Registro atualizado'")
    assert any(call['operation']=='update' for call in calls)
    assert page.evaluate('Object.fromEntries(Object.entries(localStorage))') == local_before
    # Erro de transporte não registra sucesso nem repete create automaticamente.
    state['network'] = True
    page.reload()
    page.wait_for_function("document.querySelector('#feedback').textContent.includes('Não foi possível confirmar')")
    assert page.locator('[data-executive-connection]').inner_text() == 'Diário Executivo real'
    state['network'] = False
    state['deny'] = True
    page.reload()
    page.wait_for_function("document.querySelector('#feedback').textContent==='Acesso executivo não autorizado ou indisponível.'")
    assert page.evaluate('(key)=>sessionStorage.getItem(key)', SESSION_KEY) is None
    assert page.locator('#diary-list .entry').count() == 0
    state['deny'] = False
    page.reload()
    page.locator('#executive-key-dialog input').fill(FAKE_KEY)
    page.locator('#executive-key-dialog button[type=submit]').click()
    page.locator('#diary-list .entry').wait_for()
    # Navegar ao demo não mistura nem importa os registros reais.
    page.locator('[data-view=diary] a[href="?diary=local#diary"]').click()
    page.locator('#diary-list .entry').wait_for()
    assert 'LOCAL ONLY' in page.locator('#diary-list').inner_text()
    assert 'Registro atualizado' not in page.locator('#diary-list').inner_text()
    page.locator('#logout-button').click()
    page.wait_for_url('**/index.html')
    assert page.evaluate('(key)=>sessionStorage.getItem(key)', SESSION_KEY) is None
    assert FAKE_KEY not in page.evaluate('JSON.stringify(localStorage)')
    assert not errors, errors
    context.close()
    browser.close()
print('PASS: modal/cancelamento, POST com chave somente na sessão, list/create/update simulados, reload, segregação local/real, falhas e logout.')
