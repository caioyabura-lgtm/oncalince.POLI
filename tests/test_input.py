"""Regressão do INPUT local. Executar: python tests/test_input.py"""
import functools
import http.server
import json
from pathlib import Path
import threading
import tempfile
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_default_timeout(10000)
        page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
        page.on('dialog', lambda dialog: dialog.accept())
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base + '/input.html')
        page.wait_for_url('**/index.html#login')
        page.evaluate("localStorage.setItem('onca-lince.producao.v01.session', JSON.stringify({access:'mariana',name:'FAKE',email:'fake@example.org'}))")
        page.goto(base + '/input.html')
        page.locator('#input-form').wait_for(state='visible')
        assert page.locator('#input-user').inner_text() == 'Mariana Tiago'
        assert page.locator('input[name=author], input[name=email], input[name=userId]').count() == 0
        page.locator('[name=title]').fill('Teste de entrada')
        page.locator('[name=synopsis]').fill('Um parágrafo.\n\nOutra linha.')
        assert '\n' not in page.locator('[name=synopsis]').input_value()
        page.locator('[name=synopsis]').press('Enter')
        assert '\n' not in page.locator('[name=synopsis]').input_value()
        page.locator('[name=licenseCategory][value=registro]').check()
        page.locator('[name=licenseCategory][value=referencia]').check()
        assert page.locator('[name=licenseCategory]:checked').count() == 1
        page.locator('[type=submit]').click()
        assert 'link' in page.locator('#input-feedback').inner_text()
        assert page.locator('[name=title]').input_value() == 'Teste de entrada'
        page.locator('#file-picker').set_input_files([
            {'name':'roteiro.txt','mimeType':'text/plain','buffer':b'text'},
            {'name':'foto.jpg','mimeType':'image/jpeg','buffer':b'image'},
            {'name':'programa.exe','mimeType':'application/octet-stream','buffer':b'exe'}])
        assert page.locator('#selected-files li').count() == 2
        assert 'programa.exe' in page.locator('#input-feedback').inner_text()
        page.get_by_role('button', name='Remover foto.jpg', exact=True).click()
        assert page.locator('#selected-files li').count() == 1
        page.locator('[type=submit]').click()
        page.locator('#input-confirmation').wait_for(state='visible')
        records = page.evaluate('JSON.parse(localStorage.getItem(inputService.key))')
        record = records[0]
        assert page.locator('[name=patch], #patch-options').count() == 0
        assert record['initialAreaId'] == 'EXEC' and 'patch' not in record
        assert record['protocol'].startswith('IN-') and '-LOCAL-' in record['protocol']
        assert record['createdAt'] and record['userId'] == 'mariana'
        assert record['userName'] == 'Mariana Tiago' and record['userEmail'] is None
        assert record['licenseTermsVersion'] == 'draft-0.1' and record['licenseAcceptedAt'] is None
        assert record['receiptStatus'] == 'pending' and record['status'] == 'RECEBIDO'
        assert record['files'][0]['storageReference'] is None and len(record['files']) == 1
        assert record['protocol'] in page.locator('#confirmation-content').inner_text()
        page.locator('#new-input').click()
        assert page.locator('[name=title]').input_value() == ''
        assert page.locator('#selected-files li').count() == 0
        page.locator('[name=title]').fill('Link apenas')
        page.locator('[name=synopsis]').fill('Referência externa')
        page.locator('[name=link]').fill('https://example.org/material')
        page.locator('[name=licenseCategory][value=proposta]').check()
        page.locator('[type=submit]').click()
        page.locator('#input-confirmation').wait_for(state='visible')
        assert page.evaluate('JSON.parse(localStorage.getItem(inputService.key)).length') == 2
        assert page.evaluate('JSON.parse(localStorage.getItem(inputService.key))[1].files.length') == 0
        # Service validation cannot be bypassed by skipping the HTML form.
        failures = page.evaluate('''async () => {
          const valid = {title:'T', synopsis:'S', link:'https://example.org', licenseCategory:'acervo', patch:'marketing'};
          const invalid = [{title:''}, {synopsis:''}, {title:'x'.repeat(201)}, {synopsis:'x'.repeat(601)}, {link:'javascript:alert(1)'}, {licenseCategory:''}, {link:''}];
          return Promise.all(invalid.map(async change => {try {await inputService.create({...valid,...change});return false;} catch {return true;}}));
        }''')
        assert all(failures)
        # Client-supplied routing cannot bypass the executive inbox.
        assert page.evaluate('''async () => {
          const saved = await inputService.create({title:'Forced destination',synopsis:'S',link:'https://example.org',licenseCategory:'acervo',patch:'marketing',initialAreaId:'TECH'});
          const valid = saved.initialAreaId === 'EXEC' && !('patch' in saved);
          localStorage.setItem(inputService.key,JSON.stringify(JSON.parse(localStorage.getItem(inputService.key)).filter(r=>r.id!==saved.id)));
          return valid;
        }''')
        # Preserve legacy records, permissions, and deep links.
        legacy = {'id':'legacy', 'title':'Anterior', 'submittedBy':'ricarda', 'date':'2026-01-01', 'createdAt':'2026-01-01T12:00:00Z', 'author':'Ricarda', 'description':'Texto anterior', 'type':'Texto', 'tags':['antigo'], 'licensing':{'option':'specific','conditions':'Condição original','declaration':'Declaração original'}}
        page.evaluate('(r) => {const a=JSON.parse(localStorage.getItem(inputService.key)); a.push(r); localStorage.setItem(inputService.key,JSON.stringify(a));}', legacy)
        assert page.evaluate('(async()=> (await inputService.list()).length)()') == 2
        page.evaluate("localStorage.setItem(productionAuth.key, JSON.stringify({access:'caio'}))")
        page.add_script_tag(url=base+'/area-workspaces.js')
        assert page.evaluate('(async()=> (await inputService.listForArea("producao_executiva")).length)()') == 3
        assert page.evaluate('(async()=> (await inputService.listForArea("gabinete_internacional")).length)()') == 0
        page.goto(base + '/input.html#legacy')
        page.reload()
        page.locator('#legacy').wait_for()
        assert page.locator('#legacy details').get_attribute('open') is not None
        assert 'Condição original' in page.locator('#legacy').inner_text()
        assert page.locator('#input-list-title').inner_text() == 'Inputs recebidos'
        page.screenshot(path=str(Path(tempfile.gettempdir()) / 'input-desktop.png'), full_page=True)
        # Storage error retains form, and corrupt records are never overwritten.
        page.evaluate("localStorage.setItem(inputService.key, 'corrupt')")
        page.locator('[name=title]').fill('Preservar')
        page.locator('[name=synopsis]').fill('Sinopse')
        page.locator('[name=link]').fill('https://example.org')
        page.locator('[name=licenseCategory][value=registro]').check()
        page.locator('[type=submit]').click()
        assert page.locator('[name=title]').input_value() == 'Preservar'
        assert page.evaluate('localStorage.getItem(inputService.key)') == 'corrupt'
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(Path(tempfile.gettempdir()) / 'input-mobile.png'), full_page=True)
        page.evaluate('localStorage.removeItem(productionAuth.key)')
        assert page.evaluate('(async()=>{try {await inputService.create({});return false;}catch{return true;}})()')
        page.goto(base + '/input.html')
        page.wait_for_url('**/index.html#login')
        page.evaluate("localStorage.setItem('onca-lince.producao.v01.session', JSON.stringify({access:'caio'}))")
        page.goto(base + '/producao.html')
        page.locator('.production-input').wait_for()
        assert page.locator('.production-input').get_attribute('href') == 'input.html'
        page.locator('[data-area-id=EXEC]').click()
        page.locator('[data-view=executivo] a[href="#diary"]').click()
        page.locator('#new-diary').wait_for(state='visible')
        assert not errors, errors
        browser.close()
        print('PASS: acesso, identidade, campos, sinopse, arquivos, categorias, PATCH, validação, protocolos, confirmação, persistência, legados, permissões, erros e mobile; nenhum pageerror.')
finally:
    server.shutdown()
