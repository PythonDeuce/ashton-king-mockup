/* Ashton King design mockup, v6 motion engine. Vanilla JS, no libraries, no network.
   Animates transform, opacity and clip-path only. Every effect is skipped under prefers-reduced-motion. */
(function(){
'use strict';
var root=document.documentElement;
var mqR=window.matchMedia('(prefers-reduced-motion: reduce)');
var reduce=mqR.matches;
var fine=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var desk=window.matchMedia('(min-width: 900px)');
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function $(s,c){return (c||document).querySelector(s)}
function $$(s,c){return [].slice.call((c||document).querySelectorAll(s))}
var hero=$('.hero');
var hd=$('.hd');
function hdH(){return hd?hd.offsetHeight:64}

/* ---------- split display type into masked words ---------- */
$$('[data-split]').forEach(function(el){
  var i=0;
  (function walk(node){
    [].slice.call(node.childNodes).forEach(function(n){
      if(n.nodeType===3){
        var frag=document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function(p){
          if(!p)return;
          if(/^\s+$/.test(p)){frag.appendChild(document.createTextNode(' '));return}
          var w=document.createElement('span');w.className='w';
          var s=document.createElement('span');s.textContent=p;
          s.style.transitionDelay='calc('+(i++)+'*60ms + var(--wd,0ms))';
          w.appendChild(s);frag.appendChild(w);
        });
        node.replaceChild(frag,n);
      } else if(n.nodeType===1){ walk(n); }
    });
  })(el);
});
/* once a word has risen, drop its mask so nothing can ever clip a letter */
$$('.w').forEach(function(w){
  var s=w.firstChild;
  if(reduce){w.classList.add('done');return}
  s.addEventListener('transitionend',function(e){if(e.propertyName==='transform')w.classList.add('done')});
});

/* ---------- reveal on enter ---------- */
var stepEls=$$('.step');
var targets=$$('[data-reveal],.rv,.hr,.count').filter(function(t){return !(hero&&hero.contains(t))&&t!==hero});
function stepsLinked(){return desk.matches}
if(reduce||!('IntersectionObserver' in window)){
  $$('[data-reveal],.rv,.hr,.count').forEach(function(t){t.classList.add('in')});
}else{
  var io=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting){
      if(e.target.classList.contains('step')&&stepsLinked())return;
      e.target.classList.add('in');io.unobserve(e.target)}
  })},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  targets.forEach(function(t){io.observe(t)});
}

/* ---------- counters: settle exactly on their target ---------- */
function setCount(el,v){el.textContent=String(v)}
function runCount(el){
  if(el._done||el._started)return;
  el._started=1;
  var to=+el.getAttribute('data-to'),from=+(el.getAttribute('data-from')||0);
  if(reduce){setCount(el,to);el._done=1;return}
  var t0=null,dur=1500;
  setCount(el,from);
  function step(ts){
    if(t0===null)t0=ts;
    var k=Math.min(1,(ts-t0)/dur),e=1-Math.pow(1-k,4);
    setCount(el,k>=1?to:Math.round(from+(to-from)*e));
    if(k<1)requestAnimationFrame(step);else el._done=1;
  }
  setTimeout(function(){requestAnimationFrame(step)},350);
  /* failsafe: if the tab is throttled or hidden, still end on the real number */
  setTimeout(function(){setCount(el,to);el._done=1},350+dur+700);
}
var counts=$$('.count');
counts.forEach(function(c){ if(reduce) setCount(c,c.getAttribute('data-to')); });
if(!reduce&&'IntersectionObserver' in window){
  var cio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){runCount(e.target);cio.unobserve(e.target)}})},{threshold:.6});
  counts.forEach(function(c){cio.observe(c)});
}else counts.forEach(runCount);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')counts.forEach(function(c){if(c._started&&!c._done){setCount(c,c.getAttribute('data-to'));c._done=1}})});

