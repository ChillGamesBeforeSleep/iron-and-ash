/* ---------- small utils ---------- */
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[(Math.random()*a.length)|0];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash2(x,y){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
function vnoise(x,s){const i=Math.floor(x),f=x-i,a=hash2(i,s)*2-1,b=hash2(i+1,s)*2-1,u=f*f*(3-2*f);return a+(b-a)*u}
const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)};
const sh=(c,k)=>[c[0]*k,c[1]*k,c[2]*k];
const cyl=t=>{t=clamp(t,0,1);return .42+.62*Math.pow(Math.sin(Math.PI*t),.6)+.35*Math.exp(-(((t-.27)/.09)**2))};
const grain=(x,y,a)=>1+(hash2(x*3+1,y*7+5)-.5)*a;
const rgb=c=>`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
