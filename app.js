(() => {
  const STORAGE_KEY = 'adc_by_inter4_v01'; // mantém compatibilidade com v0.1/v0.2
  const IDB_NAME = 'adc_studio_offline_db';
  const IDB_STORE = 'state';
  const IDB_KEY = 'main';

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(IDB_NAME,1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(IDB_STORE))db.createObjectStore(IDB_STORE);};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function idbGet(){
    try{const db=await openDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(IDB_STORE,'readonly');const r=tx.objectStore(IDB_STORE).get(IDB_KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}catch(e){return null;}
  }
  async function idbSet(value){
    try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(value,IDB_KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}catch(e){console.warn('IndexedDB save failed',e);}
  }
  const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4);
  const qs = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];
  const app = qs('#app');
  const photoInput = qs('#photoInput');
  const importInput = qs('#importInput');

  const demoAssets = ['assets/demo_1.jpg','assets/demo_2.jpg','assets/demo_3.jpg','assets/demo_4.jpg','assets/demo_5.jpg','assets/demo_6.jpg'];
  const DEFAULT_ROOMS = ['Sala','Cozinha','Quarto','Casa de Banho','Exterior'];
  const UNASSIGNED_ROOM = 'Sem divisão';
  const defaultData = {
    projects:[
      {id:'demo1',name:'Apartamento Lisboa',client:'Família Silva',location:'Lisboa',type:'Cozinha + Sala',status:'Em desenvolvimento',notes:'Projeto contemporâneo, funcional e acolhedor, com materiais naturais e integração de espaços.',created:'2026-10-20',coverAsset:'assets/demo_1.jpg',photos:[],pages:[{id:uid(),layout:'cover',title:'Apartamento Lisboa',subtitle:'Proposta de interiores e mobiliário'}]},
      {id:'demo2',name:'Moradia Cascais',client:'Família Costa',location:'Cascais',type:'Sala + Cozinha',status:'Conceito',notes:'Ambiente luminoso, confortável e intemporal.',created:'2026-10-18',coverAsset:'assets/demo_2.jpg',photos:[],pages:[{id:uid(),layout:'cover',title:'Moradia Cascais',subtitle:'Interiores contemporâneos'}]},
      {id:'demo3',name:'Apartamento Porto',client:'Cliente demonstração',location:'Porto',type:'Remodelação total',status:'Apresentação',notes:'Projeto demonstrativo ADC Studio.',created:'2026-10-16',coverAsset:'assets/demo_3.jpg',photos:[],pages:[{id:uid(),layout:'cover',title:'Apartamento Porto',subtitle:'Proposta de interiores'}]},
      {id:'demo4',name:'Moradia Braga',client:'Cliente demonstração',location:'Braga',type:'Sala de Estar',status:'Conceito',notes:'Projeto demonstrativo para validar a organização da aplicação.',created:'2026-10-15',coverAsset:'assets/demo_4.jpg',photos:[],pages:[{id:uid(),layout:'cover',title:'Moradia Braga',subtitle:'Sala de Estar'}]},
      {id:'demo5',name:'Escritório Aveiro',client:'Empresa Demo',location:'Aveiro',type:'Escritório',status:'Em desenvolvimento',notes:'Zona de trabalho e reunião.',created:'2026-10-14',coverAsset:'assets/demo_5.jpg',photos:[],pages:[{id:uid(),layout:'cover',title:'Escritório Aveiro',subtitle:'Projeto de interiores'}]},
      {id:'demo6',name:'Apartamento Algarve',client:'Cliente demonstração',location:'Algarve',type:'Habitação',status:'Conceito',notes:'Ambiente leve e natural.',created:'2026-10-12',coverAsset:'assets/demo_6.jpg',photos:[],pages:[{id:uid(),layout:'cover',title:'Apartamento Algarve',subtitle:'Interiores'}]}
    ]
  };

  let data = normalize(load());
  let route = {screen:'welcome', projectId:null, tab:'overview'};
  let projectSearch = '';
  let photoFilter = 'Todas';
  let builderPageId = null;
  let presentationIndex = 0;
  let editor = {projectId:null,photoId:null,tool:'draw',color:'#ef3f32',canvas:null,ctx:null,img:null,drawing:false,start:null,snapshot:null,history:[]};

  function load(){
    try{ const raw=localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : structuredClone(defaultData); }
    catch(e){ return structuredClone(defaultData); }
  }
  function normalize(d){
    if(!d || !Array.isArray(d.projects)) d=structuredClone(defaultData);
    d.deletedProjects=Array.isArray(d.deletedProjects)?d.deletedProjects:[];
    d.brand=Object.assign({adcLogo:'',inter4Logo:''},d.brand||{});
    d.modelDefaults=Object.assign({
      coverTagline:'INTERIOR DESIGN | MOBILIÁRIO',
      service1Title:'INTERIOR\nDESIGN',
      service1Text:'Projetamos espaços que inspiram, proporcionam conforto e praticidade.',
      service2Title:'MOBILIÁRIO\nÀ MEDIDA',
      service2Text:'Desenhamos, produzimos e integramos soluções de mobiliário pensadas para cada espaço.',
      sectionTitle:'Visualização 3D',
      rightsText:'Imagens com direitos reservados e propriedade de ADC Studio • inter4 mobiliário',
      stripRights:'DIREITOS RESERVADOS ADC STUDIO • INTER4 MOBILIÁRIO'
    },d.modelDefaults||{});
    d.company=Object.assign({email:'',address:'',phone:'',website:'',contact1Name:'',contact1Role:'',contact1Phone:'',contact2Name:'',contact2Role:'',contact2Phone:''},d.company||{});
    if(!d.company.email)d.company.email='geral@inter4.com.pt';
    if(!d.company.address)d.company.address='Rua das Moutadas, 125 • 4590-045 Carvalhosa';
    if(!d.company.phone)d.company.phone='255 965 743';
    d.projects.forEach((p,i)=>{
      p.photos=Array.isArray(p.photos)?p.photos:[];
      p.photos.forEach((ph,idx)=>{ if(!ph.room||ph.room==='Geral') ph.room=UNASSIGNED_ROOM; if(!ph.label) ph.label='Fotografia'; if(ph.includeInPresentation===undefined) ph.includeInPresentation=true; if(!ph.orientation&&ph.width&&ph.height) ph.orientation=ph.width>ph.height*1.08?'landscape':ph.height>ph.width*1.08?'portrait':'square'; if(!Number.isFinite(Number(ph.presentationOrder))) ph.presentationOrder=idx+1; });
      normalizePhotoOrder(p);
      if(p.coverPhotoId && !p.photos.some(ph=>ph.id===p.coverPhotoId)) p.coverPhotoId=null;
      const fromPhotos=[...new Set(p.photos.map(ph=>ph.room).filter(r=>r&&r!==UNASSIGNED_ROOM))];
      p.rooms=Array.isArray(p.rooms)&&p.rooms.length?[...new Set(p.rooms.map(r=>String(r).trim()).filter(Boolean))]:[...DEFAULT_ROOMS];
      fromPhotos.forEach(r=>{if(!p.rooms.includes(r))p.rooms.push(r);});
      p.pages=Array.isArray(p.pages)&&p.pages.length?p.pages:[{id:uid(),layout:'cover',title:p.name||'Projeto',subtitle:'Proposta de interiores e mobiliário'}];
      p.coverAsset=p.coverAsset||demoAssets[i%demoAssets.length];
      p.status=p.status||'Em desenvolvimento';
      p.notes=p.notes||'';
      if(!p.presentationTheme||p.presentationTheme==='warm')p.presentationTheme='official';
      if(!p.presentationPreset||p.presentationPreset==='signature')p.presentationPreset='official';
      p.presentationTemplate=p.presentationTemplate||'official';
      if(p.presentationPreset==='official'){p.presentationTemplate='official';p.presentationTheme='official';}
      p.presentationDensity=p.presentationDensity||'balanced';
      p.presentationTitle=p.presentationTitle||p.name||'Projeto';
      p.presentationSubtitle=p.presentationSubtitle||[p.type,p.location].filter(Boolean).join(' • ')||'Proposta de interiores e mobiliário';
      p.presentationConcept=p.presentationConcept||p.notes||'Proposta de interiores desenvolvida para criar um espaço funcional, equilibrado e intemporal.';
      p.presentationPoints=Array.isArray(p.presentationPoints)&&p.presentationPoints.length?p.presentationPoints:['Conforto e funcionalidade','Ambiente intemporal','Soluções pensadas para o cliente'];
      p.presentationClosing=p.presentationClosing||'Do conceito à apresentação, interiores pensados ao detalhe.';
    });
    return d;
  }
  function save(){
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }catch(e){ console.warn('localStorage full; using IndexedDB',e); }
    idbSet(data);
  }
  function project(){ return data.projects.find(p=>p.id===route.projectId); }
  function photoById(p,id){ return p.photos.find(ph=>ph.id===id); }
  function orderedPhotos(p,selectedOnly=false){
    const list=[...(p.photos||[])].sort((a,b)=>(Number(a.presentationOrder)||999999)-(Number(b.presentationOrder)||999999));
    return selectedOnly?list.filter(ph=>ph.includeInPresentation!==false):list;
  }
  function normalizePhotoOrder(p){
    const sorted=[...(p.photos||[])].sort((a,b)=>(Number(a.presentationOrder)||999999)-(Number(b.presentationOrder)||999999));
    sorted.forEach((ph,i)=>ph.presentationOrder=i+1);
  }
  function movePhotoInPresentation(p,id,delta){
    const selected=orderedPhotos(p,true);
    const idx=selected.findIndex(ph=>ph.id===id);
    const target=idx+delta;
    if(idx<0||target<0||target>=selected.length)return;
    const a=selected[idx],b=selected[target];
    const tmp=a.presentationOrder;a.presentationOrder=b.presentationOrder;b.presentationOrder=tmp;
    normalizePhotoOrder(p);save();
  }
  function movePage(p,id,delta){
    const idx=p.pages.findIndex(pg=>pg.id===id),target=idx+delta;
    if(idx<0||target<0||target>=p.pages.length)return;
    [p.pages[idx],p.pages[target]]=[p.pages[target],p.pages[idx]];save();
  }
  function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function toast(msg){ const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2200); }
  function go(screen,projectId=null,tab='overview'){ route={screen,projectId,tab}; render(); window.scrollTo({top:0,behavior:'smooth'}); }
  function coverOf(p,index=0){ return p.photos?.[0]?.data || p.coverAsset || demoAssets[index%demoAssets.length]; }
  function adcBrandSrc(){return data.brand?.adcLogo||'assets/adc_mark_recolored.png';}
  function inter4BrandSrc(){return data.brand?.inter4Logo||'assets/inter4_mark.png';}
  function adcOfficialSrc(){return data.brand?.adcLogo||'assets/adc_mark_transparent.png';}
  function inter4OfficialSrc(){return data.brand?.inter4Logo||'assets/inter4_mark_transparent.png';}
  function brandHtml(compact=false){ return `<div class="brand-lockup ${compact?'compact':''}"><div class="brand-primary"><img class="adc-mark" src="${adcBrandSrc()}" alt="ADC"><span class="studio-word">Studio</span></div><div class="brand-secondary"><span>by</span><img src="${inter4BrandSrc()}" alt="inter4 mobiliário"></div></div>`; }
  function officialBrandHtml(kind='header'){return `<div class="official-brand official-brand-${kind}"><div class="official-brand-main"><img src="${adcOfficialSrc()}" alt="ADC"><span>Studio</span></div><div class="official-brand-by"><span>by</span><img src="${inter4OfficialSrc()}" alt="inter4 mobiliário"></div></div>`;}
  function officialCopperBrandHtml(){return `<div class="official-copper-brand"><div class="official-copper-main"><img src="${adcOfficialSrc()}" alt="ADC"><span>Studio</span></div><div class="official-copper-by"><span>by</span><img src="${inter4OfficialSrc()}" alt="inter4 mobiliário"></div></div>`;}

  function render(){
    if(route.screen==='welcome') return renderWelcome();
    if(route.screen==='projects') return renderProjects();
    if(route.screen==='models') return renderModels();
    if(route.screen==='library') return renderLibrary();
    if(route.screen==='clients') return renderClients();
    if(route.screen==='settings') return renderSettings();
    if(route.screen==='trash') return renderTrash();
    if(route.screen==='project') return renderProject();
    if(route.screen==='editor') return renderEditor();
    if(route.screen==='builder') return renderBuilder();
    return renderWelcome();
  }

  function renderWelcome(){
    app.innerHTML=`<section class="welcome">
      <header class="welcome-top">${brandHtml(false)}<div class="welcome-slogan"><strong>DA IDEIA AO ESPAÇO PERFEITO</strong><small>PLANEAMENTO &nbsp; | &nbsp; VISUALIZAÇÃO &nbsp; | &nbsp; APRESENTAÇÃO &nbsp; | &nbsp; SEMPRE CONSIGO</small></div><div class="welcome-icons"><div class="promise"><span class="ico">▱</span><small>INTERIORES<br>QUE INSPIRAM</small></div><div class="promise"><span class="ico">♢</span><small>PROJETOS<br>SEM LIMITES</small></div><div class="promise"><span class="ico">▧</span><small>APRESENTAÇÕES<br>PROFISSIONAIS</small></div></div></header>
      <div class="welcome-card"><div class="welcome-copy">${brandHtml(false)}<h1>INTERIORES<br>QUE GANHAM VIDA</h1><p>Do conceito à apresentação, tudo num só lugar. Fotografa, anota, organiza e apresenta cada projeto com um visual profissional.</p><button class="btn primary" id="startApp">Começar &nbsp; →</button></div><div class="welcome-foot">DESIGN &nbsp; • &nbsp; MOBILIÁRIO &nbsp; • &nbsp; PESSOAS</div></div>
    </section>`;
    qs('#startApp').onclick=()=>go('projects');
  }

  function navHtml(active){
    const items=[['projects','▣','Projetos'],['models','▤','Modelos'],['library','◇','Biblioteca'],['clients','♙','Clientes'],['settings','⚙','Definições'],['trash','⌫','Lixeira']];
    return `<nav class="nav">${items.map(([id,ico,label])=>`<button data-nav="${id}" class="${active===id?'active':''}"><span class="nav-ico">${ico}</span><span class="label">${label}</span></button>`).join('')}</nav>`;
  }
  function shell(content,active='projects'){
    app.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="sidebar-brand">${brandHtml(true)}</div>${navHtml(active)}<div class="sidebar-foot">ADC Studio • Protótipo v1.8<br>Funciona localmente e sem servidor.<button id="backupMini">Exportar cópia</button><button id="importMini">Importar projeto</button><button id="backWelcome">Ecrã inicial</button></div></aside><main class="main">${content}</main></div>`;
    qsa('[data-nav]').forEach(b=>b.onclick=()=>{
      const n=b.dataset.nav;
      go(n);
    });
    const bk=qs('#backupMini'); if(bk) bk.onclick=exportAll;
    const im=qs('#importMini'); if(im) im.onclick=()=>importInput.click();
    const bw=qs('#backWelcome'); if(bw) bw.onclick=()=>go('welcome');
  }

  function renderProjects(){
    const filtered=data.projects.filter(p=>`${p.name} ${p.client} ${p.location} ${p.type}`.toLowerCase().includes(projectSearch.toLowerCase()));
    const cards=filtered.map((p,i)=>`<article class="project-card" data-open="${p.id}"><div class="project-cover" style="background-image:url('${coverOf(p,i)}')"></div><div class="project-meta"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.location||'Sem localização')} • ${escapeHtml(p.type||'Projeto de interiores')}</p><div class="project-bottom"><span class="status-dot">${escapeHtml(p.status)}</span><button class="kebab" data-menu-project="${p.id}">⋮</button></div></div></article>`).join('');
    const content=`<div class="app-header"><div class="app-title">${brandHtml(true)}<div><h1>Os meus projetos</h1><div class="sub">Projetos de interiores e mobiliário</div></div></div><div class="header-actions"><button class="btn ghost" id="notify">◌</button><div class="circle-avatar">NC</div></div></div>
      <div class="search-row"><div class="search"><input id="projectSearch" placeholder="Pesquisar projetos..." value="${escapeHtml(projectSearch)}"></div><select class="select" id="sortProjects"><option>Recentes</option><option>Nome A–Z</option></select><button class="btn primary" id="newProject">+ Novo projeto</button></div>
      ${filtered.length?`<section class="project-grid">${cards}</section>`:`<div class="empty">Nenhum projeto encontrado.</div>`}`;
    shell(content,'projects');
    qs('#projectSearch').oninput=e=>{projectSearch=e.target.value; renderProjects(); requestAnimationFrame(()=>{const i=qs('#projectSearch');i.focus();i.setSelectionRange(i.value.length,i.value.length);});};
    qs('#newProject').onclick=()=>projectModal();
    qs('#sortProjects').onchange=e=>{ if(e.target.value==='Nome A–Z') data.projects.sort((a,b)=>a.name.localeCompare(b.name)); else data.projects.sort((a,b)=>(b.created||'').localeCompare(a.created||'')); save();renderProjects(); };
    qsa('[data-open]').forEach(card=>card.onclick=e=>{ if(e.target.closest('[data-menu-project]')) return; go('project',card.dataset.open,'overview'); });
    qsa('[data-menu-project]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const p=data.projects.find(x=>x.id===btn.dataset.menuProject); projectMenu(p);});
  }


  function moduleHeader(title,subtitle,actions=''){
    return `<div class="app-header module-header"><div class="app-title">${brandHtml(true)}<div><h1>${escapeHtml(title)}</h1><div class="sub">${escapeHtml(subtitle)}</div></div></div><div class="header-actions">${actions}<div class="circle-avatar">NC</div></div></div>`;
  }

  function renderModels(){
    const presets=[
      {id:'official',name:'ADC Oficial',theme:'official',desc:'Modelo oficial aprovado da ADC Studio: capa institucional, ficha do cliente, Visualização 3D, imagens em grande formato, composições editoriais, mosaico final e contactos.',cls:'preset-official'},
      {id:'signature',name:'ADC Signature',theme:'warm',desc:'Modelo alternativo elegante e equilibrado, pensado para apresentação ao cliente.',cls:'preset-signature'},
      {id:'editorial',name:'Editorial Interior',theme:'editorial',desc:'Composição inspirada em revistas de interiores, com ritmo visual mais editorial.',cls:'preset-editorial'},
      {id:'gallery',name:'Galeria Premium',theme:'gallery',desc:'Fotografias em grande destaque e pouco texto. Ideal para renders e projetos muito visuais.',cls:'preset-gallery'},
      {id:'architectural',name:'Arquitetura',theme:'architectural',desc:'Visual claro, técnico e minimalista para plantas, levantamentos e apresentações limpas.',cls:'preset-architectural'},
      {id:'catalog',name:'Catálogo Cliente',theme:'warm',desc:'Mais imagens por página para apresentações compactas e objetivas.',cls:'preset-catalog'}
    ];
    const projectOptions=data.projects.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}${p.client?` — ${escapeHtml(p.client)}`:''}</option>`).join('');
    const cards=presets.map(pr=>`<article class="model-card ${pr.id==='official'?'official-model-card':''}"><div class="preset-hero ${pr.cls}"><i></i><i></i><i></i><i></i><i></i></div><div class="model-copy"><div class="model-top"><h3>${pr.name}${pr.id==='official'?'<em>OFICIAL</em>':''}</h3><span>${themeInfo(pr.theme).label}</span></div><p>${pr.desc}</p><button class="btn primary small" data-apply-model="${pr.id}" data-theme="${pr.theme}">Aplicar ao projeto</button></div></article>`).join('');
    const content=`${moduleHeader('Modelos','Modelos automáticos para criar apresentações profissionais')}
      <section class="module-intro"><div><h2>Modelo oficial ADC Studio</h2><p>O modelo <strong>ADC Oficial</strong> é agora a referência principal. Replica a linguagem visual da apresentação aprovada e gera o PDF automaticamente a partir das imagens selecionadas.</p><button class="btn small" id="editOfficialModel" style="margin-top:10px">⚙ Editar logótipos e dados do modelo</button></div><div class="field compact-field"><label>Projeto</label><select id="modelProjectSelect">${projectOptions||'<option value="">Sem projetos</option>'}</select></div></section>
      <div class="models-grid">${cards}</div>`;
    shell(content,'models');
    qs('#editOfficialModel')?.addEventListener('click',()=>go('settings'));
    qsa('[data-apply-model]').forEach(b=>b.onclick=()=>{
      const pid=qs('#modelProjectSelect')?.value; const p=data.projects.find(x=>x.id===pid);
      if(!p) return toast('Cria ou seleciona primeiro um projeto.');
      p.presentationPreset=b.dataset.applyModel; p.presentationTheme=b.dataset.theme;
      p.presentationTemplate=b.dataset.applyModel==='official'?'official':(b.dataset.applyModel==='gallery'||b.dataset.applyModel==='architectural'?'minimal':b.dataset.applyModel==='signature'?'premium':b.dataset.applyModel);
      save(); toast(`${b.closest('.model-card').querySelector('h3').childNodes[0].textContent.trim()} aplicado a ${p.name}.`);
      setTimeout(()=>go('project',p.id,'presentation'),450);
    });
  }

  function fileToLogoData(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>{
        const img=new Image();
        img.onload=()=>{
          const max=900,scale=Math.min(1,max/Math.max(img.width,img.height));
          const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
          c.getContext('2d').drawImage(img,0,0,c.width,c.height);
          resolve(c.toDataURL('image/png'));
        };
        img.onerror=reject;img.src=reader.result;
      };
      reader.onerror=reject;reader.readAsDataURL(file);
    });
  }

  function pickBrandLogo(kind){
    const inp=document.createElement('input');inp.type='file';inp.accept='image/png,image/jpeg,image/webp';
    inp.onchange=async()=>{
      const file=inp.files?.[0];if(!file)return;
      try{data.brand[kind]=await fileToLogoData(file);save();renderSettings();toast('Logótipo atualizado.');}
      catch(e){toast('Não foi possível carregar esse logótipo.');}
    };
    inp.click();
  }

  function renderSettings(){
    const co=data.company||{}, md=data.modelDefaults||{};
    const adc=adcBrandSrc(), inter=inter4BrandSrc();
    const content=`${moduleHeader('Definições','Marca, contactos e conteúdo padrão dos modelos')}
      <section class="settings-grid">
        <article class="settings-card">
          <div class="settings-card-head"><div><h2>Logótipos</h2><p>Podes substituir os logótipos usados na aplicação e no modelo oficial. Para melhor resultado usa PNG com fundo transparente.</p></div></div>
          <div class="logo-settings-grid">
            <div class="logo-setting"><div class="logo-preview"><img src="${adc}" alt="Logo ADC"></div><b>ADC</b><div class="setting-actions"><button class="btn small" id="changeAdcLogo">Alterar logótipo</button><button class="btn small" id="resetAdcLogo">Repor original</button></div></div>
            <div class="logo-setting"><div class="logo-preview"><img src="${inter}" alt="Logo inter4"></div><b>inter4 mobiliário</b><div class="setting-actions"><button class="btn small" id="changeInterLogo">Alterar logótipo</button><button class="btn small" id="resetInterLogo">Repor original</button></div></div>
          </div>
          <div class="brand-live-preview"><span>Pré-visualização</span>${officialBrandHtml('settings')}</div>
        </article>
        <article class="settings-card">
          <div class="settings-card-head"><div><h2>Dados da empresa</h2><p>Estes dados aparecem automaticamente na página final das apresentações.</p></div></div>
          <div class="form-grid settings-form">
            <div class="field"><label>Email</label><input id="setEmail" value="${escapeHtml(co.email||'')}"></div>
            <div class="field"><label>Telefone geral</label><input id="setPhone" value="${escapeHtml(co.phone||'')}"></div>
            <div class="field"><label>Website</label><input id="setWebsite" value="${escapeHtml(co.website||'')}"></div>
            <div class="field full"><label>Morada</label><input id="setAddress" value="${escapeHtml(co.address||'')}"></div>
            <div class="field"><label>Contacto 1 — nome</label><input id="setC1Name" value="${escapeHtml(co.contact1Name||'')}"></div>
            <div class="field"><label>Função</label><input id="setC1Role" value="${escapeHtml(co.contact1Role||'')}"></div>
            <div class="field"><label>Telefone</label><input id="setC1Phone" value="${escapeHtml(co.contact1Phone||'')}"></div>
            <div class="field"><label>Contacto 2 — nome</label><input id="setC2Name" value="${escapeHtml(co.contact2Name||'')}"></div>
            <div class="field"><label>Função</label><input id="setC2Role" value="${escapeHtml(co.contact2Role||'')}"></div>
            <div class="field"><label>Telefone</label><input id="setC2Phone" value="${escapeHtml(co.contact2Phone||'')}"></div>
          </div>
        </article>
        <article class="settings-card settings-card-wide">
          <div class="settings-card-head"><div><h2>Dados do modelo oficial</h2><p>Altera os textos padrão do modelo. Os dados específicos de cada cliente/projeto continuam editáveis em <strong>Apresentações → Dados do PDF</strong>.</p></div></div>
          <div class="form-grid settings-form">
            <div class="field full"><label>Texto da capa</label><input id="setCoverTag" value="${escapeHtml(md.coverTagline||'')}"></div>
            <div class="field"><label>Título serviço 1</label><textarea id="setService1Title" rows="2">${escapeHtml(md.service1Title||'')}</textarea></div>
            <div class="field"><label>Título serviço 2</label><textarea id="setService2Title" rows="2">${escapeHtml(md.service2Title||'')}</textarea></div>
            <div class="field"><label>Texto serviço 1</label><textarea id="setService1Text" rows="4">${escapeHtml(md.service1Text||'')}</textarea></div>
            <div class="field"><label>Texto serviço 2</label><textarea id="setService2Text" rows="4">${escapeHtml(md.service2Text||'')}</textarea></div>
            <div class="field"><label>Título do separador</label><input id="setSectionTitle" value="${escapeHtml(md.sectionTitle||'')}"></div>
            <div class="field full"><label>Direitos / rodapé</label><input id="setRights" value="${escapeHtml(md.rightsText||'')}"></div>
            <div class="field full"><label>Rodapé do mosaico final</label><input id="setStripRights" value="${escapeHtml(md.stripRights||'')}"></div>
          </div>
        </article>
      </section>
      <div class="settings-savebar"><button class="btn" id="resetModelDefaults">Repor textos padrão</button><button class="btn primary" id="saveSettings">Guardar definições</button></div>`;
    shell(content,'settings');
    qs('#changeAdcLogo')?.addEventListener('click',()=>pickBrandLogo('adcLogo'));
    qs('#changeInterLogo')?.addEventListener('click',()=>pickBrandLogo('inter4Logo'));
    qs('#resetAdcLogo')?.addEventListener('click',()=>{data.brand.adcLogo='';save();renderSettings();});
    qs('#resetInterLogo')?.addEventListener('click',()=>{data.brand.inter4Logo='';save();renderSettings();});
    qs('#resetModelDefaults')?.addEventListener('click',()=>{data.modelDefaults={coverTagline:'INTERIOR DESIGN | MOBILIÁRIO',service1Title:'INTERIOR\nDESIGN',service1Text:'Projetamos espaços que inspiram, proporcionam conforto e praticidade.',service2Title:'MOBILIÁRIO\nÀ MEDIDA',service2Text:'Desenhamos, produzimos e integramos soluções de mobiliário pensadas para cada espaço.',sectionTitle:'Visualização 3D',rightsText:'Imagens com direitos reservados e propriedade de ADC Studio • inter4 mobiliário',stripRights:'DIREITOS RESERVADOS ADC STUDIO • INTER4 MOBILIÁRIO'};save();renderSettings();toast('Textos padrão repostos.');});
    qs('#saveSettings')?.addEventListener('click',()=>{
      data.company={email:qs('#setEmail').value.trim(),phone:qs('#setPhone').value.trim(),website:qs('#setWebsite').value.trim(),address:qs('#setAddress').value.trim(),contact1Name:qs('#setC1Name').value.trim(),contact1Role:qs('#setC1Role').value.trim(),contact1Phone:qs('#setC1Phone').value.trim(),contact2Name:qs('#setC2Name').value.trim(),contact2Role:qs('#setC2Role').value.trim(),contact2Phone:qs('#setC2Phone').value.trim()};
      data.modelDefaults={coverTagline:qs('#setCoverTag').value.trim()||'INTERIOR DESIGN | MOBILIÁRIO',service1Title:qs('#setService1Title').value.trim()||'INTERIOR\nDESIGN',service1Text:qs('#setService1Text').value.trim(),service2Title:qs('#setService2Title').value.trim()||'MOBILIÁRIO\nÀ MEDIDA',service2Text:qs('#setService2Text').value.trim(),sectionTitle:qs('#setSectionTitle').value.trim()||'Visualização 3D',rightsText:qs('#setRights').value.trim(),stripRights:qs('#setStripRights').value.trim()};
      save();toast('Definições guardadas.');renderSettings();
    });
  }

  function renderLibrary(){
    const photos=[];
    data.projects.forEach((p,pi)=>(p.photos||[]).forEach(ph=>photos.push({p,ph,pi})));
    const projectOptions=data.projects.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    const cards=photos.map(({p,ph})=>`<article class="library-card" data-library-project="${p.id}"><img src="${ph.data}" alt="${escapeHtml(ph.label||'Fotografia')}"><div class="library-meta"><b>${escapeHtml(ph.room||UNASSIGNED_ROOM)}</b><span>${escapeHtml(p.name)}</span><small>${escapeHtml(ph.label||'Fotografia')}</small></div></article>`).join('');
    const content=`${moduleHeader('Biblioteca','Todas as fotografias guardadas nos projetos')}
      <div class="library-toolbar"><div class="metric-card"><strong>${photos.length}</strong><span>fotografias</span></div><div class="metric-card"><strong>${data.projects.length}</strong><span>projetos</span></div><div class="search"><input id="librarySearch" placeholder="Pesquisar por projeto, divisão ou legenda..."></div><select class="select" id="libraryProject"><option value="">Todos os projetos</option>${projectOptions}</select></div>
      <section class="library-grid" id="libraryGrid">${cards||'<div class="empty">Ainda não existem fotografias na biblioteca.</div>'}</section>`;
    shell(content,'library');
    const apply=()=>{
      const term=(qs('#librarySearch')?.value||'').toLowerCase(); const pid=qs('#libraryProject')?.value||'';
      qsa('[data-library-project]').forEach(card=>{
        const txt=card.textContent.toLowerCase(); const okTerm=!term||txt.includes(term); const okProject=!pid||card.dataset.libraryProject===pid;
        card.style.display=okTerm&&okProject?'':'none';
      });
    };
    qs('#librarySearch')?.addEventListener('input',apply); qs('#libraryProject')?.addEventListener('change',apply);
    qsa('[data-library-project]').forEach(card=>card.onclick=()=>go('project',card.dataset.libraryProject,'photos'));
  }

  function renderClients(){
    const map=new Map();
    data.projects.forEach(p=>{
      const name=(p.client||'Sem cliente').trim()||'Sem cliente';
      if(!map.has(name)) map.set(name,[]); map.get(name).push(p);
    });
    const cards=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([name,projects])=>{
      const locations=[...new Set(projects.map(p=>p.location).filter(Boolean))].join(' • ');
      const projectLinks=projects.map(p=>`<button class="client-project" data-client-project="${p.id}"><span>${escapeHtml(p.name)}</span><small>${escapeHtml(p.status||'')}</small></button>`).join('');
      return `<article class="client-card"><div class="client-avatar">${escapeHtml(name.slice(0,2).toUpperCase())}</div><div class="client-info"><h3>${escapeHtml(name)}</h3><p>${escapeHtml(locations||'Sem localização')} • ${projects.length} projeto(s)</p><div class="client-projects">${projectLinks}</div></div></article>`;
    }).join('');
    const content=`${moduleHeader('Clientes','Clientes reunidos automaticamente a partir dos projetos','<button class="btn primary" id="newClientProject">+ Novo projeto</button>')}
      <section class="clients-grid">${cards||'<div class="empty">Ainda não existem clientes.</div>'}</section>`;
    shell(content,'clients');
    qs('#newClientProject')?.addEventListener('click',()=>projectModal());
    qsa('[data-client-project]').forEach(b=>b.onclick=()=>go('project',b.dataset.clientProject,'overview'));
  }

  function renderTrash(){
    const items=(data.deletedProjects||[]).map((p,i)=>`<article class="trash-card"><div class="trash-cover" style="background-image:url('${coverOf(p,i)}')"></div><div class="trash-info"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.client||'Sem cliente')} • ${escapeHtml(p.location||'Sem localização')}</p><small>Movido para a lixeira ${p.deletedAt?new Date(p.deletedAt).toLocaleDateString('pt-PT'):''}</small><div class="trash-actions"><button class="btn small" data-restore-project="${p.id}">Restaurar</button><button class="btn small danger" data-delete-forever="${p.id}">Eliminar definitivamente</button></div></div></article>`).join('');
    const content=`${moduleHeader('Lixeira','Projetos eliminados podem ser restaurados antes da eliminação definitiva')}
      <section class="trash-list">${items||'<div class="empty">A lixeira está vazia.</div>'}</section>`;
    shell(content,'trash');
    qsa('[data-restore-project]').forEach(b=>b.onclick=()=>{
      const i=data.deletedProjects.findIndex(p=>p.id===b.dataset.restoreProject); if(i<0)return;
      const [p]=data.deletedProjects.splice(i,1); delete p.deletedAt; data.projects.unshift(p); save(); renderTrash(); toast('Projeto restaurado.');
    });
    qsa('[data-delete-forever]').forEach(b=>b.onclick=()=>{
      const p=data.deletedProjects.find(x=>x.id===b.dataset.deleteForever); if(!p)return;
      if(!confirm(`Eliminar definitivamente “${p.name}”? Esta ação não pode ser anulada.`))return;
      data.deletedProjects=data.deletedProjects.filter(x=>x.id!==p.id); save(); renderTrash(); toast('Projeto eliminado definitivamente.');
    });
  }

  function projectMenu(p){
    modal(`<h3>${escapeHtml(p.name)}</h3><div style="display:grid;gap:8px"><button class="btn" id="pmOpen">Abrir projeto</button><button class="btn" id="pmEdit">Editar dados</button><button class="btn" id="pmExport">Exportar projeto</button><button class="btn danger" id="pmDelete">Eliminar projeto</button></div>`);
    qs('#pmOpen').onclick=()=>{closeModal();go('project',p.id,'overview');};
    qs('#pmEdit').onclick=()=>{closeModal();projectModal(p);};
    qs('#pmExport').onclick=()=>exportProject(p);
    qs('#pmDelete').onclick=()=>{if(confirm(`Mover “${p.name}” para a Lixeira?`)){p.deletedAt=new Date().toISOString();data.deletedProjects.unshift(p);data.projects=data.projects.filter(x=>x.id!==p.id);save();closeModal();renderProjects();toast('Projeto movido para a Lixeira.');}};
  }

  function renderProject(){
    const p=project(); if(!p) return go('projects');
    const tabs=[['overview','Vista geral'],['rooms','Ambientes'],['photos','Fotografias'],['presentation','Apresentações'],['notes','Notas'],['files','Ficheiros']];
    let body='';
    if(route.tab==='overview') body=overviewHtml(p);
    else if(route.tab==='rooms') body=roomsHtml(p);
    else if(route.tab==='photos') body=photosHtml(p);
    else if(route.tab==='presentation') body=presentationHtml(p);
    else if(route.tab==='notes') body=notesHtml(p);
    else body=filesHtml(p);
    const content=`<div class="project-topline"><div><div class="crumb">‹ Projetos</div><div class="project-name">${escapeHtml(p.name)} ✎</div></div><div class="project-actions"><button class="btn" id="shareProject">Partilhar</button><button class="btn ghost" id="projectDots">•••</button></div></div><div class="tabs">${tabs.map(([id,label])=>`<button data-tab="${id}" class="${route.tab===id?'active':''}">${label}</button>`).join('')}</div>${body}`;
    shell(content,'projects');
    qs('.crumb').onclick=()=>go('projects');
    qsa('[data-tab]').forEach(b=>b.onclick=()=>go('project',p.id,b.dataset.tab));
    qs('#projectDots').onclick=()=>projectMenu(p);
    qs('#shareProject').onclick=()=>shareProject(p);
    bindProjectActions(p);
  }

  function roomCover(p,room,index=0){
    const ph=p.photos.find(x=>x.room===room);
    return ph?.data||demoAssets[index%demoAssets.length];
  }
  function overviewHtml(p){
    const rooms=(p.rooms||[]).slice(0,5);
    return `<section class="overview-grid"><div class="hero-photo ${p.photos.length?'':'no-photo'}" style="${p.photos.length?`background-image:url('${p.photos[0].data}')`:''}"></div><aside class="detail-card"><h3>Detalhes do projeto</h3><div class="details"><div class="detail"><b>Cliente</b><span>${escapeHtml(p.client||'—')}</span></div><div class="detail"><b>Localização</b><span>${escapeHtml(p.location||'—')}</span></div><div class="detail"><b>Tipologia</b><span>${escapeHtml(p.type||'—')}</span></div><div class="detail"><b>Estado</b><span>${escapeHtml(p.status)}</span></div><div class="detail"><b>Fotografias</b><span>${p.photos.length}</span></div><div class="detail"><b>Apresentação</b><span>${p.pages.length} pág.</span></div></div><div style="margin-top:16px"><button class="btn small" id="editProjectBtn">Editar projeto</button></div></aside></section>
      <div class="section-title"><h3>Ambientes</h3><button class="text-action" id="manageRoomsOverview">Gerir divisões</button></div>${rooms.length?`<div class="room-strip">${rooms.map((r,i)=>`<button class="room-card" data-room="${escapeHtml(r)}"><div class="room-img" style="background-image:url('${roomCover(p,r,i)}')"></div><div class="room-name"><span>${escapeHtml(r)}</span><span>›</span></div></button>`).join('')}</div>`:`<div class="empty compact">Ainda não existem divisões. Adiciona as divisões desta casa.</div>`}
      <div class="section-title"><h3>Resumo do projeto</h3><small>Informação interna</small></div><div class="notes-card">${escapeHtml(p.notes||'Sem notas. Podes editar o projeto para adicionar objetivos, materiais e observações.')}</div>`;
  }
  function roomsHtml(p){
    const counts={}; p.photos.forEach(ph=>counts[ph.room||UNASSIGNED_ROOM]=(counts[ph.room||UNASSIGNED_ROOM]||0)+1);
    const roomCards=(p.rooms||[]).map((r,i)=>`<div class="room-manage-card"><button class="room-card" data-room="${escapeHtml(r)}"><div class="room-img" style="background-image:url('${roomCover(p,r,i+1)}')"></div><div class="room-name"><span>${escapeHtml(r)}</span><span>${counts[r]||0} foto(s)</span></div></button><div class="room-card-actions"><button class="mini-action" data-edit-room="${escapeHtml(r)}">Editar</button><button class="mini-action danger-text" data-delete-room="${escapeHtml(r)}">Eliminar</button></div></div>`).join('');
    const unassigned=counts[UNASSIGNED_ROOM]?`<div class="room-manage-card"><button class="room-card muted-room" data-room="${UNASSIGNED_ROOM}"><div class="room-img no-room"></div><div class="room-name"><span>${UNASSIGNED_ROOM}</span><span>${counts[UNASSIGNED_ROOM]} foto(s)</span></div></button><div class="room-card-actions"><span class="room-hint">Fotografias ainda por classificar</span></div></div>`:'';
    return `<div class="section-title rooms-head"><div><h3>Divisões da casa</h3><small>Adiciona, altera ou elimina as divisões de cada projeto</small></div><button class="btn primary" id="addRoomBtn">+ Nova divisão</button></div><div class="room-manage-grid">${roomCards}${unassigned}</div>${!p.rooms.length?`<div class="empty">Ainda não existem divisões neste projeto.</div>`:''}`;
  }
  function photosHtml(p){
    const available=[...(p.rooms||[])]; if(p.photos.some(ph=>(ph.room||UNASSIGNED_ROOM)===UNASSIGNED_ROOM))available.push(UNASSIGNED_ROOM);
    const rooms=['Todas',...available];
    if(photoFilter!=='Todas'&&!rooms.includes(photoFilter))photoFilter='Todas';
    const allOrdered=orderedPhotos(p,false);
    const visible=photoFilter==='Todas'?allOrdered:allOrdered.filter(ph=>(ph.room||UNASSIGNED_ROOM)===photoFilter);
    const selected=orderedPhotos(p,true), selectedCount=selected.length;
    const selectedPos=new Map(selected.map((ph,i)=>[ph.id,i+1]));
    const tiles=visible.map(ph=>`<div class="photo-tile ${ph.includeInPresentation===false?'photo-excluded':''} ${p.coverPhotoId===ph.id?'photo-cover-selected':''}"><img src="${ph.data}" alt=""><div class="photo-status-row">${p.coverPhotoId===ph.id?'<span class="cover-badge">★ CAPA</span>':''}${ph.includeInPresentation===false?'<span class="exclude-badge">FORA DO PDF</span>':`<span class="include-badge">PDF #${selectedPos.get(ph.id)||''}</span>`}</div><div class="photo-actions"><button class="icon-btn" data-move-photo-up="${ph.id}" title="Mover antes no PDF" ${ph.includeInPresentation===false?'disabled':''}>←</button><button class="icon-btn" data-move-photo-down="${ph.id}" title="Mover depois no PDF" ${ph.includeInPresentation===false?'disabled':''}>→</button><button class="icon-btn" data-toggle-photo="${ph.id}" title="${ph.includeInPresentation===false?'Incluir no PDF':'Retirar do PDF'}">${ph.includeInPresentation===false?'＋':'✓'}</button><button class="icon-btn" data-cover-photo="${ph.id}" title="Usar como capa">★</button><button class="icon-btn" data-edit-photo="${ph.id}" title="Editar">✎</button><button class="icon-btn" data-classify-photo="${ph.id}" title="Divisão">▣</button><button class="icon-btn" data-del-photo="${ph.id}" title="Eliminar">×</button></div><div class="photo-label">${escapeHtml(ph.room||UNASSIGNED_ROOM)}</div></div>`).join('');
    return `<div class="photo-toolbar"><div><h3 style="margin:0;font-size:20px">Fotografias</h3><small style="color:#726f6b;font-size:12px">Escolhe as imagens do PDF, define a capa e controla a ordem em que aparecem.</small><div class="pdf-photo-count"><strong>${selectedCount}</strong> de ${p.photos.length} fotografia(s) selecionada(s) para a apresentação</div></div><div><button class="btn" id="reorderPhotosBtn">⇅ Ordenar PDF</button> <button class="btn" id="includeAllPhotos">Todas no PDF</button> <button class="btn" id="manageRoomsPhotos">Gerir divisões</button> <button class="btn" id="generateFromPhotos">✦ Criar apresentação</button> <button class="btn primary" id="addPhotosBtn">+ Adicionar fotos</button></div></div><div class="filter-tabs">${rooms.map(r=>`<button data-photo-filter="${escapeHtml(r)}" class="${photoFilter===r?'active':''}">${escapeHtml(r)}${r==='Todas'?` (${p.photos.length})`:''}</button>`).join('')}</div><div class="photo-grid"><button class="add-photo-tile" id="addPhotoTile">▧<br>Tirar / adicionar foto</button>${tiles}</div>`;
  }
  function presentationHtml(p){
    const pg=p.pages[0];
    const selectedCount=p.photos.filter(ph=>ph.includeInPresentation!==false).length;
    const modelLabel=({official:'ADC Oficial',premium:'ADC Premium',minimal:'Minimal Claro',editorial:'Editorial',catalog:'Catálogo Visual'})[p.presentationTemplate]||'ADC Oficial';
    const visualTheme=themeInfo(p.presentationTheme||'official').label;
    const presetLabel=({official:'ADC Oficial',signature:'ADC Signature',editorial:'Editorial Interior',gallery:'Galeria Premium',architectural:'Arquitetura',catalog:'Catálogo Cliente'})[p.presentationPreset]||'ADC Oficial';
    const densityLabel=({compact:'Compacta',balanced:'Equilibrada',detailed:'Detalhada'})[p.presentationDensity]||'Equilibrada';
    return `<div class="section-title"><h3>Apresentação automática</h3><small>${selectedCount} imagem(ns) selecionada(s) • ${p.pages.length} página(s)</small></div>
      <section class="auto-present-card"><div class="auto-present-copy"><div class="auto-kicker">ADC STUDIO • FLUXO AUTOMÁTICO</div><h2>Coloca as imagens. A ADC Studio monta o resto.</h2><p>Escolhe um modelo pronto e a aplicação define automaticamente a capa, o estilo, a quantidade de imagens por página e a sequência visual. Depois só precisas de pré-visualizar e gerar o PDF.</p><div class="auto-steps"><span><b>1</b> Adicionar imagens</span><span><b>2</b> Escolher modelo</span><span><b>3</b> Gerar PDF</span></div><div class="auto-actions"><button class="btn primary big" id="autoGenerate">✦ Criar apresentação automaticamente</button><button class="btn" id="presentationBriefBtn">✎ Dados do PDF</button><button class="btn" id="addPhotosFromPresentation">+ Adicionar imagens</button></div><div class="auto-current">Modelo: <strong>${presetLabel}</strong> &nbsp;•&nbsp; Ritmo: <strong>${densityLabel}</strong> &nbsp;•&nbsp; Estilo: <strong>${visualTheme}</strong></div></div><div class="auto-present-preview">${slideHtml(p,pg)}</div></section>
      <div class="section-title"><h3>Pré-visualização e ajustes</h3><small>Opcional</small></div><div class="overview-grid"><div class="export-preview">${slideHtml(p,pg)}</div><aside class="detail-card"><h3>Apresentação do cliente</h3><p style="font-size:11px;color:#777;line-height:1.6">A apresentação é criada automaticamente. Se quiseres, podes depois alterar uma página, trocar uma imagem ou mudar a ordem.</p><div style="display:grid;gap:8px;margin-top:16px"><button class="btn" id="openBuilder">Ajustar páginas</button><button class="btn" id="startPresentation">Modo apresentação</button><button class="btn primary" id="printPdf">Gerar PDF agora</button></div></aside></div>`;
  }
  function reorderPhotosModal(p){
    const list=orderedPhotos(p,true);
    if(!list.length)return toast('Seleciona primeiro as fotografias que entram no PDF.');
    const rowHtml=()=>orderedPhotos(p,true).map((ph,i)=>`<div class="reorder-photo-row" data-reorder-row="${ph.id}"><div class="reorder-number">${i+1}</div><img src="${ph.data}" alt=""><div class="reorder-meta"><b>${escapeHtml(ph.room||UNASSIGNED_ROOM)}</b><small>${p.coverPhotoId===ph.id?'★ Fotografia de capa':'Ordem no PDF'}</small></div><div class="reorder-actions"><button class="mini-action order-btn" data-order-first="${ph.id}" title="Mover para o início">⇤</button><button class="mini-action order-btn" data-order-up="${ph.id}" title="Subir">↑</button><button class="mini-action order-btn" data-order-down="${ph.id}" title="Descer">↓</button><button class="mini-action order-btn" data-order-last="${ph.id}" title="Mover para o fim">⇥</button></div></div>`).join('');
    modal(`<div class="reorder-head"><div><div class="auto-kicker">ORDEM DA APRESENTAÇÃO</div><h3>Ordenar fotografias</h3><p>Esta ordem é respeitada quando a ADC Studio cria a apresentação automática.</p></div></div><div id="reorderPhotoList" class="reorder-photo-list">${rowHtml()}</div><div class="modal-actions"><button class="btn" data-close>Fechar</button><button class="btn primary" id="reorderDone">Guardar ordem</button></div>`);
    const refresh=()=>{const el=qs('#reorderPhotoList');if(el)el.innerHTML=rowHtml();bindRows();};
    const bindRows=()=>{
      qsa('[data-order-up]').forEach(b=>b.onclick=()=>{movePhotoInPresentation(p,b.dataset.orderUp,-1);refresh();});
      qsa('[data-order-down]').forEach(b=>b.onclick=()=>{movePhotoInPresentation(p,b.dataset.orderDown,1);refresh();});
      qsa('[data-order-first]').forEach(b=>b.onclick=()=>{const selected=orderedPhotos(p,true),idx=selected.findIndex(x=>x.id===b.dataset.orderFirst);for(let i=idx;i>0;i--)movePhotoInPresentation(p,b.dataset.orderFirst,-1);refresh();});
      qsa('[data-order-last]').forEach(b=>b.onclick=()=>{let selected=orderedPhotos(p,true),idx=selected.findIndex(x=>x.id===b.dataset.orderLast);for(let i=idx;i<selected.length-1;i++)movePhotoInPresentation(p,b.dataset.orderLast,1);refresh();});
    };
    bindRows();
    qs('#reorderDone').onclick=()=>{save();closeModal();renderProject();toast('Ordem da apresentação guardada.');};
  }

  function presentationBriefModal(p){
    const pts=[...(p.presentationPoints||[])];while(pts.length<3)pts.push('');
    const co=data.company||{};
    modal(`<div class="auto-modal-head"><div><div class="auto-kicker">CONTEÚDO DO PDF</div><h3>Dados da apresentação</h3><p>Estes dados entram automaticamente na ficha do cliente e na página final do modelo oficial.</p></div></div><div class="form-grid"><div class="field full"><label>Título da apresentação</label><input id="briefTitle" value="${escapeHtml(p.presentationTitle||p.name||'')}"></div><div class="field full"><label>Subtítulo</label><input id="briefSubtitle" value="${escapeHtml(p.presentationSubtitle||'')}" placeholder="Ex.: Habitação • Paços de Ferreira"></div><div class="field full"><label>Conceito / descrição</label><textarea id="briefConcept" style="min-height:105px">${escapeHtml(p.presentationConcept||'')}</textarea></div><div class="field full"><label>Pontos principais</label><input id="briefPoint1" value="${escapeHtml(pts[0]||'')}" placeholder="Ponto principal 1"><input id="briefPoint2" value="${escapeHtml(pts[1]||'')}" placeholder="Ponto principal 2" style="margin-top:7px"><input id="briefPoint3" value="${escapeHtml(pts[2]||'')}" placeholder="Ponto principal 3" style="margin-top:7px"></div><div class="field full"><label>Mensagem final</label><input id="briefClosing" value="${escapeHtml(p.presentationClosing||'')}"></div><div class="field full form-divider"><b>Dados da empresa na página final</b></div><div class="field"><label>Email</label><input id="companyEmail" value="${escapeHtml(co.email||'')}" placeholder="email@empresa.pt"></div><div class="field"><label>Telefone geral</label><input id="companyPhone" value="${escapeHtml(co.phone||'')}" placeholder="255 000 000"></div><div class="field"><label>Website</label><input id="companyWebsite" value="${escapeHtml(co.website||'')}" placeholder="www.empresa.pt"></div><div class="field full"><label>Morada</label><input id="companyAddress" value="${escapeHtml(co.address||'')}" placeholder="Morada da empresa"></div><div class="field"><label>Contacto 1 - nome</label><input id="contact1Name" value="${escapeHtml(co.contact1Name||'')}"></div><div class="field"><label>Função</label><input id="contact1Role" value="${escapeHtml(co.contact1Role||'')}"></div><div class="field full"><label>Telefone contacto 1</label><input id="contact1Phone" value="${escapeHtml(co.contact1Phone||'')}"></div><div class="field"><label>Contacto 2 - nome</label><input id="contact2Name" value="${escapeHtml(co.contact2Name||'')}"></div><div class="field"><label>Função</label><input id="contact2Role" value="${escapeHtml(co.contact2Role||'')}"></div><div class="field full"><label>Telefone contacto 2</label><input id="contact2Phone" value="${escapeHtml(co.contact2Phone||'')}"></div></div><div class="modal-actions"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="savePresentationBrief">Guardar dados</button></div>`);
    qs('#savePresentationBrief').onclick=()=>{
      p.presentationTitle=qs('#briefTitle').value.trim()||p.name||'Projeto';
      p.presentationSubtitle=qs('#briefSubtitle').value.trim();
      p.presentationConcept=qs('#briefConcept').value.trim();
      p.presentationPoints=[qs('#briefPoint1').value.trim(),qs('#briefPoint2').value.trim(),qs('#briefPoint3').value.trim()].filter(Boolean);
      p.presentationClosing=qs('#briefClosing').value.trim();
      data.company={email:qs('#companyEmail').value.trim(),phone:qs('#companyPhone').value.trim(),website:qs('#companyWebsite').value.trim(),address:qs('#companyAddress').value.trim(),contact1Name:qs('#contact1Name').value.trim(),contact1Role:qs('#contact1Role').value.trim(),contact1Phone:qs('#contact1Phone').value.trim(),contact2Name:qs('#contact2Name').value.trim(),contact2Role:qs('#contact2Role').value.trim(),contact2Phone:qs('#contact2Phone').value.trim()};
      save();closeModal();renderProject();toast('Dados da apresentação guardados.');
    };
  }

  function notesHtml(p){
    return `<div class="section-title"><h3>Notas internas</h3><small>Não entram automaticamente na apresentação</small></div><div class="field"><textarea id="notesArea" style="min-height:330px">${escapeHtml(p.notes)}</textarea></div><div style="margin-top:12px"><button class="btn primary" id="saveNotes">Guardar notas</button></div>`;
  }
  function filesHtml(p){
    const preview=p.pages[0];
    return `<div class="section-title"><h3>Exportar apresentação</h3><small>PDF, imagens e projeto</small></div><div class="export-grid"><div class="export-options"><button class="export-option" id="printPdf"><span class="eico">▧</span><span><b>PDF (recomendado)</b><small>Apresentação completa, pronta a partilhar</small></span></button><button class="export-option" id="downloadImages"><span class="eico">▣</span><span><b>Imagens (JPG)</b><small>Exportar as fotografias do projeto</small></span></button><button class="export-option" id="exportProject"><span class="eico">□</span><span><b>Projeto completo</b><small>Ficheiro .adcproj para backup ou outro dispositivo</small></span></button><button class="export-option" id="shareProjectFile"><span class="eico">↗</span><span><b>Partilhar</b><small>Usar as opções de partilha do dispositivo</small></span></button></div><div class="export-preview">${slideHtml(p,preview)}<button class="btn primary" style="width:100%;margin-top:12px" id="printPdf2">Exportar PDF</button></div></div>`;
  }

  function bindProjectActions(p){
    const edit=qs('#editProjectBtn'); if(edit) edit.onclick=()=>projectModal(p);
    qsa('[data-room]').forEach(b=>b.onclick=e=>{if(e.target.closest('[data-edit-room],[data-delete-room]'))return;photoFilter=b.dataset.room; go('project',p.id,'photos');});
    const add=()=>choosePhotos(p.id,photoFilter!=='Todas'?photoFilter:null);
    ['#addPhotosBtn','#addPhotoTile'].forEach(sel=>{const b=qs(sel);if(b)b.onclick=add;});
    const manageOverview=qs('#manageRoomsOverview');if(manageOverview)manageOverview.onclick=()=>go('project',p.id,'rooms');
    const managePhotos=qs('#manageRoomsPhotos');if(managePhotos)managePhotos.onclick=()=>go('project',p.id,'rooms');
    const addRoom=qs('#addRoomBtn');if(addRoom)addRoom.onclick=()=>roomModal(p);
    qsa('[data-edit-room]').forEach(b=>b.onclick=e=>{e.stopPropagation();roomModal(p,b.dataset.editRoom);});
    qsa('[data-delete-room]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteRoom(p,b.dataset.deleteRoom);});
    qsa('[data-photo-filter]').forEach(b=>b.onclick=()=>{photoFilter=b.dataset.photoFilter;renderProject();});
    const gfp=qs('#generateFromPhotos'); if(gfp) gfp.onclick=()=>autoPresentationModal(p);
    const allPdf=qs('#includeAllPhotos'); if(allPdf) allPdf.onclick=()=>{p.photos.forEach(ph=>ph.includeInPresentation=true);normalizePhotoOrder(p);save();renderProject();toast('Todas as fotografias foram incluídas na apresentação.');};
    const reorderBtn=qs('#reorderPhotosBtn'); if(reorderBtn) reorderBtn.onclick=()=>reorderPhotosModal(p);
    qsa('[data-move-photo-up]').forEach(b=>b.onclick=()=>{movePhotoInPresentation(p,b.dataset.movePhotoUp,-1);renderProject();});
    qsa('[data-move-photo-down]').forEach(b=>b.onclick=()=>{movePhotoInPresentation(p,b.dataset.movePhotoDown,1);renderProject();});
    qsa('[data-toggle-photo]').forEach(b=>b.onclick=()=>{const ph=photoById(p,b.dataset.togglePhoto);if(!ph)return;ph.includeInPresentation=ph.includeInPresentation===false; if(ph.includeInPresentation===false&&p.coverPhotoId===ph.id)p.coverPhotoId=null;normalizePhotoOrder(p);save();renderProject();});
    qsa('[data-cover-photo]').forEach(b=>b.onclick=()=>{const ph=photoById(p,b.dataset.coverPhoto);if(!ph)return;ph.includeInPresentation=true;p.coverPhotoId=(p.coverPhotoId===ph.id?null:ph.id);save();renderProject();toast(p.coverPhotoId===ph.id?'Fotografia definida como capa.':'Seleção de capa removida.');});
    qsa('[data-edit-photo]').forEach(b=>b.onclick=()=>openEditor(p.id,b.dataset.editPhoto));
    qsa('[data-del-photo]').forEach(b=>b.onclick=()=>{if(confirm('Eliminar esta fotografia?')){if(p.coverPhotoId===b.dataset.delPhoto)p.coverPhotoId=null;p.photos=p.photos.filter(x=>x.id!==b.dataset.delPhoto);save();renderProject();}});
    qsa('[data-classify-photo]').forEach(b=>b.onclick=()=>classifyPhoto(p,photoById(p,b.dataset.classifyPhoto)));
    const sn=qs('#saveNotes'); if(sn) sn.onclick=()=>{p.notes=qs('#notesArea').value;save();toast('Notas guardadas.');};
    const ag=qs('#autoGenerate'); if(ag) ag.onclick=()=>autoPresentationModal(p);
    const pb=qs('#presentationBriefBtn'); if(pb) pb.onclick=()=>presentationBriefModal(p);
    const ap=qs('#addPhotosFromPresentation'); if(ap) ap.onclick=()=>choosePhotos(p.id);
    const ob=qs('#openBuilder'); if(ob) ob.onclick=()=>go('builder',p.id);
    const sp=qs('#startPresentation'); if(sp) sp.onclick=()=>startPresentation(p);
    qsa('#printPdf,#printPdf2').forEach?.(()=>{});
    const p1=qs('#printPdf');if(p1)p1.onclick=()=>printProject(p);
    const p2=qs('#printPdf2');if(p2)p2.onclick=()=>printProject(p);
    const ex=qs('#exportProject');if(ex)ex.onclick=()=>exportProject(p);
    const di=qs('#downloadImages');if(di)di.onclick=()=>downloadProjectImages(p);
    const sh=qs('#shareProjectFile');if(sh)sh.onclick=()=>shareProject(p);
  }

  function classifyPhoto(p,ph){
    const opts=[...(p.rooms||[]),UNASSIGNED_ROOM].map(r=>`<option value="${escapeHtml(r)}" ${ph.room===r?'selected':''}>${escapeHtml(r)}</option>`).join('');
    modal(`<h3>Escolher divisão</h3><p class="modal-help">Esta fotografia fica organizada na divisão selecionada.</p><div class="field"><label>Divisão</label><select id="photoRoomSelect">${opts}</select></div><div class="modal-actions split"><button class="btn" id="newRoomFromPhoto">+ Nova divisão</button><div><button class="btn" data-close>Cancelar</button> <button class="btn primary" id="savePhotoRoom">Guardar</button></div></div>`);
    qs('#newRoomFromPhoto').onclick=()=>{closeModal();roomModal(p,null,name=>{ph.room=name;save();renderProject();toast('Divisão criada e fotografia classificada.');});};
    qs('#savePhotoRoom').onclick=()=>{ph.room=qs('#photoRoomSelect').value||UNASSIGNED_ROOM;save();closeModal();renderProject();toast('Divisão atualizada.');};
  }
  function roomModal(p,oldName=null,afterSave=null){
    const editing=!!oldName;
    modal(`<h3>${editing?'Editar divisão':'Nova divisão'}</h3><p class="modal-help">Ex.: Sala de Estar, Suite Principal, Quarto Tomás, Escritório, Hall...</p><div class="field"><label>Nome da divisão</label><input id="roomNameInput" value="${escapeHtml(oldName||'')}" placeholder="Nome da divisão" maxlength="60"></div><div class="modal-actions"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="saveRoomBtn">${editing?'Guardar alteração':'Adicionar divisão'}</button></div>`);
    const input=qs('#roomNameInput'); input.focus(); input.select();
    qs('#saveRoomBtn').onclick=()=>{
      const name=input.value.trim(); if(!name)return toast('Escreve o nome da divisão.');
      if(name===UNASSIGNED_ROOM)return toast(`“${UNASSIGNED_ROOM}” é reservado para fotografias por classificar.`);
      const duplicate=(p.rooms||[]).some(r=>r.toLowerCase()===name.toLowerCase()&&r!==oldName); if(duplicate)return toast('Essa divisão já existe.');
      if(editing){
        const idx=p.rooms.indexOf(oldName); if(idx>=0)p.rooms[idx]=name;
        p.photos.forEach(ph=>{if(ph.room===oldName)ph.room=name;});
        if(photoFilter===oldName)photoFilter=name;
      }else p.rooms.push(name);
      save();closeModal();renderProject();toast(editing?'Divisão atualizada.':'Divisão adicionada.'); if(afterSave)afterSave(name);
    };
    input.addEventListener('keydown',e=>{if(e.key==='Enter')qs('#saveRoomBtn').click();});
  }
  function deleteRoom(p,name){
    const count=p.photos.filter(ph=>ph.room===name).length;
    const msg=count?`Eliminar “${name}”? As ${count} fotografia(s) desta divisão serão movidas para “${UNASSIGNED_ROOM}”.`:`Eliminar a divisão “${name}”?`;
    if(!confirm(msg))return;
    p.rooms=p.rooms.filter(r=>r!==name);p.photos.forEach(ph=>{if(ph.room===name)ph.room=UNASSIGNED_ROOM;});if(photoFilter===name)photoFilter='Todas';save();renderProject();toast('Divisão eliminada.');
  }

  function projectModal(p=null){
    const isEdit=!!p; const src=p||{name:'',client:'',location:'',type:'',status:'Em desenvolvimento',notes:''};
    modal(`<h3>${isEdit?'Editar projeto':'Novo projeto'}</h3><div class="form-grid"><div class="field"><label>Nome do projeto</label><input id="mName" value="${escapeHtml(src.name)}" placeholder="Ex.: Casa Silva"></div><div class="field"><label>Cliente</label><input id="mClient" value="${escapeHtml(src.client)}" placeholder="Nome do cliente"></div><div class="field"><label>Localização</label><input id="mLocation" value="${escapeHtml(src.location)}" placeholder="Ex.: Porto"></div><div class="field"><label>Tipologia</label><input id="mType" value="${escapeHtml(src.type)}" placeholder="Ex.: Cozinha + Sala"></div><div class="field"><label>Estado</label><select id="mStatus"><option>Conceito</option><option>Em desenvolvimento</option><option>Apresentação</option><option>Concluído</option></select></div><div class="field full"><label>Notas / objetivos</label><textarea id="mNotes" placeholder="Objetivos, estilo, materiais...">${escapeHtml(src.notes)}</textarea></div></div><div class="modal-actions"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="saveProjectModal">${isEdit?'Guardar':'Criar projeto'}</button></div>`);
    qs('#mStatus').value=src.status||'Em desenvolvimento';
    qs('#saveProjectModal').onclick=()=>{
      const name=qs('#mName').value.trim(); if(!name) return toast('Indica o nome do projeto.');
      const values={name,client:qs('#mClient').value.trim(),location:qs('#mLocation').value.trim(),type:qs('#mType').value.trim(),status:qs('#mStatus').value,notes:qs('#mNotes').value.trim()};
      if(isEdit) Object.assign(p,values);
      else{
        const n={id:uid(),...values,created:new Date().toISOString().slice(0,10),coverAsset:demoAssets[data.projects.length%demoAssets.length],rooms:[...DEFAULT_ROOMS],photos:[],pages:[{id:uid(),layout:'cover',title:name,subtitle:'Proposta de interiores e mobiliário'}]};
        data.projects.unshift(n); route={screen:'project',projectId:n.id,tab:'overview'};
      }
      save();closeModal();render();toast(isEdit?'Projeto atualizado.':'Projeto criado.');
    };
  }
  function modal(html){const bg=document.createElement('div');bg.className='modal-backdrop';bg.innerHTML=`<div class="modal">${html}</div>`;document.body.appendChild(bg);bg.addEventListener('click',e=>{if(e.target===bg||e.target.closest('[data-close]'))bg.remove();});}
  function closeModal(){qs('.modal-backdrop')?.remove();}

  function choosePhotos(projectId,preferredRoom=null){
    const p=data.projects.find(x=>x.id===projectId);if(!p)return;
    const rooms=[...(p.rooms||[]),UNASSIGNED_ROOM];
    const preferred=rooms.includes(preferredRoom)?preferredRoom:(p.rooms?.[0]||UNASSIGNED_ROOM);
    modal(`<h3>Adicionar fotografias</h3><p class="modal-help">Escolhe primeiro a divisão. Todas as imagens que selecionares agora ficam logo organizadas nela.</p><div class="field"><label>Divisão</label><select id="uploadRoomSelect">${rooms.map(r=>`<option value="${escapeHtml(r)}" ${r===preferred?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></div><div class="modal-actions split"><button class="btn" id="newRoomUpload">+ Nova divisão</button><div><button class="btn" data-close>Cancelar</button> <button class="btn primary" id="continuePhotos">Escolher fotografias</button></div></div>`);
    qs('#newRoomUpload').onclick=()=>{closeModal();roomModal(p,null,name=>choosePhotos(projectId,name));};
    qs('#continuePhotos').onclick=()=>{photoInput.dataset.project=projectId;photoInput.dataset.room=qs('#uploadRoomSelect').value||UNASSIGNED_ROOM;photoInput.value='';closeModal();photoInput.click();};
  }
  photoInput.onchange=async()=>{
    const p=data.projects.find(x=>x.id===photoInput.dataset.project); if(!p)return;
    const targetRoom=photoInput.dataset.room||UNASSIGNED_ROOM;
    for(const file of [...photoInput.files]){
      try{const pic=await resizeImage(file,1600,.82);p.photos.push({id:uid(),name:file.name,label:'Fotografia',room:targetRoom,data:pic.data,width:pic.width,height:pic.height,orientation:pic.width>=pic.height?'landscape':'portrait',includeInPresentation:true,created:Date.now()});}catch(e){console.error(e);}
    }
    try{save();}catch(e){toast('O armazenamento local está cheio. Exporta o projeto antes de adicionar mais fotografias.');}
    route={screen:'project',projectId:p.id,tab:'photos'};photoFilter=targetRoom;render();toast(`Fotografias adicionadas a “${targetRoom}”.`);
  };
  function resizeImage(file,max,quality){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;const s=Math.min(1,max/Math.max(w,h));w=Math.round(w*s);h=Math.round(h*s);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve({data:c.toDataURL('image/jpeg',quality),width:w,height:h});};img.onerror=reject;img.src=r.result;};r.onerror=reject;r.readAsDataURL(file);});}

  function openEditor(projectId,photoId){editor={projectId,photoId,tool:'draw',color:'#ef3f32',canvas:null,ctx:null,img:null,drawing:false,start:null,snapshot:null,history:[]};route={screen:'editor',projectId,tab:'photos'};render();}
  function renderEditor(){
    const p=data.projects.find(x=>x.id===editor.projectId),ph=p&&photoById(p,editor.photoId);if(!p||!ph)return go('projects');
    app.innerHTML=`<div class="workspace"><div class="workspace-top"><div class="group"><button class="tooltop" id="backPhotos">← Voltar</button><span style="font-size:12px;font-weight:700;margin-left:8px">Editar fotografia</span></div><div class="group"><button class="tooltop active" data-tool="draw">✎ <span class="txt">Desenhar</span></button><button class="tooltop" data-tool="measure">↔ <span class="txt">Medir</span></button><button class="tooltop" data-tool="text">T <span class="txt">Texto</span></button><button class="tooltop" data-tool="arrow">→ <span class="txt">Seta</span></button><button class="tooltop" data-tool="line">╱ <span class="txt">Linha</span></button><button class="tooltop" data-tool="rect">□ <span class="txt">Retângulo</span></button><button class="tooltop" data-tool="circle">○ <span class="txt">Círculo</span></button><button class="tooltop" id="undoTool">↶</button><button class="tooltop" id="rotateTool">↻</button><button class="tooltop" id="brightnessTool">☀</button></div><div class="group"><button class="btn primary" id="saveEditedPhoto">Guardar</button></div></div><div class="editor-stage"><canvas id="editCanvas"></canvas><div class="floating-palette"><button class="swatch active" data-color="#ef3f32" style="background:#ef3f32"></button><button class="swatch" data-color="#245da0" style="background:#245da0"></button><button class="swatch" data-color="#222629" style="background:#222629"></button><button class="swatch" data-color="#ffffff" style="background:#fff"></button></div><div class="measure-tip">Apple Pencil / rato: desenha diretamente sobre a imagem. Em “Medir”, escreve a medida real no fim.</div></div></div>`;
    qs('#backPhotos').onclick=()=>go('project',p.id,'photos');
    qsa('[data-tool]').forEach(b=>b.onclick=()=>{editor.tool=b.dataset.tool;qsa('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));});
    qsa('[data-color]').forEach(b=>b.onclick=()=>{editor.color=b.dataset.color;qsa('[data-color]').forEach(x=>x.classList.toggle('active',x===b));});
    qs('#undoTool').onclick=undoEditor;
    qs('#rotateTool').onclick=rotateCanvas;
    qs('#brightnessTool').onclick=()=>{const v=prompt('Brilho em % (ex.: 110 para +10%, 90 para -10%):','110');if(v)applyCanvasFilter(`brightness(${Math.max(20,Math.min(200,Number(v)||100))}%)`);};
    qs('#saveEditedPhoto').onclick=()=>{const d=editor.canvas.toDataURL('image/jpeg',.9);p.photos.push({id:uid(),name:'anotada.jpg',label:'Imagem anotada',room:ph.room||UNASSIGNED_ROOM,data:d,includeInPresentation:true,created:Date.now()});save();toast('Imagem anotada guardada.');go('project',p.id,'photos');};
    initCanvas(ph.data);
  }
  function initCanvas(src){const c=qs('#editCanvas'),ctx=c.getContext('2d'),img=new Image();editor.canvas=c;editor.ctx=ctx;editor.img=img;img.onload=()=>{const max=1400,s=Math.min(1,max/img.width);c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);ctx.drawImage(img,0,0,c.width,c.height);editor.history=[];bindCanvasEvents();};img.src=src;}
  function pushHistory(){try{editor.history.push(editor.canvas.toDataURL('image/png'));if(editor.history.length>12)editor.history.shift();}catch(e){}}
  function undoEditor(){const prev=editor.history.pop();if(!prev)return;restoreCanvas(prev);}
  function restoreCanvas(src){const img=new Image();img.onload=()=>{editor.canvas.width=img.width;editor.canvas.height=img.height;editor.ctx=editor.canvas.getContext('2d');editor.ctx.drawImage(img,0,0);bindCanvasEvents();};img.src=src;}
  function rotateCanvas(){pushHistory();const old=editor.canvas,tmp=document.createElement('canvas');tmp.width=old.height;tmp.height=old.width;const t=tmp.getContext('2d');t.translate(tmp.width/2,tmp.height/2);t.rotate(Math.PI/2);t.drawImage(old,-old.width/2,-old.height/2);old.width=tmp.width;old.height=tmp.height;editor.ctx=old.getContext('2d');editor.ctx.drawImage(tmp,0,0);bindCanvasEvents();}
  function applyCanvasFilter(filter){pushHistory();const c=editor.canvas,tmp=document.createElement('canvas');tmp.width=c.width;tmp.height=c.height;const t=tmp.getContext('2d');t.filter=filter;t.drawImage(c,0,0);editor.ctx.clearRect(0,0,c.width,c.height);editor.ctx.drawImage(tmp,0,0);}
  function pos(e,c){const r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*(c.width/r.width),y:(t.clientY-r.top)*(c.height/r.height)};}
  function bindCanvasEvents(){
    const c=editor.canvas,ctx=editor.ctx;
    const down=e=>{e.preventDefault();editor.drawing=true;editor.start=pos(e,c);pushHistory();editor.snapshot=ctx.getImageData(0,0,c.width,c.height);if(editor.tool==='text'){editor.drawing=false;const t=prompt('Texto a inserir:');if(t)drawText(ctx,t,editor.start.x,editor.start.y,editor.color);return;}ctx.beginPath();ctx.moveTo(editor.start.x,editor.start.y);};
    const move=e=>{if(!editor.drawing)return;e.preventDefault();const p=pos(e,c);if(editor.tool==='draw'){ctx.strokeStyle=editor.color;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineTo(p.x,p.y);ctx.stroke();return;}ctx.putImageData(editor.snapshot,0,0);if(editor.tool==='line')drawLine(ctx,editor.start,p,editor.color,false);if(editor.tool==='arrow'||editor.tool==='measure')drawLine(ctx,editor.start,p,editor.color,true);if(editor.tool==='rect')drawRect(ctx,editor.start,p,editor.color);if(editor.tool==='circle')drawCircle(ctx,editor.start,p,editor.color);};
    const up=e=>{if(!editor.drawing)return;const p=pos(e,c);move(e);editor.drawing=false;if(editor.tool==='measure'){const label=prompt('Indica a medida real (ex.: 3420 mm):','');if(label)drawText(ctx,label,(editor.start.x+p.x)/2,(editor.start.y+p.y)/2-12,editor.color);}};
    c.onmousedown=down;c.onmousemove=move;c.onmouseup=up;c.onmouseleave=()=>{editor.drawing=false;};c.ontouchstart=down;c.ontouchmove=move;c.ontouchend=e=>{if(editor.drawing){const p=editor.start;editor.drawing=false;if(editor.tool==='measure'){const label=prompt('Indica a medida real (ex.: 3420 mm):','');if(label)drawText(ctx,label,p.x,p.y-15,editor.color);}}};
  }
  function drawText(ctx,t,x,y,color){ctx.save();ctx.font='700 27px system-ui';ctx.fillStyle=color;ctx.strokeStyle='rgba(255,255,255,.94)';ctx.lineWidth=7;ctx.lineJoin='round';ctx.strokeText(t,x,y);ctx.fillText(t,x,y);ctx.restore();}
  function drawLine(ctx,a,b,color,arrow){ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(arrow){const ang=Math.atan2(b.y-a.y,b.x-a.x),len=18;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-len*Math.cos(ang-Math.PI/6),b.y-len*Math.sin(ang-Math.PI/6));ctx.lineTo(b.x-len*Math.cos(ang+Math.PI/6),b.y-len*Math.sin(ang+Math.PI/6));ctx.closePath();ctx.fill();}ctx.restore();}
  function drawRect(ctx,a,b,color){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=5;ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);ctx.restore();}
  function drawCircle(ctx,a,b,color){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=5;const rx=Math.abs(b.x-a.x)/2,ry=Math.abs(b.y-a.y)/2;ctx.beginPath();ctx.ellipse((a.x+b.x)/2,(a.y+b.y)/2,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.restore();}

  function renderBuilder(){
    const p=project();if(!p)return go('projects');if(!p.pages.length)p.pages=[{id:uid(),layout:'cover',title:p.name,subtitle:p.type}];
    if(!builderPageId||!p.pages.some(pg=>pg.id===builderPageId))builderPageId=p.pages[0].id;
    const active=p.pages.find(pg=>pg.id===builderPageId)||p.pages[0];
    const thumbs=p.pages.map((pg,i)=>{const ph=pg.photoId?photoById(p,pg.photoId):p.photos[0];return `<div class="page-thumb ${pg.id===active.id?'active':''}" data-page-id="${pg.id}"><div class="mini" style="${ph?`background-image:url('${ph.data}')`:`background-image:url('${coverOf(p,i)}')`}"></div><small>${i+1}. ${labelLayout(pg.layout)}</small><div class="page-order-actions"><button data-page-up="${pg.id}" title="Mover página para cima" ${i===0?'disabled':''}>↑</button><button data-page-down="${pg.id}" title="Mover página para baixo" ${i===p.pages.length-1?'disabled':''}>↓</button></div></div>`;}).join('');
    app.innerHTML=`<div class="builder-shell"><div class="builder-top"><div style="display:flex;align-items:center;gap:10px"><button class="tooltop" id="backBuilder">←</button><span style="font-size:11px;color:#777">${escapeHtml(p.name)}</span></div><div style="display:flex;gap:4px"><button class="tooltop" id="editPage">T &nbsp;Texto</button><button class="tooltop" id="editPageImage">▧ &nbsp;Imagem</button><button class="tooltop" id="addLayout">▦ &nbsp;Layouts</button><button class="tooltop" id="themes">◇ &nbsp;Temas</button></div><div style="display:flex;gap:7px"><button class="btn" id="previewPresentation">Pré-visualizar</button><button class="btn primary" id="printBuilder">Guardar / PDF</button></div></div><div class="builder-layout"><aside class="pages-panel">${thumbs}<button class="btn small" style="width:100%" id="addPage">+ Adicionar página</button></aside><main class="builder-main"><div class="builder-stage" id="builderStage">${slideHtml(p,active)}</div><div class="builder-bottom">${['officialCover','officialServices','officialBrief','officialSection','officialFull','officialPair','officialStrip','officialContact','cover','brief','one','two','portraitPair','mixed','three','four','text','moodboard','beforeafter','section','details','contact'].map(l=>`<button class="layout-chip ${active.layout===l?'active':''}" data-layout="${l}">${labelLayout(l)}</button>`).join('')}</div></main></div></div>`;
    qs('#backBuilder').onclick=()=>go('project',p.id,'presentation');
    qs('#previewPresentation').onclick=()=>startPresentation(p);
    qs('#printBuilder').onclick=()=>printProject(p);
    qs('#addPage').onclick=()=>layoutModal(p,true);
    qs('#addLayout').onclick=()=>layoutModal(p,false,active);
    qs('#themes').onclick=()=>themeModal(p);
    qs('#editPage').onclick=()=>editPageModal(p,active);
    qs('#editPageImage').onclick=()=>editPageModal(p,active);
    qs('#builderStage').onclick=()=>editPageModal(p,active);
    qsa('[data-page-id]').forEach(x=>x.onclick=()=>{builderPageId=x.dataset.pageId;renderBuilder();});
    qsa('[data-page-up]').forEach(b=>b.onclick=e=>{e.stopPropagation();movePage(p,b.dataset.pageUp,-1);builderPageId=b.dataset.pageUp;renderBuilder();});
    qsa('[data-page-down]').forEach(b=>b.onclick=e=>{e.stopPropagation();movePage(p,b.dataset.pageDown,1);builderPageId=b.dataset.pageDown;renderBuilder();});
    qsa('[data-layout]').forEach(b=>b.onclick=()=>{active.layout=b.dataset.layout;active.photoId=active.photoId||p.photos[0]?.id||null;save();renderBuilder();});
  }
  function labelLayout(l){return({officialCover:'Capa oficial',officialServices:'Serviços',officialBrief:'Ficha oficial',officialSection:'Visualização 3D',officialFull:'Imagem total',officialPair:'Composição 2',officialStrip:'Mosaico final',officialContact:'Contactos oficiais',cover:'Capa',one:'Uma imagem',two:'Duas imagens',portraitPair:'Duas verticais',mixed:'Destaque + 2',three:'Três imagens',four:'Quatro imagens',text:'Imagem + texto',moodboard:'Moodboard',beforeafter:'Antes e depois',section:'Separador',details:'Detalhes',brief:'Ficha do projeto',contact:'Contactos'})[l]||l;}
  function layoutModal(p,isNew,pg=null){
    const layouts=['officialCover','officialServices','officialBrief','officialSection','officialFull','officialPair','officialStrip','officialContact','cover','brief','one','two','portraitPair','mixed','three','four','text','moodboard','beforeafter','section','details','contact'];
    modal(`<h3>${isNew?'Escolher modelo de página':'Alterar modelo'}</h3><div class="layout-picker">${layouts.map(l=>`<button class="layout-card" data-pick-layout="${l}"><div class="shape"></div><span>${labelLayout(l)}</span></button>`).join('')}</div><div class="modal-actions"><button class="btn" data-close>Cancelar</button></div>`);
    qsa('[data-pick-layout]').forEach(b=>b.onclick=()=>{const l=b.dataset.pickLayout;if(isNew){const n={id:uid(),layout:l,title:l==='cover'?p.name:'Nova página',subtitle:'',photoId:p.photos[0]?.id||null,photo2Id:p.photos[1]?.id||null,photo3Id:p.photos[2]?.id||null,photo4Id:p.photos[3]?.id||null};p.pages.push(n);builderPageId=n.id;}else{pg.layout=l;}save();closeModal();renderBuilder();});
  }
  function themeInfo(id){
    return ({
      official:{label:'ADC Oficial',desc:'Identidade aprovada da ADC Studio'},
      warm:{label:'ADC Warm',desc:'Tons quentes e elegantes'},
      architectural:{label:'Arquitetura',desc:'Claro, técnico e minimal'},
      editorial:{label:'Editorial',desc:'Aspeto de revista premium'},
      dark:{label:'Dark Luxe',desc:'Escuro, sofisticado e contrastante'},
      gallery:{label:'Galeria',desc:'Máximo destaque às imagens'}
    })[id]||{label:'ADC Oficial',desc:'Identidade aprovada da ADC Studio'};
  }
  function themeModal(p){
    const current=p.presentationTheme||'official';
    modal(`<div class="auto-modal-head"><div><div class="auto-kicker">ESTILO VISUAL</div><h3>Escolher tema da apresentação</h3><p>O tema oficial é a referência aprovada da ADC Studio.</p></div></div>
      <div class="theme-grid">
        <button class="theme-card ${current==='official'?'selected':''}" data-theme="official"><div class="theme-swatch theme-official"><i></i><i></i><i></i></div><b>ADC Oficial</b><small>Modelo aprovado</small></button>
        <button class="theme-card ${current==='warm'?'selected':''}" data-theme="warm"><div class="theme-swatch theme-warm"><i></i><i></i><i></i></div><b>ADC Warm</b><small>Tons quentes e elegantes</small></button>
        <button class="theme-card ${current==='architectural'?'selected':''}" data-theme="architectural"><div class="theme-swatch theme-architectural"><i></i><i></i><i></i></div><b>Arquitetura</b><small>Claro, técnico e minimal</small></button>
        <button class="theme-card ${current==='editorial'?'selected':''}" data-theme="editorial"><div class="theme-swatch theme-editorial"><i></i><i></i><i></i></div><b>Editorial</b><small>Aspeto de revista premium</small></button>
        <button class="theme-card ${current==='dark'?'selected':''}" data-theme="dark"><div class="theme-swatch theme-dark"><i></i><i></i><i></i></div><b>Dark Luxe</b><small>Escuro e sofisticado</small></button>
        <button class="theme-card ${current==='gallery'?'selected':''}" data-theme="gallery"><div class="theme-swatch theme-gallery"><i></i><i></i><i></i></div><b>Galeria</b><small>Máximo destaque às imagens</small></button>
      </div>
      <div class="modal-actions"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="saveTheme">Aplicar tema</button></div>`);
    let chosen=current;
    qsa('[data-theme]').forEach(b=>b.onclick=()=>{chosen=b.dataset.theme;qsa('[data-theme]').forEach(x=>x.classList.toggle('selected',x===b));});
    qs('#saveTheme').onclick=()=>{p.presentationTheme=chosen;save();closeModal();renderBuilder();toast(`Tema aplicado: ${themeInfo(chosen).label}`);};
  }

  function slideBrand(kind='standard'){return `<div class="brand-mini ${kind==='cover'?'cover-brand':'header-brand'}">${brandHtml(true)}</div>`;}
  function photoShape(ph){
    if(!ph)return 'landscape';
    if(ph.orientation)return ph.orientation;
    if(ph.width&&ph.height)return ph.width>ph.height*1.08?'landscape':ph.height>ph.width*1.08?'portrait':'square';
    return 'landscape';
  }
  function slideHtml(p,pg){
    if(!pg)return `<div class="slide"></div>`;
    const ph=pg.photoId?photoById(p,pg.photoId):p.photos[0];
    const ph2=pg.photo2Id?photoById(p,pg.photo2Id):p.photos[1];
    const ph3=pg.photo3Id?photoById(p,pg.photo3Id):p.photos[2];
    const ph4=pg.photo4Id?photoById(p,pg.photo4Id):p.photos[3];
    const img1=ph?.data||coverOf(p,0),img2=ph2?.data||coverOf(p,1),img3=ph3?.data||coverOf(p,2),img4=ph4?.data||coverOf(p,3);
    const contain1=pg.fit==='contain'||photoShape(ph)==='portrait';
    const themeClass=`theme-${p.presentationTheme||'official'}`;
    const co=data.company||{},md=data.modelDefaults||{};
    const htmlLines=v=>escapeHtml(v||'').replace(/\n/g,'<br>');
    if(pg.layout==='officialCover')return `<div class="slide official-cover"><div class="official-cover-inner">${officialBrandHtml('center')}<div class="official-cover-tag">${escapeHtml(md.coverTagline||'INTERIOR DESIGN | MOBILIÁRIO')}</div></div></div>`;
    if(pg.layout==='officialServices')return `<div class="slide official-light official-services">${officialBrandHtml('corner')}<div class="official-services-grid"><div><h2>${htmlLines(md.service1Title||'INTERIOR\nDESIGN')}</h2><p>${escapeHtml(md.service1Text||'')}</p></div><div><h2>${htmlLines(md.service2Title||'MOBILIÁRIO\nÀ MEDIDA')}</h2><p>${escapeHtml(md.service2Text||'')}</p></div></div></div>`;
    if(pg.layout==='officialBrief'){const pts=(pg.points||p.presentationPoints||[]).filter(Boolean);return `<div class="slide official-light official-brief">${officialBrandHtml('corner')}<div class="official-brief-date">${escapeHtml((p.created||'').split('-').reverse().join('-'))}</div><div class="official-brief-left"><small>Cliente</small><h2>${escapeHtml(p.client||p.name||'Projeto')}</h2><h3>${escapeHtml(p.type||'Habitação')}</h3><h3>${escapeHtml(p.location||'')}</h3></div><div class="official-brief-right"><p>${escapeHtml(pg.subtitle||p.presentationConcept||'Proposta de layout do espaço e decoração.')}</p><b>Pontos Principais:</b><ul>${pts.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div></div>`;}
    if(pg.layout==='officialSection')return `<div class="slide official-light official-section">${officialBrandHtml('corner')}<h2>${escapeHtml(pg.title||md.sectionTitle||'Visualização 3D')}</h2><div class="official-rights">${escapeHtml(md.rightsText||'')}</div></div>`;
    if(pg.layout==='officialFull')return `<div class="slide official-full"><img src="${img1}" alt=""></div>`;
    if(pg.layout==='officialPair')return `<div class="slide official-light official-pair">${officialBrandHtml('corner')}<div class="official-pair-left"><img src="${img1}" alt=""></div><div class="official-pair-right"><img src="${img2}" alt=""></div></div>`;
    if(pg.layout==='officialStrip'){const imgs=[img1,img2,img3,img4,pg.photo5Id?photoById(p,pg.photo5Id)?.data:null].filter(Boolean);return `<div class="slide official-light official-strip">${officialBrandHtml('corner')}<div class="official-strip-grid count-${imgs.length}">${imgs.map(src=>`<img src="${src}" alt="">`).join('')}</div><div class="official-rights">${escapeHtml(md.stripRights||'')}</div></div>`;}
    if(pg.layout==='officialContact'){const contact=(name,role,phone)=>name||role||phone?`<div class="official-contact-person"><b>${escapeHtml(name||'')}</b><span>${escapeHtml(role||'')}</span><span>${escapeHtml(phone||'')}</span></div>`:'';return `<div class="slide official-light official-contact"><div class="official-contact-brand">${officialBrandHtml('contact')}</div><div class="official-contact-details"><div>${co.email?`<span>${escapeHtml(co.email)}</span>`:''}${co.phone?`<span>${escapeHtml(co.phone)}</span>`:''}${co.address?`<span>${escapeHtml(co.address)}</span>`:''}${co.website?`<span>${escapeHtml(co.website)}</span>`:''}</div><div class="official-contact-people">${contact(co.contact1Name,co.contact1Role,co.contact1Phone)}${contact(co.contact2Name,co.contact2Role,co.contact2Phone)}</div></div></div>`;}
    if(pg.layout==='cover')return `<div class="slide cover-slide ${themeClass}">${slideBrand('cover')}<img class="photo-big" src="${img1}"><div class="title-block"><div class="eyebrow">PROPOSTA DE INTERIORES</div><h2>${escapeHtml(pg.title||p.presentationTitle||p.name)}</h2><p>${escapeHtml(pg.subtitle||p.presentationSubtitle||p.type||'')}</p></div><div class="foot">DESIGN • MOBILIÁRIO • PESSOAS</div></div>`;
    if(pg.layout==='brief'){const pts=(pg.points||p.presentationPoints||[]).filter(Boolean);return `<div class="slide brief-slide ${themeClass}">${slideBrand()}<div class="brief-left"><div class="brief-kicker">CLIENTE</div><h3>${escapeHtml(p.client||'Projeto')}</h3><div class="brief-meta"><b>${escapeHtml(p.type||'Interiores')}</b><span>${escapeHtml(p.location||'')}</span></div></div><div class="brief-right"><div class="eyebrow">PONTOS PRINCIPAIS</div><h2>${escapeHtml(pg.title||p.presentationTitle||p.name)}</h2><p>${escapeHtml(pg.subtitle||p.presentationConcept||'')}</p>${pts.length?`<ul>${pts.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:''}</div></div>`;}
    if(pg.layout==='section')return `<div class="slide section-slide ${themeClass}">${slideBrand()}<div class="section-slide-copy"><div class="eyebrow">ADC STUDIO</div><h2>${escapeHtml(pg.title||'Ambiente')}</h2><div class="section-rule"></div><p>${escapeHtml(pg.subtitle||'Seleção visual do ambiente')}</p></div></div>`;
    if(pg.layout==='one')return `<div class="slide standard-slide ${themeClass}">${slideBrand()}<div class="slide-title">${escapeHtml(pg.title||'Visualização')}</div><div class="single-frame ${contain1?'contain-frame':''}"><img src="${img1}"></div></div>`;
    if(pg.layout==='two'||pg.layout==='beforeafter')return `<div class="slide standard-slide ${themeClass}">${slideBrand()}<div class="slide-title">${escapeHtml(pg.title||(pg.layout==='beforeafter'?'Antes e depois':'Visualização'))}</div><div class="slide-grid2"><img src="${img1}"><img src="${img2}"></div></div>`;
    if(pg.layout==='portraitPair')return `<div class="slide standard-slide ${themeClass}">${slideBrand()}<div class="slide-title">${escapeHtml(pg.title||'Visualização')}</div><div class="slide-portrait2"><div><img src="${img1}"></div><div><img src="${img2}"></div></div></div>`;
    if(pg.layout==='mixed')return `<div class="slide standard-slide ${themeClass}">${slideBrand()}<div class="slide-title">${escapeHtml(pg.title||'Ambiente em destaque')}</div><div class="slide-mixed"><img class="hero" src="${img1}"><div class="stack"><img src="${img2}"><img src="${img3}"></div></div></div>`;
    if(pg.layout==='three')return `<div class="slide standard-slide ${themeClass}">${slideBrand()}<div class="slide-title">${escapeHtml(pg.title||'Ambiente em destaque')}</div><div class="slide-grid3"><img src="${img1}"><img src="${img2}"><img src="${img3}"></div></div>`;
    if(pg.layout==='four')return `<div class="slide standard-slide ${themeClass}">${slideBrand()}<div class="slide-title">${escapeHtml(pg.title||'Seleção visual')}</div><div class="slide-grid4"><img src="${img1}"><img src="${img2}"><img src="${img3}"><img src="${img4}"></div></div>`;
    if(pg.layout==='text'||pg.layout==='details')return `<div class="slide text-slide ${themeClass}">${slideBrand('cover')}<div class="text-photo"><div class="copy"><div class="eyebrow">ADC STUDIO</div><h2>${escapeHtml(pg.title||'Conceito')}</h2><p>${escapeHtml(pg.subtitle||'Descrição do conceito, materiais e intenção do projeto.')}</p></div><img src="${img1}"></div></div>`;
    if(pg.layout==='moodboard')return `<div class="slide standard-slide ${themeClass}">${slideBrand()}<div class="slide-title">${escapeHtml(pg.title||'Moodboard')}</div><div style="position:absolute;inset:11% 5% 6%;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:2.5%"><img style="width:100%;height:100%;object-fit:cover" src="${img1}"><img style="width:100%;height:100%;object-fit:cover" src="${img2}"><img style="width:100%;height:100%;object-fit:cover" src="${img3}"><div style="background:#e5ddd3;display:grid;place-items:center;font-size:11px;color:#7a746e">MATERIAIS • TEXTURAS • CORES</div></div></div>`;
    if(pg.layout==='contact')return `<div class="slide contact-slide ${themeClass}">${slideBrand('cover')}<div class="contact-copy"><div class="eyebrow">ADC STUDIO</div><h2>Obrigado.</h2><p>${escapeHtml(pg.subtitle||p.presentationClosing||'Interiores pensados ao detalhe, do conceito à apresentação.')}</p><div class="contact-rule"></div><small>INTER4 MOBILIÁRIO • DESIGN • INTERIORES</small></div><img class="contact-photo" src="${img1}"></div>`;
    return `<div class="slide standard-slide ${themeClass}">${slideBrand()}<div class="single-frame"><img src="${img1}"></div></div>`;
  }
  function editPageModal(p,pg){
    const opts=p.photos.map(ph=>`<option value="${ph.id}">${escapeHtml(ph.room||ph.label||ph.name)}</option>`).join('');
    modal(`<h3>Editar página</h3><div class="form-grid"><div class="field full"><label>Título</label><input id="pgTitle" value="${escapeHtml(pg.title||'')}"></div><div class="field full"><label>Texto / subtítulo</label><textarea id="pgSub">${escapeHtml(pg.subtitle||'')}</textarea></div><div class="field"><label>Imagem 1</label><select id="pgPhoto"><option value="">Automática</option>${opts}</select></div><div class="field"><label>Imagem 2</label><select id="pgPhoto2"><option value="">Automática</option>${opts}</select></div><div class="field"><label>Imagem 3</label><select id="pgPhoto3"><option value="">Automática</option>${opts}</select></div><div class="field"><label>Imagem 4</label><select id="pgPhoto4"><option value="">Automática</option>${opts}</select></div><div class="field"><label>Imagem 5</label><select id="pgPhoto5"><option value="">Automática</option>${opts}</select></div></div><div class="modal-actions"><button class="btn danger" id="deletePage">Eliminar página</button><button class="btn" data-close>Cancelar</button><button class="btn primary" id="savePage">Guardar</button></div>`);
    if(pg.photoId)qs('#pgPhoto').value=pg.photoId;if(pg.photo2Id)qs('#pgPhoto2').value=pg.photo2Id;if(pg.photo3Id)qs('#pgPhoto3').value=pg.photo3Id;if(pg.photo4Id)qs('#pgPhoto4').value=pg.photo4Id;if(pg.photo5Id)qs('#pgPhoto5').value=pg.photo5Id;
    qs('#savePage').onclick=()=>{pg.title=qs('#pgTitle').value;pg.subtitle=qs('#pgSub').value;pg.photoId=qs('#pgPhoto').value||null;pg.photo2Id=qs('#pgPhoto2').value||null;pg.photo3Id=qs('#pgPhoto3').value||null;pg.photo4Id=qs('#pgPhoto4').value||null;pg.photo5Id=qs('#pgPhoto5')?.value||null;save();closeModal();renderBuilder();};
    qs('#deletePage').onclick=()=>{if(p.pages.length<=1)return toast('A apresentação precisa de pelo menos uma página.');if(confirm('Eliminar esta página?')){p.pages=p.pages.filter(x=>x.id!==pg.id);builderPageId=p.pages[0].id;save();closeModal();renderBuilder();}};
  }
  function startPresentation(p){
    if(!p.pages.length)return toast('Ainda não existem páginas.');presentationIndex=0;const o=document.createElement('div');o.className='presentation-overlay';o.innerHTML=`<div id="presentStage"></div><div class="presentation-counter" id="presentationCounter"></div><div class="presentation-controls"><button id="prevPres">←</button><button id="closePres">Fechar</button><button id="nextPres">→</button></div>`;document.body.appendChild(o);const draw=()=>{qs('#presentStage').innerHTML=slideHtml(p,p.pages[presentationIndex]);qs('#presentationCounter').textContent=`${presentationIndex+1} / ${p.pages.length}`;};draw();qs('#prevPres').onclick=()=>{presentationIndex=(presentationIndex-1+p.pages.length)%p.pages.length;draw();};qs('#nextPres').onclick=()=>{presentationIndex=(presentationIndex+1)%p.pages.length;draw();};qs('#closePres').onclick=()=>o.remove();
  }
  async function printProject(p){
    if(!p.pages.length)return toast('A apresentação ainda não tem páginas.');
    const btns=[...document.querySelectorAll('#printPdf,#printPdf2,#printBuilder')];btns.forEach(b=>{b.disabled=true;b.dataset.old=b.textContent;b.textContent='A criar PDF…';});
    try{await exportPdfDirect(p);toast('PDF criado e descarregado.');}
    catch(e){console.error(e);toast('Não foi possível criar o PDF. A abrir impressão como alternativa.');printProjectFallback(p);}
    finally{btns.forEach(b=>{b.disabled=false;b.textContent=b.dataset.old||'Gerar PDF';});}
  }
  function printProjectFallback(p){let root=qs('#printRoot');if(root)root.remove();root=document.createElement('div');root.id='printRoot';root.className='print-root';root.innerHTML=p.pages.map(pg=>`<section class="print-slide">${slideHtml(p,pg)}</section>`).join('');document.body.appendChild(root);setTimeout(()=>window.print(),150);}

  function autoPresentationModal(p){
    if(!p.photos.length){toast('Adiciona primeiro as imagens do projeto.');return;}
    const current=p.presentationTemplate||'official';
    const currentTheme=p.presentationTheme||'official';
    const currentPreset=p.presentationPreset||'official';
    const currentDensity=p.presentationDensity||'balanced';
    modal(`<div class="auto-modal-head"><div><div class="auto-kicker">GERAÇÃO AUTOMÁTICA</div><h3>Criar apresentação</h3><p>O modelo oficial ADC Studio é o padrão aprovado. Basta selecionar as imagens e gerar.</p></div></div>
      <div class="auto-subtitle">Modelos prontos</div>
      <div class="preset-grid preset-grid-v15">
        <button class="preset-card official-preset ${currentPreset==='official'?'selected':''}" data-preset="official" data-template-preset="official" data-theme-preset="official"><div class="preset-hero preset-official"><i></i><i></i><i></i><i></i><i></i></div><b>ADC Oficial <em>OFICIAL</em></b><small>Modelo aprovado: igual à apresentação de referência</small></button>
        <button class="preset-card ${currentPreset==='signature'?'selected':''}" data-preset="signature" data-template-preset="premium" data-theme-preset="warm"><div class="preset-hero preset-signature"><i></i><i></i><i></i></div><b>ADC Signature</b><small>Alternativa equilibrada</small></button>
        <button class="preset-card ${currentPreset==='editorial'?'selected':''}" data-preset="editorial" data-template-preset="editorial" data-theme-preset="editorial"><div class="preset-hero preset-editorial"><i></i><i></i><i></i></div><b>Editorial Interior</b><small>Visual de revista premium</small></button>
        <button class="preset-card ${currentPreset==='gallery'?'selected':''}" data-preset="gallery" data-template-preset="minimal" data-theme-preset="gallery"><div class="preset-hero preset-gallery"><i></i><i></i><i></i></div><b>Galeria Premium</b><small>Máximo destaque às fotografias</small></button>
        <button class="preset-card ${currentPreset==='architectural'?'selected':''}" data-preset="architectural" data-template-preset="minimal" data-theme-preset="architectural"><div class="preset-hero preset-architectural"><i></i><i></i><i></i></div><b>Arquitetura</b><small>Limpo, claro e técnico</small></button>
      </div>
      <div class="auto-subtitle">Quantidade de detalhe</div>
      <div class="density-grid">
        <button class="density-card ${currentDensity==='compact'?'selected':''}" data-density="compact"><b>Compacta</b><small>Mais imagens por página</small></button>
        <button class="density-card ${currentDensity==='balanced'?'selected':''}" data-density="balanced"><b>Equilibrada</b><small>Recomendada para clientes</small></button>
        <button class="density-card ${currentDensity==='detailed'?'selected':''}" data-density="detailed"><b>Detalhada</b><small>Mais páginas e imagens maiores</small></button>
      </div>
      <details class="advanced-presentation"><summary>Opções avançadas</summary>
        <div class="auto-options"><label><input type="checkbox" id="autoIntro" checked> Incluir ficha do projeto</label><label><input type="checkbox" id="autoGroup"> Separar por divisões (não recomendado no modelo oficial)</label><label><input type="checkbox" id="autoOptimize" checked> Adaptar layouts a imagens verticais/horizontais</label><label><input type="checkbox" id="autoNoRepeat" checked> Evitar repetir a imagem da capa</label><label><input type="checkbox" id="autoEnd" checked> Incluir página final</label></div>
      </details>
      <div class="auto-summary"><span>Imagens selecionadas: <b>${p.photos.filter(ph=>ph.includeInPresentation!==false).length}</b></span><span>Projeto: <b>${escapeHtml(p.name)}</b></span><span>Saída: <b>PDF panorâmico 16:9</b></span></div>
      <div class="modal-actions auto-modal-actions"><button class="btn" data-close>Cancelar</button><button class="btn" id="confirmAuto">✦ Gerar apresentação</button><button class="btn primary big" id="confirmAutoPdf">✦ Gerar + PDF</button></div>`);
    let chosen=current,chosenTheme=currentTheme,chosenPreset=currentPreset,chosenDensity=currentDensity;
    qsa('[data-preset]').forEach(b=>b.onclick=()=>{
      chosenPreset=b.dataset.preset;chosen=b.dataset.templatePreset;chosenTheme=b.dataset.themePreset;
      qsa('[data-preset]').forEach(x=>x.classList.toggle('selected',x===b));
      if(chosenPreset==='official'){const grp=qs('#autoGroup');if(grp)grp.checked=false;}
    });
    qsa('[data-density]').forEach(b=>b.onclick=()=>{chosenDensity=b.dataset.density;qsa('[data-density]').forEach(x=>x.classList.toggle('selected',x===b));});
    const run=async(downloadPdf=false)=>{
      if(!p.photos.some(ph=>ph.includeInPresentation!==false))return toast('Seleciona pelo menos uma fotografia para a apresentação.');
      const opts={intro:qs('#autoIntro')?.checked!==false,group:qs('#autoGroup')?.checked===true,optimize:qs('#autoOptimize')?.checked!==false,noRepeat:qs('#autoNoRepeat')?.checked!==false,end:qs('#autoEnd')?.checked!==false,density:chosenDensity};
      if(p.pages.length>1&&!confirm('Substituir a apresentação atual pela nova apresentação automática?'))return;
      p.presentationTheme=chosenTheme;p.presentationPreset=chosenPreset;p.presentationDensity=chosenDensity;p.presentationTemplate=chosen;autoGeneratePresentation(p,chosen,opts);closeModal();builderPageId=p.pages[0]?.id||null;save();toast(`Apresentação criada: ${p.pages.length} páginas.`);go('project',p.id,'presentation');
      if(downloadPdf){await new Promise(r=>setTimeout(r,120));await printProject(p);}
    };
    qs('#confirmAuto').onclick=()=>run(false);
    qs('#confirmAutoPdf').onclick=()=>run(true);
  }

  function pickCoverPhoto(photos){return photos.find(ph=>photoShape(ph)==='landscape')||photos[0]||null;}
  function takePhoto(arr,pred){const idx=arr.findIndex(pred);if(idx<0)return null;return arr.splice(idx,1)[0];}
  function smartPageFromList(list,room,template,optimize=true,density='balanced'){
    if(!list.length)return null;
    const title=room==='Projeto'?'Visualização':room;
    if(!optimize){
      const target=density==='compact'?4:density==='detailed'?2:(template==='catalog'?4:3);
      const max=Math.min(target,list.length),take=list.splice(0,max);
      const layout=take.length===1?'one':take.length===2?'two':take.length===3?'three':'four';
      return {id:uid(),layout,title,photoId:take[0]?.id||null,photo2Id:take[1]?.id||null,photo3Id:take[2]?.id||null,photo4Id:take[3]?.id||null};
    }
    const portraits=list.filter(x=>photoShape(x)==='portrait');
    const landscapes=list.filter(x=>photoShape(x)!=='portrait');

    // Compacta: aproveita mais cada página, ideal para apresentações longas.
    if(density==='compact'){
      if(list.length>=4){const take=list.splice(0,4);return{id:uid(),layout:'four',title,photoId:take[0].id,photo2Id:take[1].id,photo3Id:take[2].id,photo4Id:take[3].id};}
      if(list.length===3){const take=list.splice(0,3);return{id:uid(),layout:'three',title,photoId:take[0].id,photo2Id:take[1].id,photo3Id:take[2].id};}
      if(list.length===2){const a=list.shift(),b=list.shift();return{id:uid(),layout:'two',title,photoId:a.id,photo2Id:b.id};}
      const a=list.shift();return{id:uid(),layout:'one',title,photoId:a.id,fit:photoShape(a)==='portrait'?'contain':'cover'};
    }

    // Detalhada: dá mais espaço às imagens e cria um ritmo mais luxuoso.
    if(density==='detailed'){
      if(photoShape(list[0])==='portrait'&&portraits.length>=2){const a=takePhoto(list,x=>photoShape(x)==='portrait'),b=takePhoto(list,x=>photoShape(x)==='portrait');return{id:uid(),layout:'portraitPair',title,photoId:a.id,photo2Id:b.id};}
      if(photoShape(list[0])!=='portrait'){const a=list.shift();return{id:uid(),layout:'one',title,photoId:a.id,fit:'cover'};}
      const a=list.shift();return{id:uid(),layout:'one',title,photoId:a.id,fit:'contain'};
    }

    // Equilibrada: comportamento recomendado para a maioria das apresentações.
    if(template==='minimal'){
      if(photoShape(list[0])==='portrait'&&portraits.length>=2){const a=takePhoto(list,x=>photoShape(x)==='portrait'),b=takePhoto(list,x=>photoShape(x)==='portrait');return{id:uid(),layout:'portraitPair',title,photoId:a.id,photo2Id:b.id};}
      const a=list.shift();return{id:uid(),layout:'one',title,photoId:a.id,fit:photoShape(a)==='portrait'?'contain':'cover'};
    }
    if(template==='catalog'&&list.length>=4){const take=list.splice(0,4);return{id:uid(),layout:'four',title,photoId:take[0].id,photo2Id:take[1].id,photo3Id:take[2].id,photo4Id:take[3].id};}
    if(portraits.length>=2){const a=takePhoto(list,x=>photoShape(x)==='portrait'),b=takePhoto(list,x=>photoShape(x)==='portrait');return{id:uid(),layout:'portraitPair',title,photoId:a.id,photo2Id:b.id};}
    if(landscapes.length>=1&&list.length>=3){const hero=takePhoto(list,x=>photoShape(x)!=='portrait'),b=list.shift(),c=list.shift();return{id:uid(),layout:'mixed',title,photoId:hero.id,photo2Id:b?.id||null,photo3Id:c?.id||null};}
    if(list.length>=2){const a=list.shift(),b=list.shift();return{id:uid(),layout:'two',title,photoId:a.id,photo2Id:b.id};}
    const a=list.shift();return{id:uid(),layout:'one',title,photoId:a.id,fit:photoShape(a)==='portrait'?'contain':'cover'};
  }

  function autoGeneratePresentation(p,template='official',opts={intro:true,group:false,optimize:true,noRepeat:true,end:true,density:'balanced'}){
    const all=orderedPhotos(p,true);
    const manualCover=p.coverPhotoId?all.find(ph=>ph.id===p.coverPhotoId):null;
    const cover=manualCover||pickCoverPhoto(all);
    if(template==='official'){
      const remaining=[...all];
      const pages=[
        {id:uid(),layout:'officialCover',title:p.presentationTitle||p.name},
        {id:uid(),layout:'officialServices',title:'Serviços'},
        {id:uid(),layout:'officialBrief',title:p.presentationTitle||p.name,subtitle:p.presentationConcept||p.notes||'Proposta de layout do espaço e decoração.',points:[...(p.presentationPoints||[])]},
        {id:uid(),layout:'officialSection',title:'Visualização 3D'}
      ];
      // Mantém a ordem escolhida pelo utilizador e reproduz o ritmo do modelo oficial:
      // imagem total -> composição de duas imagens -> imagem total -> composição de duas imagens.
      let seq=[...remaining];
      const originalCount=seq.length;
      const density=opts.density||'balanced';
      if(density==='compact' && seq.length>7){
        while(seq.length>5){
          const a=seq.shift(),b=seq.shift();
          pages.push({id:uid(),layout:'officialPair',photoId:a?.id||null,photo2Id:b?.id||null});
        }
      }else{
        let useFull=true;
        while(seq.length>5){
          if(useFull||seq.length===1){const a=seq.shift();pages.push({id:uid(),layout:'officialFull',photoId:a?.id||null});}
          else{const a=seq.shift(),b=seq.shift();pages.push({id:uid(),layout:b?'officialPair':'officialFull',photoId:a?.id||null,photo2Id:b?.id||null});}
          useFull=!useFull;
          if(density==='detailed')useFull=true;
        }
      }
      if(originalCount>=8&&seq.length>=3){
        const take=seq.splice(0,Math.min(5,seq.length));
        pages.push({id:uid(),layout:'officialStrip',photoId:take[0]?.id||null,photo2Id:take[1]?.id||null,photo3Id:take[2]?.id||null,photo4Id:take[3]?.id||null,photo5Id:take[4]?.id||null});
      }
      while(seq.length){const a=seq.shift(),b=seq.shift();pages.push({id:uid(),layout:b?'officialPair':'officialFull',photoId:a?.id||null,photo2Id:b?.id||null});}
      if(opts.end!==false)pages.push({id:uid(),layout:'officialContact',title:'Contactos'});
      p.pages=pages;p.presentationTemplate='official';p.presentationTheme='official';p.presentationPreset='official';p.presentationGeneratedAt=Date.now();return;
    }
    let remaining=[...all];
    if(opts.noRepeat&&cover)remaining=remaining.filter(x=>x.id!==cover.id);
    const pages=[{id:uid(),layout:'cover',title:p.presentationTitle||p.name,subtitle:p.presentationSubtitle||[p.type,p.location].filter(Boolean).join(' • ')||'Proposta de interiores e mobiliário',photoId:cover?.id||null}];
    if(opts.intro){pages.push({id:uid(),layout:'brief',title:p.presentationTitle||p.name,subtitle:p.presentationConcept||p.notes||'Proposta de interiores desenvolvida para criar um espaço funcional, equilibrado e intemporal.',points:[...(p.presentationPoints||[])]});}
    let groups=[];
    if(opts.group){const roomOrder=[...(p.rooms||[])];const map=new Map();remaining.forEach(ph=>{const key=(ph.room&&ph.room!==UNASSIGNED_ROOM)?ph.room:'Projeto';if(!map.has(key))map.set(key,[]);map.get(key).push(ph);});const ordered=[];roomOrder.forEach(r=>{if(map.has(r))ordered.push([r,map.get(r)]);});if(map.has('Projeto'))ordered.push(['Projeto',map.get('Projeto')]);for(const [k,v] of map){if(k!=='Projeto'&&!roomOrder.includes(k))ordered.push([k,v]);}groups=ordered;}else groups=[['Projeto',remaining]];
    groups.forEach(([room,source])=>{const list=[...source];if(groups.length>1&&room!=='Projeto')pages.push({id:uid(),layout:'section',title:room,subtitle:`${list.length} imagem${list.length===1?'':'s'} selecionada${list.length===1?'':'s'}`});while(list.length){const pg=smartPageFromList(list,room,template,opts.optimize,opts.density||'balanced');if(pg)pages.push(pg);else break;}});
    if(opts.end)pages.push({id:uid(),layout:'contact',title:'Obrigado',subtitle:p.presentationClosing||'Do conceito à apresentação, interiores pensados ao detalhe.',photoId:(all.at(-1)||cover)?.id||null});
    p.pages=pages;p.presentationTemplate=template;p.presentationGeneratedAt=Date.now();
  }


  function loadCanvasImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
  function drawCoverImage(ctx,img,x,y,w,h){const ir=img.width/img.height,br=w/h;let sx=0,sy=0,sw=img.width,sh=img.height;if(ir>br){sw=img.height*br;sx=(img.width-sw)/2;}else{sh=img.width/br;sy=(img.height-sh)/2;}ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
  function drawContainImage(ctx,img,x,y,w,h,bg='#eee7df'){ctx.fillStyle=bg;ctx.fillRect(x,y,w,h);const s=Math.min(w/img.width,h/img.height),dw=img.width*s,dh=img.height*s;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
  function themeTokens(p){
    const id=p.presentationTheme||'official';
    return ({
      official:{bg:'#d8d8d8',accent:'#2d4149',ink:'#2d4149',muted:'#4e5960',soft:'#d8d8d8'},
      warm:{bg:'#f5f0e9',accent:'#b45d3a',ink:'#20292f',muted:'#746f6a',soft:'#ded4c8'},
      architectural:{bg:'#ffffff',accent:'#263d4f',ink:'#172733',muted:'#67747d',soft:'#e8edf0'},
      editorial:{bg:'#f4f1ea',accent:'#171717',ink:'#171717',muted:'#6f6a64',soft:'#d9d0c5'},
      dark:{bg:'#202224',accent:'#c89a72',ink:'#f4efe8',muted:'#c2bab2',soft:'#3a3d40'},
      gallery:{bg:'#ffffff',accent:'#8a5f45',ink:'#242424',muted:'#77716c',soft:'#f0ece8'}
    })[id]||{bg:'#d8d8d8',accent:'#2d4149',ink:'#2d4149',muted:'#4e5960',soft:'#d8d8d8'};
  }
  function pdfBrand(ctx,adcImg,inter4Img,tokens,themeId){
    // Mantém o símbolo ADC e o logótipo inter4 como elementos gráficos reais,
    // sem os substituir por texto redesenhado.
    if(themeId==='dark'){ctx.fillStyle='#f5f0e9';ctx.fillRect(48,16,252,136);}
    if(adcImg) ctx.drawImage(adcImg,62,24,108,88);
    ctx.fillStyle=themeId==='dark'?'#20394b':tokens.ink;ctx.font='300 42px Lato, Arial';ctx.fillText('Studio',178,84);
    ctx.fillStyle=themeId==='dark'?'#6f655f':tokens.muted;ctx.font='14px Arial';ctx.fillText('by',64,126);
    if(inter4Img) ctx.drawImage(inter4Img,92,94,176,70);
  }
  async function renderSlideCanvas(p,pg){
    const c=document.createElement('canvas');c.width=1600;c.height=900;const ctx=c.getContext('2d');const tokens=themeTokens(p),themeId=p.presentationTheme||'official';ctx.fillStyle=tokens.bg;ctx.fillRect(0,0,c.width,c.height);
    const ids=[pg.photoId,pg.photo2Id,pg.photo3Id,pg.photo4Id];const fallback=[p.photos[0],p.photos[1]||p.photos[0],p.photos[2]||p.photos[0],p.photos[3]||p.photos[0]];const srcs=ids.map((id,i)=>id?photoById(p,id)?.data:null).map((x,i)=>x||fallback[i]?.data||p.coverAsset||demoAssets[i%demoAssets.length]);
    const imgs=[];for(const src of srcs){try{imgs.push(await loadCanvasImage(src));}catch(e){imgs.push(null);}}
    let adcImg=null,inter4Img=null;
    try{adcImg=await loadCanvasImage(adcOfficialSrc());}catch(e){}
    try{inter4Img=await loadCanvasImage(inter4OfficialSrc());}catch(e){}
    let adcCopper=null,interCopper=null;try{adcCopper=await loadCanvasImage('assets/adc_mark_copper.png');}catch(e){}try{interCopper=await loadCanvasImage('assets/inter4_mark_copper.png');}catch(e){}
    const {accent,ink,muted,soft}=tokens;
    const title=(t,size=42,x=80,y=120)=>{ctx.fillStyle=ink;ctx.font=`600 ${size}px Arial`;ctx.fillText(t||'',x,y);ctx.fillStyle=accent;ctx.fillRect(x,y+14,70,4);};
    const drawOfficialBrand=(x=1325,y=45,scale=1)=>{if(adcImg)ctx.drawImage(adcImg,x,y,90*scale,72*scale);ctx.fillStyle='#2d4149';ctx.font=`300 ${34*scale}px Arial`;ctx.fillText('Studio',x+98*scale,y+50*scale);ctx.fillStyle='#596168';ctx.font=`${11*scale}px Arial`;ctx.fillText('by',x+4*scale,y+82*scale);if(inter4Img)ctx.drawImage(inter4Img,x+30*scale,y+61*scale,132*scale,48*scale);};
    const co=data.company||{},md=data.modelDefaults||{};
    const canvasLines=v=>String(v||'').split(/\n/).filter(Boolean);
    if(pg.layout==='officialCover'){ctx.fillStyle='#d8d8d8';ctx.fillRect(0,0,1600,900);if(adcImg)ctx.drawImage(adcImg,575,315,180,148);ctx.fillStyle='#2d4149';ctx.font='300 82px Arial';ctx.fillText('Studio',775,425);ctx.fillStyle='#596168';ctx.font='26px Arial';ctx.fillText('by',635,520);if(inter4Img)ctx.drawImage(inter4Img,690,466,340,126);ctx.fillStyle='#596168';ctx.font='22px Arial';const ct=md.coverTagline||'INTERIOR DESIGN | MOBILIÁRIO';ctx.fillText(ct,(1600-ctx.measureText(ct).width)/2,655);return c;}
    if(pg.layout==='officialServices'){ctx.fillStyle='#d8d8d8';ctx.fillRect(0,0,1600,900);drawOfficialBrand();const col=(x,titleText,txt)=>{ctx.fillStyle='#2d4149';ctx.font='700 40px Arial';let yy=410;for(const line of canvasLines(titleText)){ctx.fillText(line,x,yy);yy+=50;}ctx.fillStyle='#48545a';ctx.font='26px Arial';wrapCanvasText(ctx,txt,x,yy+15,470,38);};col(315,md.service1Title||'INTERIOR\nDESIGN',md.service1Text||'');col(880,md.service2Title||'MOBILIÁRIO\nÀ MEDIDA',md.service2Text||'');return c;}
    if(pg.layout==='officialBrief'){ctx.fillStyle='#d8d8d8';ctx.fillRect(0,0,1600,900);drawOfficialBrand();ctx.fillStyle='#455159';ctx.font='18px Arial';ctx.fillText((p.created||'').split('-').reverse().join('-'),270,270);ctx.font='18px Arial';ctx.fillText('Cliente',270,310);ctx.fillStyle='#2d4149';ctx.font='700 42px Arial';let ly=380;ly=wrapCanvasTextReturn(ctx,p.client||p.name||'Projeto',270,ly,400,49)+8;ctx.font='700 38px Arial';ly=wrapCanvasTextReturn(ctx,p.type||'Habitação',270,ly,400,45)+5;ctx.font='700 38px Arial';wrapCanvasText(ctx,p.location||'',270,ly,400,45);ctx.fillStyle='#455159';ctx.font='26px Arial';let ry=390;ry=wrapCanvasTextReturn(ctx,pg.subtitle||p.presentationConcept||'Proposta de layout do espaço e decoração.',790,ry,580,38)+60;ctx.font='700 28px Arial';ctx.fillText('Pontos Principais:',790,ry);ry+=50;ctx.font='26px Arial';for(const point of (pg.points||p.presentationPoints||[])){ctx.fillText('- '+point,790,ry);ry+=44;}return c;}
    if(pg.layout==='officialSection'){ctx.fillStyle='#d8d8d8';ctx.fillRect(0,0,1600,900);drawOfficialBrand();ctx.fillStyle='#2d4149';ctx.font='700 44px Arial';const t=pg.title||md.sectionTitle||'Visualização 3D';ctx.fillText(t,(1600-ctx.measureText(t).width)/2,520);ctx.fillStyle='#4e5960';ctx.font='19px Arial';const rights=md.rightsText||'';ctx.fillText(rights,(1600-ctx.measureText(rights).width)/2,830);return c;}
    if(pg.layout==='officialFull'){ctx.fillStyle='#f3f3f1';ctx.fillRect(0,0,1600,900);if(imgs[0])drawCoverImage(ctx,imgs[0],55,55,1490,790);return c;}
    if(pg.layout==='officialPair'){ctx.fillStyle='#d8d8d8';ctx.fillRect(0,0,1600,900);drawOfficialBrand();if(imgs[0])drawCoverImage(ctx,imgs[0],55,55,735,790);if(imgs[1])drawCoverImage(ctx,imgs[1],930,120,470,660);return c;}
    if(pg.layout==='officialStrip'){ctx.fillStyle='#d8d8d8';ctx.fillRect(0,0,1600,900);drawOfficialBrand();const ids5=[pg.photoId,pg.photo2Id,pg.photo3Id,pg.photo4Id,pg.photo5Id];const arr=[];for(const id of ids5){const ph=id?photoById(p,id):null;if(ph){try{arr.push(await loadCanvasImage(ph.data));}catch(e){}}}const n=arr.length||1,pad=55,gap=8,totalW=1600-pad*2-gap*(n-1),w=totalW/n;arr.forEach((im,k)=>drawCoverImage(ctx,im,pad+k*(w+gap),365,w,370));ctx.fillStyle='#4e5960';ctx.font='15px Arial';const rights=md.stripRights||'';ctx.fillText(rights,(1600-ctx.measureText(rights).width)/2,835);return c;}
    if(pg.layout==='officialContact'){ctx.fillStyle='#d8d8d8';ctx.fillRect(0,0,1600,900);if(adcImg)ctx.drawImage(adcImg,235,315,190,155);ctx.fillStyle='#2d4149';ctx.font='300 70px Arial';ctx.fillText('Studio',445,415);ctx.fillStyle='#596168';ctx.font='22px Arial';ctx.fillText('by',245,510);if(inter4Img)ctx.drawImage(inter4Img,300,455,330,120);ctx.fillStyle='#465159';ctx.font='24px Arial';let yy=365;for(const line of [co.email,co.phone,co.address,co.website].filter(Boolean)){ctx.fillText(line,760,yy);yy+=42;}const drawP=(name,role,phone,x)=>{let y=560;if(name){ctx.fillStyle='#2d4149';ctx.font='700 25px Arial';ctx.fillText(name,x,y);y+=36;}ctx.fillStyle='#465159';ctx.font='21px Arial';if(role){ctx.fillText(role,x,y);y+=34;}if(phone)ctx.fillText(phone,x,y);};drawP(co.contact1Name,co.contact1Role,co.contact1Phone,760);drawP(co.contact2Name,co.contact2Role,co.contact2Phone,1110);return c;}
    ctx.save();ctx.scale(1,.9);
    pdfBrand(ctx,adcImg,inter4Img,tokens,themeId);
    if(pg.layout==='cover'){
      if(imgs[0])drawCoverImage(ctx,imgs[0],790,0,810,1000);ctx.fillStyle=accent;ctx.fillRect(82,238,70,5);ctx.fillStyle=muted;ctx.font='18px Arial';ctx.fillText('PROPOSTA DE INTERIORES',82,300);ctx.fillStyle=ink;ctx.font='700 58px Arial';wrapCanvasText(ctx,pg.title||p.presentationTitle||p.name,82,390,590,68);ctx.fillStyle=muted;ctx.font='22px Arial';wrapCanvasText(ctx,pg.subtitle||p.presentationSubtitle||p.type||'',82,535,575,32);ctx.fillStyle=muted;ctx.font='14px Arial';ctx.fillText('DESIGN  •  MOBILIÁRIO  •  PESSOAS',82,920);
    }else if(pg.layout==='brief'){
      ctx.fillStyle=soft;ctx.fillRect(0,0,520,1000);pdfBrand(ctx,adcImg,inter4Img,tokens,themeId);ctx.fillStyle=muted;ctx.font='16px Arial';ctx.fillText('CLIENTE',82,250);ctx.fillStyle=ink;ctx.font='700 46px Arial';wrapCanvasText(ctx,p.client||'Projeto',82,325,350,54);ctx.fillStyle=ink;ctx.font='700 22px Arial';wrapCanvasText(ctx,p.type||'Interiores',82,470,350,30);ctx.fillStyle=muted;ctx.font='19px Arial';wrapCanvasText(ctx,p.location||'',82,520,350,28);ctx.fillStyle=accent;ctx.fillRect(615,245,72,5);ctx.fillStyle=muted;ctx.font='16px Arial';ctx.fillText('PONTOS PRINCIPAIS',615,300);ctx.fillStyle=ink;ctx.font='700 46px Arial';wrapCanvasText(ctx,pg.title||p.presentationTitle||p.name,615,375,820,56);ctx.fillStyle=muted;ctx.font='21px Arial';let yy=500;const desc=pg.subtitle||p.presentationConcept||'';yy=wrapCanvasTextReturn(ctx,desc,615,yy,820,31)+25;ctx.fillStyle=ink;ctx.font='700 21px Arial';for(const point of (pg.points||p.presentationPoints||[])){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(625,yy-7,5,0,Math.PI*2);ctx.fill();ctx.fillStyle=ink;yy=wrapCanvasTextReturn(ctx,point,650,yy,760,30)+13;}
    }else if(pg.layout==='section'){
      ctx.fillStyle=muted;ctx.font='16px Arial';ctx.fillText('ADC STUDIO',82,300);ctx.fillStyle=ink;ctx.font='700 72px Arial';wrapCanvasText(ctx,pg.title||'Ambiente',82,410,930,82);ctx.fillStyle=accent;ctx.fillRect(82,485,86,5);ctx.fillStyle=muted;ctx.font='22px Arial';wrapCanvasText(ctx,pg.subtitle||'Seleção visual do ambiente',82,560,850,34);
    }else if(pg.layout==='one'){
      title(pg.title||'Visualização',40,80,118);if(imgs[0])drawCoverImage(ctx,imgs[0],80,160,1440,770);
    }else if(pg.layout==='two'||pg.layout==='beforeafter'){
      title(pg.title||'Visualização',40,80,118);if(imgs[0])drawCoverImage(ctx,imgs[0],80,160,700,770);if(imgs[1])drawCoverImage(ctx,imgs[1],820,160,700,770);
    }else if(pg.layout==='portraitPair'){
      title(pg.title||'Visualização',40,80,118);if(imgs[0])drawCoverImage(ctx,imgs[0],180,160,560,770);if(imgs[1])drawCoverImage(ctx,imgs[1],860,160,560,770);
    }else if(pg.layout==='mixed'){
      title(pg.title||'Ambiente em destaque',40,80,118);if(imgs[0])drawCoverImage(ctx,imgs[0],80,160,860,770);if(imgs[1])drawCoverImage(ctx,imgs[1],980,160,540,365);if(imgs[2])drawCoverImage(ctx,imgs[2],980,565,540,365);
    }else if(pg.layout==='three'){
      title(pg.title||'Ambiente em destaque',40,80,118);if(imgs[0])drawCoverImage(ctx,imgs[0],80,160,860,770);if(imgs[1])drawCoverImage(ctx,imgs[1],980,160,540,365);if(imgs[2])drawCoverImage(ctx,imgs[2],980,565,540,365);
    }else if(pg.layout==='four'){
      title(pg.title||'Seleção visual',40,80,118);if(imgs[0])drawCoverImage(ctx,imgs[0],80,160,700,355);if(imgs[1])drawCoverImage(ctx,imgs[1],820,160,700,355);if(imgs[2])drawCoverImage(ctx,imgs[2],80,555,700,355);if(imgs[3])drawCoverImage(ctx,imgs[3],820,555,700,355);
    }else if(pg.layout==='text'||pg.layout==='details'){
      ctx.fillStyle=muted;ctx.font='16px Arial';ctx.fillText('ADC STUDIO',80,260);ctx.fillStyle=ink;ctx.font='700 52px Arial';wrapCanvasText(ctx,pg.title||'Conceito',80,345,590,60);ctx.fillStyle=muted;ctx.font='22px Arial';wrapCanvasText(ctx,pg.subtitle||p.notes||'',80,490,590,34);if(imgs[0])drawCoverImage(ctx,imgs[0],800,0,800,1000);
    }else if(pg.layout==='moodboard'){
      title(pg.title||'Moodboard',40,80,118);if(imgs[0])drawCoverImage(ctx,imgs[0],80,160,700,355);if(imgs[1])drawCoverImage(ctx,imgs[1],820,160,700,355);if(imgs[2])drawCoverImage(ctx,imgs[2],80,555,700,355);ctx.fillStyle=soft;ctx.fillRect(820,555,700,355);ctx.fillStyle=muted;ctx.font='20px Arial';ctx.fillText('MATERIAIS • TEXTURAS • CORES',940,740);
    }else if(pg.layout==='contact'){
      ctx.fillStyle=accent;ctx.fillRect(82,300,70,5);ctx.fillStyle=ink;ctx.font='700 64px Arial';ctx.fillText('Obrigado.',82,410);ctx.fillStyle=muted;ctx.font='22px Arial';wrapCanvasText(ctx,pg.subtitle||p.presentationClosing||'',82,485,580,34);ctx.fillStyle=muted;ctx.font='14px Arial';ctx.fillText('INTER4 MOBILIÁRIO • DESIGN • INTERIORES',82,900);if(imgs[0])drawCoverImage(ctx,imgs[0],800,0,800,1000);
    }else if(imgs[0])drawCoverImage(ctx,imgs[0],80,160,1440,770);
    return c;
  }
  function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight){const words=String(text||'').split(/\s+/);let line='';for(let n=0;n<words.length;n++){const test=line+words[n]+' ';if(ctx.measureText(test).width>maxWidth&&n>0){ctx.fillText(line.trim(),x,y);line=words[n]+' ';y+=lineHeight;}else line=test;}if(line.trim())ctx.fillText(line.trim(),x,y);}
  function wrapCanvasTextReturn(ctx,text,x,y,maxWidth,lineHeight){const words=String(text||'').split(/\s+/);let line='';for(let n=0;n<words.length;n++){const test=line+words[n]+' ';if(ctx.measureText(test).width>maxWidth&&n>0){ctx.fillText(line.trim(),x,y);line=words[n]+' ';y+=lineHeight;}else line=test;}if(line.trim())ctx.fillText(line.trim(),x,y);return y;}
  function dataUrlBytes(dataUrl){const bin=atob(dataUrl.split(',')[1]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
  function asciiBytes(s){return new TextEncoder().encode(s);}
  function concatBytes(chunks){const total=chunks.reduce((n,c)=>n+c.length,0),out=new Uint8Array(total);let o=0;for(const c of chunks){out.set(c,o);o+=c.length;}return out;}
  function buildPdf(jpegs){
    const W=960,H=540,count=jpegs.length,maxObj=2+count*3,chunks=[],offsets=new Array(maxObj+1).fill(0);let len=0;const push=x=>{const b=typeof x==='string'?asciiBytes(x):x;chunks.push(b);len+=b.length;};
    push('%PDF-1.4\n%ADCSTUDIO\n');
    const obj=(n,parts)=>{offsets[n]=len;push(`${n} 0 obj\n`);for(const part of parts)push(part);push('\nendobj\n');};
    obj(1,[`<< /Type /Catalog /Pages 2 0 R >>`]);
    const kids=[];for(let i=0;i<count;i++)kids.push(`${3+i*3} 0 R`);obj(2,[`<< /Type /Pages /Count ${count} /Kids [${kids.join(' ')}] >>`]);
    for(let i=0;i<count;i++){
      const page=3+i*3,img=4+i*3,content=5+i*3,j=jpegs[i];
      obj(page,[`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${content} 0 R >>`]);
      offsets[img]=len;push(`${img} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1600 /Height 900 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.length} >>\nstream\n`);push(j);push('\nendstream\nendobj\n');
      const stream=`q\n${W} 0 0 ${H} 0 0 cm\n/Im${i} Do\nQ\n`;obj(content,[`<< /Length ${asciiBytes(stream).length} >>\nstream\n${stream}endstream`]);
    }
    const xref=len;push(`xref\n0 ${maxObj+1}\n0000000000 65535 f \n`);for(let n=1;n<=maxObj;n++)push(`${String(offsets[n]).padStart(10,'0')} 00000 n \n`);push(`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return concatBytes(chunks);
  }
  async function exportPdfDirect(p){
    const jpegs=[];for(let i=0;i<p.pages.length;i++){toast(`A criar PDF: página ${i+1}/${p.pages.length}`);const c=await renderSlideCanvas(p,p.pages[i]);jpegs.push(dataUrlBytes(c.toDataURL('image/jpeg',.9)));await new Promise(r=>setTimeout(r,20));}
    const pdf=buildPdf(jpegs),blob=new Blob([pdf],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${safeName(p.name)}_ADC_Studio.pdf`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);
  }

  function exportProject(p){download(`${safeName(p.name)}.adcproj`,JSON.stringify({kind:'adc-studio-project',version:15,project:p},null,2),'application/json');}
  function exportAll(){download(`ADC_Studio_backup_${new Date().toISOString().slice(0,10)}.adcproj`,JSON.stringify({kind:'adc-studio-backup',version:15,data},null,2),'application/json');}
  function downloadProjectImages(p){if(!p.photos.length)return toast('Este projeto ainda não tem fotografias.');p.photos.forEach((ph,i)=>{const a=document.createElement('a');a.href=ph.data;a.download=`${safeName(p.name)}_${String(i+1).padStart(2,'0')}.jpg`;document.body.appendChild(a);a.click();a.remove();});}
  function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
  function safeName(s){return(s||'projeto').replace(/[^a-z0-9áàâãéêíóôõúç _-]/gi,'').trim().replace(/\s+/g,'_');}
  async function shareProject(p){try{if(navigator.share){await navigator.share({title:`ADC Studio — ${p.name}`,text:`Projeto ${p.name} — ${p.client||''}`});}else toast('A partilha direta não está disponível neste navegador.');}catch(e){}}

  importInput.onchange=async()=>{const f=importInput.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if((j.kind==='adc-studio-project'||j.kind==='adc-by-inter4-project')&&j.project){const p=normalize({projects:[j.project]}).projects[0];p.id=uid();data.projects.unshift(p);save();toast('Projeto importado.');go('project',p.id,'overview');}else if((j.kind==='adc-studio-backup'||j.kind==='adc-by-inter4-backup')&&j.data){if(confirm('Substituir os dados atuais pelo backup?')){data=normalize(j.data);save();go('projects');toast('Backup restaurado.');}}else toast('Ficheiro não reconhecido.');}catch(e){toast('Não foi possível importar o ficheiro.');}};
  window.addEventListener('afterprint',()=>qs('#printRoot')?.remove());
  async function bootstrap(){
    app.innerHTML='<div style="font-family:system-ui;padding:32px;color:#2d4149">A carregar ADC Studio…</div>';
    const stored=await idbGet();
    if(stored){ data=normalize(stored); }
    else { await idbSet(data); }
    if(navigator.storage && navigator.storage.persist){ try{ await navigator.storage.persist(); }catch(e){} }
    render();
  }
  bootstrap();
})();

// ADC Studio prototype v1.5 — ficha do projeto + dados profissionais do PDF

// ADC Studio PWA Offline v2.0 — IndexedDB + service worker
