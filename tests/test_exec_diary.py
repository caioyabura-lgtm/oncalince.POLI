"""Limpeza e contrato executivo; navegador e Sheets simulados, nenhuma API real."""
import mimetypes
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://caioyabura-lgtm.github.io/oncalince.POLI/'
KEY = 'onca-lince.producao.v01.diary'
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    private_requests = []
    def serve(route):
        if not route.request.url.startswith(BASE):
            private_requests.append(route.request.url)
            return route.abort()
        file = (ROOT / urlparse(route.request.url).path.removeprefix('/oncalince.POLI/')).resolve()
        if not file.is_relative_to(ROOT) or not file.is_file():
            private_requests.append(route.request.url)
            return route.fulfill(status=404, body='')
        route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    page.route('**/*', serve)
    page.goto(BASE+'producao.html')
    page.wait_for_url('**/index.html#login')
    page.evaluate("localStorage.setItem('onca-lince.producao.v01.session',JSON.stringify({access:'caio'}))")
    page.goto(BASE+'producao.html#diary')
    page.locator('#new-diary').click()
    page.locator('#diary-form [name=title]').fill('asdfasdf')
    page.locator('#diary-form [name=body]').fill('asdfasdfasdfasdf')
    page.locator('#diary-form [type=submit]').click()
    page.locator('#diary-list .entry').wait_for()
    page.evaluate("""() => {
      localStorage.setItem('sentinel', 'keep');
      localStorage.setItem('onca-lince.producao.v01.diary.diretoria_tecnica','keep');
      localStorage.setItem('onca-lince.producao.v01.inputs','[]');
      sessionStorage.setItem('sentinel', 'keep');
    }""")
    before = page.evaluate('Object.fromEntries(Object.entries(localStorage))')
    session_before = page.evaluate('Object.fromEntries(Object.entries(sessionStorage))')
    page.once('dialog', lambda dialog: dialog.dismiss())
    page.locator('#clear-demo-diary').click()
    assert page.evaluate('Object.fromEntries(Object.entries(localStorage))') == before
    page.once('dialog', lambda dialog: dialog.accept())
    page.locator('#clear-demo-diary').click()
    page.wait_for_function("document.querySelector('#feedback').textContent === 'Dados demonstrativos removidos.'")
    assert page.evaluate('Object.fromEntries(Object.entries(localStorage))') == {k:v for k,v in before.items() if k != KEY}
    assert page.evaluate('Object.fromEntries(Object.entries(sessionStorage))') == session_before
    assert page.locator('#diary-list .entry').count() == 0
    assert page.locator('#executive-count').text_content() == '0 REGISTROS DO DIÁRIO'
    page.evaluate("location.hash='executivo'")
    page.wait_for_function("document.querySelector('#executive-diary-mode').textContent === 'Demonstração hospedada'")
    # Apps Script executado com Sheets em memória; entradas públicas continuam fechadas.
    backend = (ROOT.parent/'POLI_EXECUTIVO_BACKEND_PREPARACAO'/'Code.gs').read_text(encoding='utf-8')
    assert page.evaluate("""source => {
      const rows=[['diary_id','user_id','criado_em','titulo','registro','tipo','status','tags']];
      const sheet={getLastRow:()=>rows.length,getRange:(r,c,n,w)=>({getValues:()=>rows.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+w)),setValues:values=>{rows[r-1]=values[0];}})};
      let opened=0;
      const SpreadsheetApp={openById:()=>{opened++;return {getSheetByName:name=>{if(name!=='DIARIO_EXECUTIVO')throw Error();return sheet;}}},flush:()=>{}};
      const PropertiesService={getScriptProperties:()=>({getProperty:()=> 'private-mock'})};
      const LockService={getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})};
      const Utilities={getUuid:()=>crypto.randomUUID()};
      const ContentService={MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})};
      const api=Function('SpreadsheetApp','PropertiesService','LockService','Utilities','ContentService', source+';return {executeDiary_,doPost,requireExecutivePrincipal_};')(SpreadsheetApp,PropertiesService,LockService,Utilities,ContentService);
      if(api.doPost({postData:{contents:'{}'}}).ok || opened) return false;
      try{api.requireExecutivePrincipal_({},'list');return false;}catch{}
      const principal={userId:'SERVER-USER',permissions:['executivo.diario.read','executivo.diario.write']};
      const data={titulo:'Teste',registro:'Texto',tipo:'ideia',status:'aberto',tags:[],user_id:'FORGED',criado_em:'1900',diary_id:'FORGED'};
      const created=api.executeDiary_({operation:'create',data},principal);
      if(created.user_id!=='SERVER-USER'||created.criado_em==='1900'||!created.diary_id.startsWith('EXD-'))return false;
      const updated=api.executeDiary_({operation:'update',id:created.diary_id,data:{...data,titulo:'Novo'}},principal);
      if(updated.user_id!==created.user_id||updated.criado_em!==created.criado_em||updated.diary_id!==created.diary_id||updated.titulo!=='Novo')return false;
      if(api.executeDiary_({operation:'list'},principal).length!==1)return false;
      if(api.executeDiary_({operation:'list'},{...principal,userId:'OTHER'}).length!==0)return false;
      try{api.executeDiary_({operation:'update',id:created.diary_id,data},{...principal,userId:'OTHER'});return false;}catch{}
      for(const area of ['PROD','TECH','ART','INTL']){
        try{api.executeDiary_({operation:'list'},{userId:'OTHER',permissions:[area+'.ADMIN']});return false;}catch{}
      }
      return true;
    }""", backend)
    # Botão ausente no modo local; nenhuma publicação/requisição privada.
    page.route('**/poli-config.js', lambda route: route.fulfill(content_type='application/javascript', body="window.poliConfig={mode:'local',localScenario:'A'};"))
    page.reload()
    assert page.locator('#clear-demo-diary').is_hidden()
    assert not errors, errors
    assert not [url for url in private_requests if '/private' in url or '/api/' in url], private_requests
    browser.close()
print('PASS: limpeza confirmada/cancelada, armazenamento preservado, dashboard zero, preparação backend histórica fechada, create/list/update e isolamento de identidade/areas (mocks).')
