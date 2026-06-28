(function(){
  const $=id=>document.getElementById(id);
  const cv=$("cv"), ctx=cv.getContext("2d");
  const C={accent:"#167685",dark:"#0d4750",ink:"#2c3135",muted:"#8a9296",grid:"#e7eded",tan:"#9aa7a9",hi:"#b4502a"};

  const f2=x=>x.toFixed(2), f1=x=>x.toFixed(1);
  // read a typed value safely: fall back to default if blank/NaN, clamp to [min,max] if given
  function num(id,def,min,max){
    let v=parseFloat($(id).value);
    if(!isFinite(v)) v=def;
    if(min!==undefined) v=Math.max(min,v);
    if(max!==undefined) v=Math.min(max,v);
    return v;
  }
  function sta(ft){
    const s=Math.floor(Math.abs(ft)/100), r=Math.abs(ft)-s*100;
    return (ft<0?"-":"")+s+"+"+r.toFixed(2).padStart(5,"0");
  }

  function compute(){
    const g1=num("g1",3,-15,15), g2=num("g2",-2,-15,15), L=num("L",400,1);
    const PVIsta=num("PVI",5000,0), PVIel=num("EL",100);
    const PVCsta=PVIsta-L/2, PVTsta=PVIsta+L/2;
    const PVCel=PVIel-(g1/100)*(L/2);
    const PVTel=PVIel+(g2/100)*(L/2);
    const A=g2-g1;                                   // %
    const K=A!==0 ? L/Math.abs(A) : Infinity;
    // elevation along curve, x measured from PVC (0..L)
    const elev=x=>PVCel+(g1/100)*x+((A/100)/(2*L))*x*x;
    // turning point
    let turn=null;
    if(A!==0){
      const xt=-g1/A*L;
      if(xt>=0 && xt<=L) turn={x:xt, sta:PVCsta+xt, el:elev(xt), crest:A<0};
    }
    return {g1,g2,L,PVIsta,PVIel,PVCsta,PVTsta,PVCel,PVTel,A,K,elev,turn};
  }

  function draw(s){
    const W=cv.width,H=cv.height, padL=58,padR=20,padT=24,padB=42;
    const x0=s.PVCsta, x1=s.PVTsta;
    // y range across tangents + curve + PVI
    const ys=[s.PVCel,s.PVTel,s.PVIel];
    for(let i=0;i<=40;i++) ys.push(s.elev(s.L*i/40));
    let yMin=Math.min(...ys), yMax=Math.max(...ys);
    const span=(yMax-yMin)||1; yMin-=span*0.15; yMax+=span*0.15;

    const X=ft=>padL+(ft-x0)/(x1-x0)*(W-padL-padR);
    const Y=el=>padT+(yMax-el)/(yMax-yMin)*(H-padT-padB);

    ctx.clearRect(0,0,W,H);

    // grid + axes
    ctx.strokeStyle=C.grid; ctx.lineWidth=1; ctx.font="10px ui-monospace,monospace"; ctx.fillStyle=C.muted;
    const nX=5;
    for(let i=0;i<=nX;i++){
      const ft=x0+(x1-x0)*i/nX, px=X(ft);
      ctx.beginPath();ctx.moveTo(px,padT);ctx.lineTo(px,H-padB);ctx.stroke();
      ctx.textAlign="center";ctx.fillText(sta(ft),px,H-padB+14);
    }
    const nY=5;
    for(let i=0;i<=nY;i++){
      const el=yMin+(yMax-yMin)*i/nY, py=Y(el);
      ctx.beginPath();ctx.moveTo(padL,py);ctx.lineTo(W-padR,py);ctx.stroke();
      ctx.textAlign="right";ctx.fillText(f1(el),padL-6,py+3);
    }
    // axis titles
    ctx.fillStyle=C.ink;ctx.font="11px system-ui,sans-serif";
    ctx.textAlign="center";ctx.fillText("Station",padL+(W-padL-padR)/2,H-6);
    ctx.save();ctx.translate(14,padT+(H-padT-padB)/2);ctx.rotate(-Math.PI/2);
    ctx.fillText("Elevation (ft)",0,0);ctx.restore();

    // tangents (dashed)
    ctx.strokeStyle=C.tan;ctx.lineWidth=1.6;ctx.setLineDash([6,4]);
    seg(X(s.PVCsta),Y(s.PVCel), X(s.PVIsta),Y(s.PVIel));
    seg(X(s.PVIsta),Y(s.PVIel), X(s.PVTsta),Y(s.PVTel));
    ctx.setLineDash([]);

    // parabola
    ctx.strokeStyle=C.accent;ctx.lineWidth=3.2;ctx.beginPath();
    const N=160;
    for(let i=0;i<=N;i++){
      const x=s.L*i/N, px=X(s.PVCsta+x), py=Y(s.elev(x));
      i?ctx.lineTo(px,py):ctx.moveTo(px,py);
    }
    ctx.stroke();

    // points
    pt(X(s.PVCsta),Y(s.PVCel),C.accent,"PVC","below");
    pt(X(s.PVIsta),Y(s.PVIel),C.dark,"PVI","above");
    pt(X(s.PVTsta),Y(s.PVTel),C.accent,"PVT","below");
    if(s.turn){
      const tx=X(s.turn.sta),ty=Y(s.turn.el);
      ctx.strokeStyle=C.hi;ctx.lineWidth=1;ctx.setLineDash([3,3]);
      seg(tx,ty,tx,H-padB);ctx.setLineDash([]);
      pt(tx,ty,C.hi,(s.turn.crest?"high":"low"),"above");
    }

    function seg(ax,ay,bx,by){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();}
    function pt(px,py,col,txt,pos){
      ctx.fillStyle=col;ctx.beginPath();ctx.arc(px,py,4.5,0,7);ctx.fill();
      ctx.fillStyle=C.ink;ctx.font="600 11px ui-monospace,monospace";ctx.textAlign="center";
      ctx.textBaseline="alphabetic";
      ctx.fillText(txt,px, pos==="above"?py-9:py+18);
    }
  }

  function render(){
    const s=compute();
    $("oA").textContent=(s.A>=0?"+":"")+f1(s.A)+"%";
    $("oK").textContent=isFinite(s.K)?f1(s.K):"\u221e";
    $("oPVCs").textContent=sta(s.PVCsta);
    $("oPVCe").textContent=f2(s.PVCel)+" ft";
    $("oPVTs").textContent=sta(s.PVTsta);
    $("oPVTe").textContent=f2(s.PVTel)+" ft";
    const lab=$("hlLabel"), out=$("oHL");
    if(s.turn){ lab.textContent=(s.turn.crest?"High point":"Low point");
      out.textContent=sta(s.turn.sta)+" @ "+f2(s.turn.el)+" ft"; }
    else { lab.textContent="High / low point"; out.textContent="none (constant grade sign)"; }
    draw(s);
  }
  ["g1","g2","L","PVI","EL"].forEach(id=>$(id).addEventListener("input",render));
  render();
})();
