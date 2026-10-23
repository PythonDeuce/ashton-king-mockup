(function(){
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var root=document.documentElement;
// split display type into masked words
document.querySelectorAll('[data-split]').forEach(function(el){
  var i=0;
  (function walk(node){
    Array.prototype.slice.call(node.childNodes).forEach(function(n){
      if(n.nodeType===3){
        var frag=document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function(p){
          if(!p)return;
          if(/^\s+$/.test(p)){frag.appendChild(document.createTextNode(' '));return}
          var w=document.createElement('span');w.className='w';
          var s=document.createElement('span');s.textContent=p;s.style.setProperty('--i',i++);
          s.style.transitionDelay='calc('+(i-1)+'*55ms + var(--wd,0ms))';
          w.appendChild(s);frag.appendChild(w);
        });
        node.replaceChild(frag,n);
      } else if(n.nodeType===1){ walk(n); }
    });
  })(el);
});
// reveal on enter
var targets=document.querySelectorAll('[data-reveal],.rv,.row,.lrow,.step,.bar,.hr,.count');
if(reduce||!('IntersectionObserver' in window)){targets.forEach(function(t){t.classList.add('in')});}
else{
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  targets.forEach(function(t){io.observe(t)});
}
// counters for real figures only: 1977 to 2009, 0 to 5 states, 0 to 2 states
var counts=[].slice.call(document.querySelectorAll('.count'));
function runCount(el){
  var to=+el.getAttribute('data-to'),from=+(el.getAttribute('data-from')||0);
  if(reduce){el.textContent=to;return}
  var t0=null,dur=1900;
  function step(ts){if(t0===null)t0=ts;var k=Math.min(1,(ts-t0)/dur);var e=1-Math.pow(1-k,4);el.textContent=Math.round(from+(to-from)*e);if(k<1)requestAnimationFrame(step);else el.textContent=to}
  el.textContent=from;
  setTimeout(function(){requestAnimationFrame(step)},650);
}
if(!reduce&&'IntersectionObserver' in window){
  var cio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){runCount(e.target);cio.unobserve(e.target)}})},{threshold:.5});
  counts.forEach(function(c){cio.observe(c)});
}
// scroll-linked: parallax + scrubbed method curve + map state
var par=[].slice.call(document.querySelectorAll('[data-par]'));
var steps=document.getElementById('steps'),mpath=document.getElementById('mpath'),rail=steps&&steps.querySelector('.rail');
var map=document.getElementById('map');
var rows=[].slice.call(document.querySelectorAll('.row[data-map]'));
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function frame(){
  var vh=window.innerHeight;
  if(!reduce){
    par.forEach(function(el){
      var r=el.parentElement.getBoundingClientRect();
      var k=parseFloat(el.getAttribute('data-par'));
      var off=clamp((r.top+r.height/2-vh/2),-vh,vh)*k;
      el.style.transform='translate3d(0,'+off.toFixed(1)+'px,0)';
    });
  }
  if(steps){
    var r=steps.getBoundingClientRect();
    var p=clamp((vh*0.85-r.top)/(r.height*0.9+vh*0.1),0,1);
    if(rail)rail.style.setProperty('--p',p.toFixed(3));
  }
  dockFrame();
  // map follows whichever service row is nearest viewport middle (only when map column is visible)
  if(map&&rows.length){
    var best=null,bd=1e9;
    rows.forEach(function(row){var b=row.getBoundingClientRect();var d=Math.abs(b.top+b.height/2-vh*0.5);if(d<bd){bd=d;best=row}});
    if(best){var a=best.getAttribute('data-map');map.setAttribute('data-a',a);document.querySelectorAll('.legend span').forEach(function(s){s.classList.toggle('on',s.getAttribute('data-for')===a)})}
  }
}
// dock + metal highlight follow scroll
var dock=document.querySelector('.dock'),contact=document.getElementById('contact');
function dockFrame(){
  if(dock){var vh=window.innerHeight;var c=contact.getBoundingClientRect();
    dock.classList.toggle('show',window.scrollY>vh*0.7&&!(c.top<vh*0.85));}
  if(!reduce&&!usingPointer){root.style.setProperty('--sx',(0.5+0.5*Math.sin(window.scrollY/420)).toFixed(3));}
}
var usingPointer=false;
var tick=false;
window.addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(function(){tick=false;frame()})}},{passive:true});
window.addEventListener('resize',frame);
frame();
// cursor and tap response: specular highlight on metal type, engraving revealed on dark scenes
var darks=[].slice.call(document.querySelectorAll('.dark'));
if(!reduce){
  window.addEventListener('pointermove',function(e){
    if(e.pointerType==='mouse'){usingPointer=true;root.style.setProperty('--sx',(e.clientX/window.innerWidth).toFixed(3));}
    darks.forEach(function(d){var r=d.getBoundingClientRect();
      if(e.clientY>=r.top&&e.clientY<=r.bottom){d.style.setProperty('--mx',(e.clientX-r.left)+'px');d.style.setProperty('--my',(e.clientY-r.top)+'px');d.classList.add('hot')}
      else d.classList.remove('hot')});
  },{passive:true});
  document.addEventListener('pointerleave',function(){darks.forEach(function(d){d.classList.remove('hot')})});
  window.addEventListener('pointerdown',function(e){
    if(e.pointerType==='mouse')return;
    var t=document.createElement('i');t.className='tap';t.style.left=e.clientX+'px';t.style.top=e.clientY+'px';document.body.appendChild(t);setTimeout(function(){t.remove()},900);
    darks.forEach(function(d){var r=d.getBoundingClientRect();
      if(e.clientY>=r.top&&e.clientY<=r.bottom){d.style.setProperty('--mx',(e.clientX-r.left)+'px');d.style.setProperty('--my',(e.clientY-r.top)+'px');d.classList.add('hot');clearTimeout(d._h);d._h=setTimeout(function(){d.classList.remove('hot')},1600)}});
  },{passive:true});
}
// map tooltips (hover, focus, tap)
var tip=document.getElementById('tip');
if(map&&tip){
  var plate=map.parentElement;
  function showTip(g,cx,cy){
    var pr=plate.getBoundingClientRect();
    tip.querySelector('b').textContent=g.getAttribute('data-n');
    tip.querySelector('span').innerHTML=g.getAttribute('data-s').split('|').join('<br>');
    tip.hidden=false;
    var w=tip.offsetWidth/2+6;
    var x=Math.max(w,Math.min(pr.width-w,cx-pr.left));
    var y=Math.max(tip.offsetHeight*1.12+4,cy-pr.top);
    tip.style.left=x+'px';tip.style.top=y+'px';
  }
  [].slice.call(map.querySelectorAll('.sg')).forEach(function(g){
    g.addEventListener('pointerenter',function(e){showTip(g,e.clientX,e.clientY)});
    g.addEventListener('pointermove',function(e){showTip(g,e.clientX,e.clientY)});
    g.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')tip.hidden=true});
    g.addEventListener('click',function(e){showTip(g,e.clientX,e.clientY)});
    g.addEventListener('focus',function(){var b=g.getBoundingClientRect();showTip(g,b.left+b.width/2,b.top+b.height*0.35)});
    g.addEventListener('blur',function(){tip.hidden=true});
  });
  document.addEventListener('pointerdown',function(e){if(!e.target.closest||!e.target.closest('.sg'))tip.hidden=true});
  window.addEventListener('scroll',function(){tip.hidden=true},{passive:true});
}
// demo form
// topic links preselect the form
var topicSel=document.getElementById('topic');
[].slice.call(document.querySelectorAll('[data-topic]')).forEach(function(l){l.addEventListener('click',function(){
  if(!topicSel)return;var v=l.getAttribute('data-topic');
  for(var i=0;i<topicSel.options.length;i++){if(topicSel.options[i].text===v){topicSel.selectedIndex=i;break}}
})});
var f=document.getElementById('demo'),ok=document.getElementById('ok');
if(f)f.addEventListener('submit',function(e){e.preventDefault();ok.hidden=false});
})();