/* ---------- page-load intro: logo, then headline, then calls to action ---------- */
function intro(){
  root.classList.add('go');
  if(hero){hero.classList.add('in');$$('.rv,.hr,.count',hero).forEach(function(t){t.classList.add('in')})}
  $$('.count',hero||document).forEach(runCount);
}
(function(){
  var started=false;
  function go(){if(started)return;started=true;intro()}
  if(reduce||window.scrollY>80){go();return}
  var fontsReady=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();
  Promise.race([fontsReady,new Promise(function(r){setTimeout(r,1100)})]).then(function(){requestAnimationFrame(function(){requestAnimationFrame(go)})});
  setTimeout(go,1500);
})();

/* ---------- smooth scroll (wheel lerp), eased anchors, soft section snap ---------- */
var scenes=$$('.scene');
var smoothOn=!reduce&&fine;
var cur=window.scrollY,tgt=cur,loopId=0,anim=null,snapT=0;
function maxY(){return document.documentElement.scrollHeight-window.innerHeight}
function cancelAnim(){anim=null}
function lerpLoop(){
  var d=tgt-cur;
  if(Math.abs(d)<.5){cur=tgt;window.scrollTo(0,cur);loopId=0;return}
  cur+=d*.11;window.scrollTo(0,cur);loopId=requestAnimationFrame(lerpLoop);
}
function easeInOut(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
function easeTo(y,dur,done){
  y=clamp(Math.round(y),0,maxY());
  var y0=window.scrollY,dist=y-y0;
  if(Math.abs(dist)<2){if(done)done();return}
  if(reduce){window.scrollTo(0,y);if(done)done();return}
  if(loopId){cancelAnimationFrame(loopId);loopId=0}
  var t0=null,my={};anim=my;
  function stp(ts){
    if(anim!==my)return;
    if(t0===null)t0=ts;
    var k=clamp((ts-t0)/dur,0,1);
    var yy=k>=1?y:y0+dist*easeInOut(k);
    window.scrollTo(0,yy);cur=tgt=yy;
    if(k<1)requestAnimationFrame(stp);else{anim=null;if(done)done()}
  }
  requestAnimationFrame(stp);
}
function sceneTop(el){return el.getBoundingClientRect().top+window.scrollY}
function snapPoints(){
  var pts=[0];
  scenes.forEach(function(s){if(s!==hero)pts.push(Math.round(sceneTop(s)-hdH()+1))});
  return pts;
}
function maybeSnap(){
  var y=window.scrollY,vh=window.innerHeight,best=null,bd=1e9;
  snapPoints().forEach(function(p){var d=Math.abs(p-y);if(d<bd){bd=d;best=p}});
  if(best!==null&&bd>3&&bd<vh*.1){easeTo(best,Math.round(450+bd*1.6))}
}
if(smoothOn){
  window.addEventListener('wheel',function(e){
    if(e.ctrlKey||e.defaultPrevented)return;
    if(Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
    var t=e.target;
    if(t&&t.closest&&t.closest('select,textarea'))return;
    cancelAnim();
    e.preventDefault();
    var dy=e.deltaY*(e.deltaMode===1?34:e.deltaMode===2?window.innerHeight:1);
    if(!loopId){cur=window.scrollY;tgt=cur}
    tgt=clamp(tgt+dy,0,maxY());
    if(!loopId)loopId=requestAnimationFrame(lerpLoop);
    clearTimeout(snapT);snapT=setTimeout(maybeSnap,220);
  },{passive:false});
  ['keydown','touchstart','mousedown'].forEach(function(n){window.addEventListener(n,function(){cancelAnim();if(loopId){cancelAnimationFrame(loopId);loopId=0}},{passive:true})});
  window.addEventListener('scroll',function(){if(!loopId&&!anim){cur=tgt=window.scrollY}},{passive:true});
}
/* anchors: eased glide, correct offset under the sticky header, hash + focus handled */
$$('a[href^="#"]').forEach(function(a){
  a.addEventListener('click',function(e){
    var h=a.getAttribute('href');if(h.length<2)return;
    var el=document.getElementById(h.slice(1));if(!el)return;
    e.preventDefault();
    var y=(h==='#top')?0:(el.classList.contains('scene')?sceneTop(el)-hdH()+1:sceneTop(el)-hdH()-14);
    var dist=Math.abs(y-window.scrollY);
    easeTo(y,clamp(650+dist*.28,700,1500),function(){
      if(history.pushState)history.pushState(null,'',h);
      el.setAttribute('tabindex','-1');el.focus({preventScroll:true});
    });
  });
});

/* ---------- scroll-linked frame ---------- */
var par=$$('[data-par]');
var stepsBox=document.getElementById('steps'),rail=stepsBox&&$('.rail',stepsBox);
var mpath=document.getElementById('mpath');
var prog=$('.prog'),progBar=prog&&$('i',prog),progDot=prog&&$('b',prog);
var navLinks=$$('.nav a');
var dock=$('.dock'),contact=document.getElementById('contact');
var depthScenes=scenes.filter(function(s){return s!==hero}).map(function(s){return {el:s,w:s.querySelector(':scope > .wrap'),last:''}});
var heroIn=$('.hero-in'),heroLast='';
var usingPointer=false,curNav=null,lastProg=-1;
var stepThr=[.3,.52,.74];
function frame(){
  var vh=window.innerHeight,sy=window.scrollY;
  /* reads */
  var rs=depthScenes.map(function(s){return s.el.getBoundingClientRect()});
  var hr=hero?hero.getBoundingClientRect():null;
  var sr=stepsBox?stepsBox.getBoundingClientRect():null;
  var pr=par.map(function(el){return el.parentElement.getBoundingClientRect()});
  var cr=contact?contact.getBoundingClientRect():null;
  /* writes */
  if(!reduce){
    par.forEach(function(el,i){
      var r=pr[i],k=parseFloat(el.getAttribute('data-par'));
      el.style.transform='translate3d(0,'+(clamp(r.top+r.height/2-vh/2,-vh,vh)*k).toFixed(1)+'px,0)';
    });
    depthScenes.forEach(function(s,i){
      if(!s.w)return;var r=rs[i];
      var enter=clamp(1-r.top/(vh*.95),0,1),leave=clamp(1-r.bottom/(vh*.95),0,1);
      var off=(1-enter)*54-leave*34;
      var v=Math.abs(off)<.3?'':'translate3d(0,'+off.toFixed(1)+'px,0)';
      if(v!==s.last){s.w.style.transform=v;s.last=v}
    });
    if(heroIn&&hr){
      var lv=clamp(-hr.top/(hr.height||1),0,1);
      var hv=lv<.002?'':'translate3d(0,'+(-lv*70).toFixed(1)+'px,0)';
      if(hv!==heroLast){heroIn.style.transform=hv;heroLast=hv}
    }
  }
  /* method: scrub the curve and the rail */
  if(sr){
    var p=clamp((vh*.88-sr.top)/(sr.height*.82+vh*.06),0,1);
    if(rail)rail.style.setProperty('--p',p.toFixed(3));
    if(mpath&&desk.matches&&!reduce){mpath.ownerSVGElement.style.setProperty('--cp',(p*100).toFixed(1))}
    if(desk.matches&&!reduce){stepEls.forEach(function(st,i){if(p>=stepThr[i])st.classList.add('in')})}
  }
  /* sticky progress */
  var docH=Math.max(1,document.documentElement.scrollHeight-vh);
  var pv=clamp(sy/docH,0,1);
  if(prog&&Math.abs(pv-lastProg)>.0004){
    lastProg=pv;
    progBar.style.transform='scaleX('+pv.toFixed(4)+')';
    progDot.style.transform='translate3d('+(pv*(prog.clientWidth-8)).toFixed(1)+'px,0,0)';progDot.style.opacity=pv<.004?'0':'1';
  }
  /* nav state */
  var active=null,ref=hdH()+vh*.3;
  scenes.forEach(function(s,i){var t=sceneTop(s)-sy;if(s!==hero&&t<=ref)active=s});
  var id=active?active.id:'';
  if(id!==curNav){
    curNav=id;
    navLinks.forEach(function(a){if(a.getAttribute('href')==='#'+id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')});
  }
  /* dock */
  if(dock&&cr)dock.classList.toggle('show',sy>vh*.7&&!(cr.top<vh*.85));
  if(!reduce&&!usingPointer)root.style.setProperty('--sx',(.5+.5*Math.sin(sy/420)).toFixed(3));
}
var ticking=false;
function req(){if(!ticking){ticking=true;requestAnimationFrame(function(){ticking=false;frame()})}}
window.addEventListener('scroll',req,{passive:true});
window.addEventListener('resize',req);
window.addEventListener('load',req);
frame();

/* ---------- ambient shimmer on metallic type + cursor highlight ---------- */
var darks=$$('.dark');
if(!reduce){
  var t0=performance.now(),ambLast=0;
  (function amb(ts){
    if(!usingPointer&&ts-ambLast>33){
      ambLast=ts;
      root.style.setProperty('--sx',(.5+.5*Math.sin(window.scrollY/420+ts/4200)).toFixed(3));
    }
    requestAnimationFrame(amb);
  })(t0);
  window.addEventListener('pointermove',function(e){
    if(e.pointerType==='mouse'){usingPointer=true;root.style.setProperty('--sx',(e.clientX/window.innerWidth).toFixed(3))}
    darks.forEach(function(d){var r=d.getBoundingClientRect();
      if(e.clientY>=r.top&&e.clientY<=r.bottom){d.style.setProperty('--mx',(e.clientX-r.left)+'px');d.style.setProperty('--my',(e.clientY-r.top)+'px');d.classList.add('hot')}
      else d.classList.remove('hot')});
  },{passive:true});
  document.addEventListener('pointerleave',function(){usingPointer=false;darks.forEach(function(d){d.classList.remove('hot')})});
  window.addEventListener('pointerdown',function(e){
    if(e.pointerType==='mouse')return;
    var t=document.createElement('i');t.className='tap';t.style.left=e.clientX+'px';t.style.top=e.clientY+'px';document.body.appendChild(t);setTimeout(function(){t.remove()},900);
  },{passive:true});
}

/* ---------- magnetic + spotlight buttons, card spotlight ---------- */
if(!reduce&&fine){
  $$('.cta,.d-book,.d-call').forEach(function(b){
    b.addEventListener('pointermove',function(e){
      var r=b.getBoundingClientRect();
      var x=e.clientX-r.left,y=e.clientY-r.top;
      b.style.setProperty('--mx',x.toFixed(0)+'px');b.style.setProperty('--my',y.toFixed(0)+'px');
      var dx=(x/r.width-.5),dy=(y/r.height-.5);
      b.style.transform='translate3d('+(dx*12).toFixed(1)+'px,'+(dy*8).toFixed(1)+'px,0)';
    });
    b.addEventListener('pointerleave',function(){b.style.transform=''});
  });
  $$('.card').forEach(function(c){
    c.addEventListener('pointermove',function(e){
      var r=c.getBoundingClientRect();
      c.style.setProperty('--mx',(e.clientX-r.left).toFixed(0)+'px');c.style.setProperty('--my',(e.clientY-r.top).toFixed(0)+'px');
    });
  });
}

/* ---------- map tooltips: eased follow, hover, focus, tap, Escape ---------- */
var map=document.getElementById('map'),tip=document.getElementById('tip');
if(map&&tip){
  var plate=map.parentElement;
  var tb=$('b',tip),ts=$('span',tip),tin=$('.tip-in',tip);
  var P={x:0,y:0,tx:0,ty:0,on:false,raf:0};
  function place(cx,cy,snap){
    var pr=plate.getBoundingClientRect();
    var w=tin.offsetWidth/2+6;
    var x=clamp(cx-pr.left,w,pr.width-w);
    var y=Math.max(tin.offsetHeight+22,cy-pr.top);
    P.tx=x;P.ty=y;
    if(snap||reduce||!P.on){P.x=x;P.y=y}
    if(!P.raf)P.raf=requestAnimationFrame(follow);
  }
  function follow(){
    var dx=P.tx-P.x,dy=P.ty-P.y;
    if(Math.abs(dx)<.15&&Math.abs(dy)<.15){P.x=P.tx;P.y=P.ty;tip.style.transform='translate3d('+P.x.toFixed(1)+'px,'+P.y.toFixed(1)+'px,0)';P.raf=0;return}
    P.x+=dx*.3;P.y+=dy*.3;
    tip.style.transform='translate3d('+P.x.toFixed(1)+'px,'+P.y.toFixed(1)+'px,0)';
    P.raf=requestAnimationFrame(follow);
  }
  function showTip(g,cx,cy,snap){
    tb.textContent=g.getAttribute('data-n');
    ts.innerHTML=g.getAttribute('data-s').split('|').join('<br>');
    place(cx,cy,snap);
    P.on=true;tip.classList.add('on');
  }
  function hideTip(){P.on=false;tip.classList.remove('on')}
  $$('.sg',map).forEach(function(g){
    g.addEventListener('pointerenter',function(e){showTip(g,e.clientX,e.clientY)});
    g.addEventListener('pointermove',function(e){showTip(g,e.clientX,e.clientY)});
    g.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')hideTip()});
    g.addEventListener('click',function(e){showTip(g,e.clientX,e.clientY)});
    g.addEventListener('focus',function(){var b=g.getBoundingClientRect();showTip(g,b.left+b.width/2,b.top+b.height*.35,true)});
    g.addEventListener('blur',hideTip);
  });
  document.addEventListener('pointerdown',function(e){if(!e.target.closest||!e.target.closest('.sg'))hideTip()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')hideTip()});
  window.addEventListener('scroll',hideTip,{passive:true});
}

/* ---------- topic links preselect the form ---------- */
var topicSel=document.getElementById('topic');
$$('[data-topic]').forEach(function(l){l.addEventListener('click',function(){
  if(!topicSel)return;var v=l.getAttribute('data-topic');
  for(var i=0;i<topicSel.options.length;i++){if(topicSel.options[i].text===v){topicSel.selectedIndex=i;break}}
})});

/* ---------- demo form: validation only, nothing is sent ---------- */
var f=document.getElementById('demo'),ok=document.getElementById('ok');
if(f){
  var nm=document.getElementById('nm'),ph=document.getElementById('ph');
  var nmE=document.getElementById('nm-e'),phE=document.getElementById('ph-e');
  function setErr(inp,msg,show){inp.setAttribute('aria-invalid',show?'true':'false');msg.hidden=!show}
  function chkName(){var v=nm.value.trim();var good=v.length>=2&&/[A-Za-z]/.test(v);setErr(nm,nmE,!good);return good}
  function chkPh(){var d=ph.value.replace(/\D/g,'');var good=d.length===10||(d.length===11&&d.charAt(0)==='1');setErr(ph,phE,!good);return good}
  nm.addEventListener('input',function(){if(nm.getAttribute('aria-invalid')==='true')chkName()});
  ph.addEventListener('input',function(){if(ph.getAttribute('aria-invalid')==='true')chkPh()});
  nm.addEventListener('blur',function(){if(nm.value)chkName()});
  ph.addEventListener('blur',function(){if(ph.value)chkPh()});
  f.addEventListener('submit',function(e){
    e.preventDefault();ok.hidden=true;
    var a=chkName(),b=chkPh();
    if(!a){nm.focus();return}
    if(!b){ph.focus();return}
    ok.hidden=false;
  });
  f.addEventListener('change',function(){ok.hidden=true});
}
})();
