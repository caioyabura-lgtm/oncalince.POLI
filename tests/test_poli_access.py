"""POLI: somente bootstrap e estado do shell; sem planilha ou dados operacionais reais."""
import functools
import http.server
import json
from pathlib import Path
import threading
import tempfile
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
ORDER = ['EXEC','ART','PROD','TECH','MKT','ADMIN','INTL']
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(reduced_motion='reduce')
        page.set_default_timeout(10000)
        page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('dialog', lambda dialog: dialog.accept())
        config = {'mode':'local','apiUrl':None,'localScenario':'NONE','timeoutMs':100}
        page.route('**/poli-config.js', lambda route: route.fulfill(content_type='application/javascript', body='window.poliConfig = Object.freeze('+json.dumps(config)+');'))
        page.goto(base+'/producao.html')
        page.wait_for_url('**/index.html#login')
        page.evaluate("localStorage.setItem('onca-lince.producao.v01.session',JSON.stringify({access:'mariana'}))")
        sentinels = {'onca-lince.producao.v01.diary':'PRIVATE DIARY','onca-lince.producao.v01.inputs':'PRIVATE INPUT','onca-lince.producao.v01.memory':'PRIVATE MEMORY'}
        page.evaluate('(items)=>Object.entries(items).forEach(([k,v])=>localStorage.setItem(k,v))', sentinels)
        def load(expected):
            page.goto(base+'/producao.html')
            page.wait_for_function('Boolean(window.poliService?.current())')
            page.wait_for_function('(ids)=>JSON.stringify([...document.querySelectorAll(".production-sectors button:not(:disabled)")].map(b=>b.dataset.areaId))===JSON.stringify(ids)', arg=expected)
            assert page.locator('.production-sectors [data-area-id]').evaluate_all('(els)=>els.map(e=>e.dataset.areaId)') == ORDER
            assert page.locator('.portal-gabinete-link').get_attribute('href') == 'gabinete_internacional.html'
            assert page.evaluate('(items)=>Object.entries(items).every(([k,v])=>localStorage.getItem(k)===v)', sentinels)
            assert page.locator('#feedback').inner_text() == ''
        load([])
        assert page.evaluate('poliService.current().user.id') == 'DEMO-mariana'
        config['localScenario']='A'
        load(['EXEC','TECH','INTL'])
        assert page.evaluate("poliService.isAreaAdmin('EXEC') && poliService.canReadArea('TECH') && !poliService.canWriteArea('TECH') && poliService.canWriteArea('INTL') && !poliService.isAreaAdmin('INTL') && !poliService.canReadArea('ART')")
        assert page.evaluate("authorizationService.can('executivo.access')")
        assert not page.evaluate("authorizationService.can('executivo.diario.read')")
        # Não há decisão de abertura por nome/conta: trocar a credencial conserva cenário.
        page.evaluate("localStorage.setItem(productionAuth.key,JSON.stringify({access:'caio'}))")
        load(['EXEC','ART','TECH','INTL'])
        config['localScenario']='B'
        load(['ART'])
        assert page.evaluate("poliService.canWriteArea('ART') && !poliService.isAreaAdmin('ART')")
        page.evaluate("location.hash='executivo'")
        page.wait_for_function("location.hash === '#overview'")
        config['localScenario']='C'
        load([])
        assert not page.evaluate("poliService.canReadArea('PROD') || poliService.canWriteArea('MKT') || poliService.isAreaAdmin('ADMIN')")
        # Nenhum cache de permissões foi gravado no localStorage.
        assert page.evaluate('localStorage.length') == len(sentinels)+1
        config.update(mode='remote',apiUrl=None)
        page.reload()
        page.wait_for_function("document.querySelector('#feedback').textContent.includes('permissões')")
        assert page.locator('.production-sectors button:enabled').count() == 0
        assert page.locator('.production-input').get_attribute('href') == 'input.html'
        # Resposta remota interceptada: servidor real/Apps Script não é conectado.
        payload = {'user':{'id':'USR-TEST','name':'Usuário POLI','email':'private@example.org','status':'ATIVO'},
                   'areas':[{'id':i,'name':i+' Nome','status':'ATIVO','dashboardActive':i not in ['PROD','MKT','ADMIN']} for i in ORDER],
                   'permissions':[{'areaId':'EXEC','level':'ADMIN','active':'NÃO'}, {'areaId':'TECH','level':'WRITE','active':'SIM'}, {'areaId':'ART','level':'ADMIN','userId':'OTHER'}, {'areaId':'INTL','level':'INVALID'}]}
        mode = {'status':200,'delay':False}
        calls=[]
        def api(route):
            calls.append(route.request.url)
            assert route.request.method == 'GET' and not route.request.post_data
            route.fulfill(status=mode['status'],content_type='application/json',body=json.dumps(payload))
        page.route('**/api/poli/bootstrap',api)
        config.update(apiUrl='/api/poli/bootstrap',timeoutMs=10000)
        load(['TECH'])
        assert page.locator('[data-area-id=TECH]').inner_text() == 'TECH Nome'
        assert page.locator('[data-area-id=MKT]').inner_text() == 'Diretoria de Comunicação'
        assert 'private@example.org' not in page.locator('body').inner_text()
        assert page.locator('#session-user').inner_text() == 'Usuário POLI'
        count=len(calls)
        page.evaluate('Promise.all([poliService.getBootstrap(),poliService.getBootstrap()])')
        assert len(calls)==count
        # Estado/status e flags são explícitos, sem truthiness de "NÃO"/"false".
        payload['areas'][3]['dashboardActive']='NÃO'
        load([])
        payload['areas'][3]['dashboardActive']='SIM'
        payload['areas'][3]['status']='INATIVO'
        load([])
        payload['areas'][3]['status']='ATIVO'
        payload['permissions']=[{'areaId':'EXEC','level':'ADMIN'}]
        load(['EXEC'])
        mode['status']=500
        page.evaluate('poliService.getBootstrap({refresh:true}).catch(()=>null)')
        assert page.locator('.production-sectors button:enabled').count()==0
        assert not page.evaluate("poliService.canReadArea('EXEC')")
        page.reload()
        page.wait_for_function("document.querySelector('#feedback').textContent.includes('permissões')")
        for width,height in [(1366,768),(1920,1080),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.screenshot(path=str(Path(tempfile.gettempdir()) / f'poli-fallback-{width}.png'),full_page=True)
        mode['status']=200
        payload['user']['status']='INATIVO'
        page.reload()
        page.wait_for_url('**/index.html#login')
        assert page.evaluate("localStorage.getItem('onca-lince.producao.v01.session')") is None
        assert page.evaluate('(items)=>Object.entries(items).every(([k,v])=>localStorage.getItem(k)===v)',sentinels)
        # Consulta em voo não pode recuperar concessões após troca da sessão.
        page.evaluate("localStorage.setItem('onca-lince.producao.v01.session',JSON.stringify({access:'caio'}))")
        payload['user']['status']='ATIVO'
        load(['EXEC'])
        assert page.evaluate('''async () => {
          const previous=fetch;
          let finish;
          window.fetch=()=>new Promise(resolve=>{finish=resolve;});
          const task=poliService.getBootstrap({refresh:true}).then(()=>false,()=>true);
          await Promise.resolve();
          await productionAuth.signOut();
          localStorage.setItem(productionAuth.key,JSON.stringify({access:'mariana'}));
          finish({ok:true,status:200,json:async()=>({user:{id:'OLD',name:'Old',status:'ATIVO'},areas:[],permissions:[]})});
          const rejected=await task;
          window.fetch=previous;
          return rejected && !poliService.canReadArea('EXEC');
        }''')
        assert not errors,errors
        browser.close()
        print('PASS: cenários A/B/C/NONE, hierarquia READ/WRITE/ADMIN, status/flags, identidade POLI, fallback, cache em memória, revogação, sessão em voo, dados preservados, responsividade. Remoto somente interceptado.')
finally:
    server.shutdown()
