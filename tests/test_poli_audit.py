"""Auditoria de acesso: navegador real, identidade e endpoints somente de teste."""
import functools
import hashlib
import http.server
import json
from pathlib import Path
import re
import threading
import time
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
        page = browser.new_page(reduced_motion='reduce')
        page.set_default_timeout(8000)
        page.route('**/*', lambda r: r.continue_() if r.request.url.startswith(base) else r.abort())
        # Credencial exclusiva de teste: validação PBKDF2 real, sem senhas de pessoas.
        auth = (ROOT / 'auth.js').read_text(encoding='utf-8')
        digest = hashlib.pbkdf2_hmac('sha256', b'audit-test-only', b'onca-lince.v01.mariana', 100000).hex()
        auth = re.sub(r"(mariana: \{ name: '[^']+', hash: ')[^']+", lambda m: m[1]+digest, auth)
        page.route('**/auth.js', lambda r: r.fulfill(content_type='application/javascript', body=auth))
        config = {'mode':'local','apiUrl':None,'localScenario':'A','timeoutMs':1000,
                  'audit':{'mode':'local','apiUrl':None,'timeoutMs':150}}
        page.route('**/poli-config.js', lambda r: r.fulfill(content_type='application/javascript', body='window.poliConfig='+json.dumps(config)))
        events, errors, warnings, requests = [], [], [], []
        def console(msg):
            if msg.text.startswith('[AUDIT LOCAL] '): events.append(json.loads(msg.text.removeprefix('[AUDIT LOCAL] ')))
            if msg.text.startswith('[AUDIT]'): warnings.append(msg.text)
        page.on('console', console)
        page.on('pageerror', lambda e: errors.append(str(e)))
        def count(t, area=None): return sum(e['type']==t and (area is None or e['areaId']==area) for e in events)
        def entry():
            page.goto(base+'/index.html')
            page.add_script_tag(url=base+'/auth.js')
        def login():
            return page.evaluate("productionAuth.signIn('mariana','audit-test-only')")
        def shell():
            page.goto(base+'/producao.html')
            page.wait_for_function('Boolean(window.poliService?.current())')
        def workspace(area):
            page.goto(base+'/gabinete-interno.html?area='+area)
            page.wait_for_function("Boolean(window.poliService?.current())")
        entry()
        assert events == []
        assert page.evaluate("productionAuth.signIn('mariana','wrong').then(()=>false,()=>true)")
        assert events == []
        sessions = page.evaluate("Promise.all([productionAuth.signIn('mariana','audit-test-only'),productionAuth.signIn('mariana','audit-test-only')])")
        sid = sessions[0]['sessionId']
        assert sid.startswith('SES-') and sessions[1]['sessionId']==sid
        assert count('LOGIN_SUCCESS')==1, (events,warnings,page.evaluate('({config:window.poliConfig,service:!!window.auditService})'))
        assert events[0]['userId']=='DEMO-mariana' and events[0]['sessionId']==sid
        print('Login unico | PASS', flush=True)
        # Valores sentinela não devem ser escritos nem incluídos em eventos.
        sentinels={'onca-lince.producao.v01.diary':'PRIVATE DIARY','onca-lince.producao.v01.inputs':'PRIVATE INPUT','onca-lince.producao.v01.memory':'PRIVATE MEMORY'}
        page.evaluate('(x)=>Object.entries(x).forEach(([k,v])=>localStorage.setItem(k,v))',sentinels)
        shell()
        assert count('LOGIN_SUCCESS')==1 and count('AREA_OPEN')==0
        assert page.evaluate('productionAuth.current().sessionId')==sid
        page.locator('[data-area-id=TECH]').click()
        page.wait_for_url('**/gabinete-interno.html?area=diretoria_tecnica')
        page.wait_for_function("Boolean(window.poliService?.current())")
        assert count('AREA_OPEN','TECH')==1
        assert page.evaluate("poliService.canReadArea('TECH') && !poliService.canWriteArea('TECH')")
        print('TECH autorizado | PASS', flush=True)
        page.evaluate("auditService.transition('TECH'); auditService.transition('TECH'); location.hash='diario'")
        page.wait_for_function("!document.querySelector('[data-gabinete-view=diario]').hidden")
        assert count('AREA_OPEN','TECH')==1
        shell()
        page.locator('[data-area-id=TECH]').click()
        page.wait_for_url('**/gabinete-interno.html?area=diretoria_tecnica')
        page.wait_for_function("Boolean(window.poliService?.current())")
        assert count('AREA_OPEN','TECH')==2
        print('Duplicacao de AREA_OPEN | PASS', flush=True)
        # Scenario A: exercise real destination and rejected direct route.
        shell()
        assert page.evaluate("poliService.canWriteArea('INTL') && !poliService.isAreaAdmin('INTL')")
        page.locator('[data-area-id=INTL]').click()
        page.wait_for_url('**/gabinete-interno.html')
        page.wait_for_function("Boolean(window.poliService?.current())")
        assert count('AREA_OPEN','INTL')==1
        print('INTL autorizado | PASS', flush=True)
        shell()
        assert page.locator('[data-area-id=ART]').is_disabled()
        before=count('AREA_OPEN')
        page.locator('[data-area-id=ART]').dispatch_event('click')
        assert page.url==base+'/producao.html'
        workspace('arte_performance')
        assert page.locator('#workspace h1').count()==0
        assert count('AREA_OPEN','ART')==0 and count('AREA_OPEN')==before
        print('ART bloqueado | PASS', flush=True)
        config['localScenario']='B'
        shell()
        assert page.locator('[data-area-id=TECH]').is_disabled()
        workspace('diretoria_tecnica')
        assert 'não tem acesso' in page.locator('#workspace').inner_text()
        assert count('AREA_OPEN','TECH')==2
        shell()
        page.locator('[data-area-id=ART]').click()
        page.wait_for_url('**/gabinete-interno.html?area=arte_performance')
        page.wait_for_function("Boolean(window.poliService?.current())")
        assert count('AREA_OPEN','ART')==1
        assert page.evaluate("poliService.canWriteArea('ART')")
        print('ART autorizado | PASS', flush=True)
        # Unmodified scenario C: grants exist but all their dashboards are inactive.
        config['localScenario']='C'
        shell()
        before=count('AREA_OPEN')
        for area in ['PROD','MKT','ADMIN']:
            assert page.evaluate('(id)=>poliService.current().permissions.some(p=>p.areaId===id)',area)
            assert page.evaluate('(id)=>poliService.current().areas.find(a=>a.id===id).dashboardActive===false',area)
            button=page.locator('[data-area-id='+area+']')
            assert button.is_disabled()
            button.dispatch_event('click')
            assert page.url==base+'/producao.html'
            assert not page.evaluate('(id)=>auditService.log({type:"AREA_OPEN",areaId:id})',area)
        assert count('AREA_OPEN')==before
        print('Dashboard inativo | PASS', flush=True)
        # Dashboard false mesmo com permissão: fixture altera TECH, uma rota real.
        local = (ROOT/'poli-local.js').read_text(encoding='utf-8')
        page.route('**/poli-local.js', lambda r: r.fulfill(content_type='application/javascript',body=local+"\nconst fixtureBootstrap=poliLocalBootstrap;window.poliLocalBootstrap=(...args)=>{const b=fixtureBootstrap(...args);return {...b,areas:b.areas.map(a=>({...a,dashboardActive:false}))};};"))
        config['localScenario']='A'
        workspace('diretoria_tecnica')
        assert 'não tem acesso' in page.locator('#workspace').inner_text()
        assert count('AREA_OPEN','TECH')==2
        page.unroute('**/poli-local.js')
        shell()
        # EXEC: transição de workspace, inclusive rota direta; abas não duplicam.
        page.evaluate("location.hash='executivo'")
        page.wait_for_function("!document.querySelector('[data-view=executivo]').hidden")
        assert count('AREA_OPEN','EXEC')==1
        page.evaluate("dispatchEvent(new HashChangeEvent('hashchange')); location.hash='diary'")
        page.wait_for_function("!document.querySelector('[data-view=diary]').hidden")
        assert count('AREA_OPEN','EXEC')==1
        page.evaluate("location.hash='overview'")
        page.wait_for_function("!document.querySelector('[data-view=overview]').hidden")
        page.evaluate("location.hash='executivo'")
        page.wait_for_function("!document.querySelector('[data-view=executivo]').hidden")
        assert count('AREA_OPEN','EXEC')==2
        assert not page.evaluate("auditService.log({type:'DIARY_CREATE'})")
        assert not page.evaluate("auditService.log({type:'AREA_OPEN',areaId:'EXEC',details:'PRIVATE DIARY'})")
        assert not page.evaluate("auditService.log({type:'AREA_OPEN',areaId:'PROD'})")
        page.evaluate('Promise.all([productionAuth.signOut(),productionAuth.signOut()])')
        assert count('LOGOUT')==1 and events[-1]['sessionId']==sid
        print('Logout | PASS', flush=True)
        assert page.evaluate('productionAuth.current()') is None
        assert page.evaluate('(x)=>Object.entries(x).every(([k,v])=>localStorage.getItem(k)===v)',sentinels)
        # Uma sessão nova recebe outro ID; invalidação automática não é logout voluntário.
        entry(); new=login(); assert new['sessionId']!=sid and count('LOGIN_SUCCESS')==2
        page.evaluate('productionAuth.signOut({audit:false})')
        assert count('LOGOUT')==1
        # Remoto interceptado: contrato mínimo, resposta confirmada ou falha limitada.
        config['audit'].update(mode='remote',apiUrl='/api/audit')
        status={'value':200}
        def api(r):
            payload=json.loads(r.request.post_data)
            assert r.request.method=='POST'
            assert set(payload)=={'type','areaId','entityType','entityId','details'}
            assert payload['entityType']==payload['entityId']==payload['details']==''
            requests.append(payload)
            r.fulfill(status=status['value'],content_type='application/json',body='{"ok":true}')
        page.route('**/api/audit',api)
        entry(); login(); assert requests[-1]['type']=='LOGIN_SUCCESS'
        shell(); page.locator('[data-area-id=TECH]').click()
        page.wait_for_url('**/gabinete-interno.html?area=diretoria_tecnica')
        page.wait_for_function('Boolean(window.poliService?.current())')
        page.wait_for_timeout(200)
        assert requests[-1]['type']=='AREA_OPEN' and requests[-1]['areaId']=='TECH'
        page.locator('#logout-button').click(); page.wait_for_url('**/index.html')
        assert requests[-1]['type']=='LOGOUT'
        status['value']=503
        entry(); assert login()['sessionId']
        shell(); page.locator('[data-area-id=TECH]').click()
        page.wait_for_url('**/gabinete-interno.html?area=diretoria_tecnica')
        page.wait_for_function('Boolean(window.poliService?.current())')
        page.locator('#logout-button').click(); page.wait_for_url('**/index.html')
        assert page.evaluate("localStorage.getItem('onca-lince.producao.v01.session')") is None
        # Fetch que nunca resolve: timeout deve concluir logout mesmo sem respeitar abort.
        entry(); login()
        page.evaluate('() => { window.fetch=()=>new Promise(()=>{}); }')
        started=time.monotonic()
        page.evaluate('productionAuth.signOut()')
        assert time.monotonic()-started<2 and page.evaluate('productionAuth.current()') is None
        # Falha no próprio carregamento da auditoria também não impede autenticação.
        config['audit'].update(mode='local',apiUrl=None)
        page.route('**/audit-service.js', lambda r: r.abort())
        entry(); assert login()['sessionId']
        shell()
        page.locator('[data-area-id=TECH]').click()
        page.wait_for_url('**/gabinete-interno.html?area=diretoria_tecnica')
        page.wait_for_function('Boolean(window.poliService?.current())')
        assert not page.evaluate('Boolean(window.auditService)')
        assert page.locator('[data-gabinete-view=dashboard]').is_visible()
        page.locator('#logout-button').click()
        page.wait_for_url('**/index.html')
        assert page.evaluate("localStorage.getItem('onca-lince.producao.v01.session')") is None
        assert warnings and not errors,errors
        print('Falha do auditService | PASS', flush=True)
        assert all(set(e)=={'type','areaId','entityType','entityId','details','userId','sessionId'} for e in events)
        assert all('PRIVATE' not in json.dumps(e) for e in events)
        assert page.evaluate('localStorage.length')==len(sentinels)
        browser.close()
        print('PASS: login único, TECH/ART/EXEC, recusas, dashboard false, transições, logout único, identidade, privacidade, falhas e timeout. Remoto somente interceptado.')
        print('Casos solicitados: 9 | Aprovados: 9 | Falhas: 0')
finally:
    server.shutdown()
