"""Mural vazio, contexto de candidatura e regressão do Diário."""
import functools
import http.server
import json
from pathlib import Path
import threading
import tempfile
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def copyfile(self, source, output):
        try: super().copyfile(source, output)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError): pass

class PendingPromotion(unittest.TestCase):
    @unittest.skip('Promoção DIARIO não implementada: falta operação explícita que grave memória sem alterar a origem.')
    def test_promote_diary(self):
        self.fail('Pendente de implementação autorizada; não simular promoção como funcionalidade real.')

    @unittest.skip('Promoção INPUT não implementada: futura origem deve referenciar o protocolo, sem copiar ou destruir INPUT.')
    def test_promote_input(self):
        self.fail('Pendente de implementação autorizada; não simular promoção como funcionalidade real.')

    @unittest.skip('Contrato completo 30_MEMORIA ainda não implementado: modelo atual valida id/projectId/category, não a tabela POLI.')
    def test_30_memoria_contract(self):
        self.fail('Pendente de adaptador/validação de record_id, categoria, criado_em, titulo, sinopse, source_type, source_id, area_id, status.')

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
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
        config = {'mode':'local','apiUrl':None,'localScenario':'A','timeoutMs':1000,
                  'audit':{'mode':'local','apiUrl':None,'timeoutMs':150}}
        page.route('**/poli-config.js', lambda r: r.fulfill(content_type='application/javascript',body='window.poliConfig='+json.dumps(config)))
        page.goto(base + '/producao.html#memory')
        page.wait_for_url('**/index.html#login')
        page.evaluate("""() => {
          localStorage.setItem('onca-lince.producao.v01.session', JSON.stringify({access:'caio'}));
          localStorage.setItem('onca-lince.producao.v01.memory', 'LEGACY PRESERVED');
        }""")
        page.goto(base + '/producao.html')
        # Preparação existente: normalize preserva referências explícitas e não
        # precisa receber cópia integral da origem. Isto NÃO executa promoção.
        assert page.evaluate("""() => {
          const diary = {id:'diary-origin',body:'Conteúdo não copiado'};
          const input = {id:'input-internal-id',protocol:'IN-TEST-ORIGINAL',synopsis:'Conteúdo não copiado'};
          const before = JSON.stringify([diary,input]);
          const stored = localStorage.getItem('onca-lince.producao.v01.memory');
          const records = [
            {id:'memory-ref',projectId:'p',category:'memory',source_type:'DIARIO',source_id:diary.id},
            {id:'artifact-ref',projectId:'p',category:'artifact',source_type:'INPUT',source_id:input.protocol}
          ];
          const original = JSON.stringify(records);
          const normalized = records.map(r => productionArtifactModel.normalize(r));
          return normalized[0].source_type === 'DIARIO' && normalized[0].source_id === diary.id
            && normalized[1].source_type === 'INPUT' && normalized[1].source_id === input.protocol
            && normalized.every(r => !('body' in r) && !('synopsis' in r) && !('origin' in r))
            && JSON.stringify([diary,input]) === before && JSON.stringify(records) === original
            && localStorage.getItem('onca-lince.producao.v01.memory') === stored;
        }""")
        page.locator('.memory-entry').focus()
        page.keyboard.press('Enter')
        page.locator('[data-view=memory]').wait_for(state='visible')
        for width in [390, 768, 1440, 1920]:
            page.set_viewport_size({'width':width,'height':1000})
            for route in ['memory', 'memories', 'artifacts']:
                page.evaluate('(route) => location.hash = route', route)
                page.wait_for_function('(route) => document.querySelector(`.category-tabs a[href="#${route}"]`).getAttribute("aria-current") === "page"', arg=route)
                assert page.locator('[data-view=memory] form, [data-view=memory] input, [data-view=memory] button, [data-view=memory] select, [data-view=memory] textarea').count() == 0
                assert page.locator('#memory-list').inner_html() == ''
                assert page.locator('#memory-list').bounding_box()['height'] >= 280
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                assert page.locator('#feedback').inner_text() == ''
                if route == 'memory':
                    page.evaluate('scrollTo(0, 0)')
                    page.screenshot(path=str(Path(tempfile.gettempdir()) / f'mural-{width}.png'))
        assert page.evaluate("localStorage.getItem('onca-lince.producao.v01.memory')") == 'LEGACY PRESERVED'
        assert page.evaluate("""() => {
          const m = productionArtifactModel;
          const records = [
            {id:'z', projectId:'p', candidacyId:'a', category:'artifact'},
            {id:'a', projectId:'p', candidacyId:'b', category:'memory'},
            {id:'b', projectId:'p', candidacyId:'a', category:'artifact'},
            {id:'c', projectId:'other', candidacyId:'a', category:'artifact'},
            {id:'d', projectId:'p', category:'memory'}
          ].map(r => m.normalize(r));
          return m.forContext(records,{projectId:'p',candidacyId:'a'}).map(r=>r.id).join(',') === 'z,b'
            && m.forContext(records,{projectId:'p',candidacyId:'b'})[0].id === 'a'
            && m.forContext(records,{projectId:'p'})[0].id === 'd'
            && records.every(r=>r.editorial === null);
        }""")
        # Diário ainda permite criar, editar, pesquisar e excluir.
        page.evaluate("location.hash = 'diary'")
        page.locator('#new-diary').click()
        page.locator('#diary-form [name=title]').fill('Registro de teste')
        page.locator('#diary-form [name=body]').fill('Texto do diário')
        page.locator('#diary-form [type=submit]').click()
        page.locator('#diary-list .entry').wait_for()
        page.locator('#diary-list').get_by_role('button', name='Editar', exact=True).click()
        page.locator('#diary-form [name=title]').fill('Registro editado')
        page.locator('#diary-form [type=submit]').click()
        page.wait_for_function("document.querySelector('#diary-list').textContent.includes('Registro editado')")
        page.locator('#diary-search').fill('inexistente')
        page.wait_for_function("document.querySelectorAll('#diary-list .entry').length === 0")
        page.locator('#diary-search').fill('')
        page.locator('#diary-list').get_by_role('button', name='Excluir Registro editado', exact=True).click()
        page.wait_for_function("document.querySelectorAll('#diary-list .entry').length === 0")
        page.evaluate("localStorage.setItem(productionAuth.key, JSON.stringify({access:'mariana'}))")
        page.reload()
        page.wait_for_function('Boolean(window.poliService?.current())')
        # O cenário A concede abertura de EXEC para ambas as sessões sintéticas.
        assert page.evaluate("poliService.canReadArea('EXEC')")
        assert page.url.endswith('#diary')
        # A política de dados do Diário continua separada da abertura do shell.
        assert not page.evaluate("authorizationService.can('executivo.diario.read')")
        # É a retirada da concessão POLI, não o nome da pessoa, que recusa a rota.
        config['localScenario']='B'
        page.reload()
        page.wait_for_url('**/producao.html#overview')
        assert not page.evaluate("poliService.canReadArea('EXEC')")
        assert page.evaluate("localStorage.getItem('onca-lince.producao.v01.memory')") == 'LEGACY PRESERVED'
        page.locator('.memory-entry').click()
        page.locator('[data-view=memory]').wait_for(state='visible')
        assert page.locator('#memory-list').inner_html() == ''
        page.locator('#profile-button').click()
        assert page.locator('#profile-dialog').is_visible()
        page.get_by_role('button', name='Fechar', exact=True).click()
        page.locator('#logout-button').click()
        page.wait_for_url('**/index.html')
        assert not errors, errors
        browser.close()
        print('PASS: mural vazio, sem entrada, legados preservados, candidatura isolada sem ordenar, quatro larguras, teclado, reduced motion, Diário, perfil, sessão; nenhum pageerror.')
        result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(PendingPromotion))
        assert result.wasSuccessful()
        print('Preparação de proveniência: PASS. Execução DIARIO/INPUT e contrato completo 30_MEMORIA: 3 SKIP justificados.')
finally:
    server.shutdown()
