////////////////////////////////////////////////////////////////////////
const D=document, E_p=Element.prototype, ET_p=EventTarget.prototype
const LS=localStorage, LOC=location, U=x=>x===undefined
const $=D.querySelector.bind(D), $$=D.querySelectorAll.bind(D)
E_p.$ = E_p.querySelector; E_p.$$ = E_p.querySelectorAll
E_p.class = function(k,v){return (v==null) ? this.classList.contains(k)
  : this.classList.toggle(k, (v==-1) ? undefined : v)}
E_p.attr=function(k,v){ return this[
  (U(v)?'get':((v===null)?'remove':'set'))+'Attribute'](k,v)}
ET_p.on = ET_p.addEventListener; ET_p.off = ET_p.removeEventListener
const html = s => { let e,d=D.createElement('div');
  d.innerHTML=s.trim(); e=d.firstChild; e.remove(); return e }
const after = (t,f) => setTimeout(f,t*1000)
const tojson = x => U(x) ? "" : JSON.stringify(x)
const unjson = str => U(str) ? undefined : JSON.parse(str)
const db = {set: (k,v) => LS.setItem(k, tojson(v)),
            get: (k) => unjson(LS.getItem(k)),
            del: (k) => LS.removeItem(k), raw: LS}
////////////////////////////////////////////////////////////////////////

