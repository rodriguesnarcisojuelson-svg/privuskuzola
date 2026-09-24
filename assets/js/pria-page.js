(function(){
'use strict';

const CONSENT_KEY='privusCookieConsent';
const GA_ID='G-36GJVCQL9Y';
let gaLoaded=false;

function getConsent(){
  try{
    const raw=localStorage.getItem(CONSENT_KEY);
    if(!raw)return null;
    const data=JSON.parse(raw);
    if(!data||Date.now()-data.date>13*30*24*60*60*1000)return null;
    return data.value;
  }catch(e){return null;}
}
function setConsent(value){
  try{localStorage.setItem(CONSENT_KEY,JSON.stringify({value:value,date:Date.now()}));}catch(e){}
}
function loadGA(){
  if(gaLoaded||window.gtag)return;
  gaLoaded=true;
  const s=document.createElement('script');
  s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID;
  document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag('js',new Date());
  window.gtag('config',GA_ID,{anonymize_ip:true});
}
function track(name,params){
  if(getConsent()!=='accepted')return;
  loadGA();
  const payload=Object.assign({page_path:location.pathname},params||{});
  window.gtag('event',name,payload);
}

const banner=document.getElementById('cookieBanner');
function showBanner(){if(banner)banner.hidden=false;}
function hideBanner(){if(banner)banner.hidden=true;}
const consent=getConsent();
if(consent==='accepted')loadGA();
else if(!consent)showBanner();

document.getElementById('cookieAccept')?.addEventListener('click',function(){
  setConsent('accepted');loadGA();hideBanner();track('cookie_consent_update',{value:'accepted'});
});
document.getElementById('cookieReject')?.addEventListener('click',function(){
  setConsent('rejected');hideBanner();
});
document.getElementById('manageCookies')?.addEventListener('click',function(e){
  e.preventDefault();showBanner();
});

document.querySelectorAll('[data-track]').forEach(function(el){
  el.addEventListener('click',function(){
    track(el.getAttribute('data-track'),{
      cta_text:(el.textContent||'').trim().slice(0,120),
      destination:el.getAttribute('href')||''
    });
  });
});

const form=document.getElementById('priaLeadForm');
if(form){
  let started=false;
  form.addEventListener('focusin',function(){
    if(started)return;
    started=true;
    track('pria_form_start',{form_location:'pria_landing'});
  });
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const error=document.getElementById('priaFormError');
    const success=document.getElementById('priaFormSuccess');
    const original=button.textContent;
    error.hidden=true;
    button.disabled=true;
    button.textContent='A enviar…';

    const payload={
      nome:form.nome.value.trim(),
      email:form.email.value.trim(),
      empresa:form.empresa.value.trim(),
      servico:'pria',
      ja_fez_pria:'',
      descricao:'Pedido de apresentação do PRIA submetido diretamente na landing /pria/.',
      privacidade:form.privacidade.checked,
      website:form.website.value,
      language:'pt-PT',
      source:'pria-landing-form'
    };

    try{
      const response=await fetch('/api/contact',{
        method:'POST',
        headers:{Accept:'application/json','Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const result=await response.json().catch(function(){return {};});
      if(!response.ok)throw new Error(result.error||'Não foi possível enviar o pedido.');
      track('pria_form_submit',{form_location:'pria_landing'});
      form.hidden=true;
      success.hidden=false;
    }catch(err){
      error.textContent=err.message||'Não foi possível enviar. Tente novamente ou escreva para contacto@privuskuzola.pt.';
      error.hidden=false;
      button.disabled=false;
      button.textContent=original;
    }
  });
}
})();