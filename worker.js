export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return new Response(`<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Local SEO Opportunity Finder</title>
<style>
body{font-family:Arial;margin:0;background:#f5f7fb;color:#172033}
.box{max-width:700px;margin:20px auto;padding:16px}
.card{background:#fff;padding:20px;border-radius:16px;box-shadow:0 4px 20px #0001;margin-bottom:16px}
input,select,button{width:100%;padding:14px;margin:8px 0 14px;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;font-size:16px}
button{background:#111827;color:#fff;border:0;font-weight:bold}
.item{background:#f1f5f9;padding:12px;border-radius:10px;margin:8px 0}
.small{color:#64748b;font-size:14px}
.badge{display:inline-block;padding:5px 8px;border-radius:8px;background:#e2e8f0;font-size:12px;margin-top:6px}
.good{background:#dcfce7}
.warn{background:#fef3c7}
h1{font-size:26px}
a{word-break:break-all}
</style>
</head>
<body>
<div class="box">
<div class="card">
<h1>Local SEO Opportunity Finder</h1>
<p class="small">Compare your local business website with publicly discoverable competitors and find missing opportunities.</p>
<input id="site" placeholder="https://example.com">
<input id="city" placeholder="City">
<select id="type"><option>Dentist</option><option>HVAC</option><option>Plumber</option><option>Roofer</option></select>
<button onclick="analyze()">Analyze Website</button>
<div id="result"></div>
</div>
</div>
<script>
function esc(v){return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
async function analyze(){
 const site=document.getElementById("site").value.trim(), city=document.getElementById("city").value.trim(), type=document.getElementById("type").value, r=document.getElementById("result");
 if(!site){r.innerHTML="<p>Enter a website URL.</p>";return}
 if(!city){r.innerHTML="<p>Enter a city.</p>";return}
 r.innerHTML="<p>Analyzing your website and looking for public competitor websites...</p>";
 try{
  const x=await fetch("/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:site,city,type})});
  const d=await x.json();
  if(!d.success){r.innerHTML="<p>Error: "+esc(d.error)+"</p>";return}
  let h="<h2>SEO Report</h2>";
  h+="<div class='item'><b>Your Page Title:</b><br>"+esc(d.title||"Not detected")+"</div>";
  h+="<div class='item'><b>Meta Description:</b><br>"+esc(d.description||"Not detected")+"</div>";
  h+="<div class='item'><b>H1:</b><br>"+(d.h1.length?d.h1.map(esc).join("<br>"):"Not detected")+"</div>";
  h+="<h3>Top Opportunities</h3>";
  if(d.opportunities.length){d.opportunities.forEach(o=>{h+="<div class='item'><b>"+esc(o.title)+"</b><br><span class='small'>"+esc(o.reason)+"</span></div>"})}
  else h+="<div class='item good'>No obvious opportunity was detected from the analyzed public pages.</div>";
  h+="<h3>Public Competitors Found</h3>";
  if(d.competitors.length){d.competitors.forEach(c=>{h+="<div class='item'><b>"+esc(c.name)+"</b><br><span class='badge "+(c.kind==='Direct website competitor'?'good':'warn')+"'>"+esc(c.kind)+"</span><br><a href='"+esc(c.url)+"' target='_blank' rel='noopener'>"+esc(c.url)+"</a></div>"})}
  else h+="<div class='item'><b>No direct competitors were discovered.</b><br><span class='small'>The public search source may not have returned suitable local business websites. No competitors were invented.</span></div>";
  if(d.comparison && d.comparison.length){
    h+="<h3>Competitor Gap Comparison</h3><div class='item'><div class='small'>A check mark means the signal was detected on at least one analyzed direct competitor page. It does not prove rankings or performance.</div></div>";
    d.comparison.forEach(row=>{h+="<div class='item'><b>"+esc(row.opportunity)+"</b><br>Your site: "+(row.yourSite?"✅ Detected":"❌ Not detected")+"<br>Competitors: "+(row.competitors?"✅ Detected":"❌ Not detected")+"</div>"});
  }
  h+="<p class='small'>Note: This report uses publicly accessible page content. It does not claim Google rankings, GBP data, backlinks, traffic, reviews, revenue, or guaranteed ranking improvements.</p>";
  r.innerHTML=h;
 }catch(e){r.innerHTML="<p>Connection error: "+esc(e.message)+"</p>"}
}
</script>
</body></html>`,{headers:{"Content-Type":"text/html;charset=UTF-8"}});
    }

    if (request.method === "POST" && url.pathname === "/analyze") {
      try {
        const body = await request.json();
        let target = String(body.url || "").trim();
        const city = String(body.city || "").trim();
        const type = String(body.type || "Dentist").trim();
        if (!target) throw new Error("Website URL is required.");
        if (!city) throw new Error("City is required.");
        if (!/^https?:\/\//i.test(target)) target = "https://" + target;

        const response = await fetch(target,{headers:{"User-Agent":"Mozilla/5.0 LocalSEOOpportunityFinder"},redirect:"follow"});
        if (!response.ok) throw new Error("Website returned HTTP " + response.status);
        const html = await response.text();
        const siteData = analyzeHtml(html,response.url||target,type);
        const competitors = await findCompetitors(city,type,response.url||target);
        const directCompetitors=[];

        for(const candidate of competitors.slice(0,6)){
          try{
            const cr=await fetch(candidate.url,{headers:{"User-Agent":"Mozilla/5.0 LocalSEOOpportunityFinder"},redirect:"follow"});
            if(!cr.ok) continue;
            const ch=await cr.text();
            const data=analyzeHtml(ch,cr.url||candidate.url,type);
            if(data.kind==="Direct website competitor"){
              directCompetitors.push({name:candidate.name||hostname(cr.url||candidate.url),url:cr.url||candidate.url,kind:data.kind,data});
            }
          }catch(_){}
          if(directCompetitors.length>=3) break;
        }

        const checks=getChecks(type);
        const comparison=checks.map(c=>({
          opportunity:c[0],
          yourSite:c[1].some(w=>siteData.text.includes(w)),
          competitors:directCompetitors.some(c=>c[1] ? c[1].some(w=>c.data.text.includes(w)) : c.data.text && c[1])
        }));
        const fixedComparison=checks.map(c=>({
          opportunity:c[0],
          yourSite:c[1].some(w=>siteData.text.includes(w)),
          competitors:directCompetitors.some(x=>c[1].some(w=>x.data.text.includes(w)))
        }));

        const opportunities=[];
        if(!siteData.title) opportunities.push({title:"Add a clear page title",reason:"No page title was detected on the analyzed public page."});
        if(!siteData.description) opportunities.push({title:"Add a meta description",reason:"No meta description was detected on the analyzed public page."});
        if(!siteData.h1.length) opportunities.push({title:"Add one clear H1",reason:"No H1 heading was detected on the analyzed public page."});
        for(const c of checks){
          const yours=c[1].some(w=>siteData.text.includes(w));
          const competitorsHave=directCompetitors.some(x=>c[1].some(w=>x.data.text.includes(w)));
          if(!yours && competitorsHave) opportunities.push({title:"Review "+c[0],reason:"This signal was detected on at least one analyzed direct competitor page but was not detected on your analyzed page."});
        }
        if(!opportunities.length){
          for(const c of checks) if(!c[1].some(w=>siteData.text.includes(w))) opportunities.push({title:"Review "+c[0],reason:"This signal was not detected on the analyzed public page."});
        }

        return json({success:true,url:response.url||target,title:siteData.title,description:siteData.description,h1:siteData.h1,opportunities:opportunities.slice(0,5),competitors:directCompetitors.map(c=>({name:c.name,url:c.url,kind:c.kind})),comparison:fixedComparison});
      }catch(e){return json({success:false,error:e.message||"Unknown error"},400)}
    }
    return new Response("Not Found",{status:404});
  }
};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json;charset=UTF-8"}})}
function hostname(u){try{return new URL(u).hostname.replace(/^www\./,"")}catch(_){return u}}
function cleanText(s){return String(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim()}
function analyzeHtml(html,finalUrl,type){
 const tm=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i), title=tm?cleanText(tm[1]):"";
 const dm=html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)||html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
 const description=dm?cleanText(dm[1]):"";
 const h1=[];
 for(const m of html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)){const v=cleanText(m[1]);if(v)h1.push(v);if(h1.length>=10)break}
 const text=(title+" "+description+" "+h1.join(" ")+" "+cleanText(html)).toLowerCase();
 return {title,description,h1,text,kind:classifySite(finalUrl,html,type)}
}
function classifySite(u,html,type){
 const host=hostname(u).toLowerCase(), lower=(host+" "+html.slice(0,20000)).toLowerCase();
 const directories=["marham.pk","oladoc.com","healthwire.pk","instacare.pk","whatclinic.com","yelp.com","yellowpages.com","facebook.com","instagram.com","linkedin.com","tiktok.com","youtube.com","google.com","maps.google.com"];
 if(directories.some(x=>host===x||host.endsWith("."+x))) return ["facebook.com","instagram.com","linkedin.com","tiktok.com","youtube.com"].some(x=>host===x||host.endsWith("."+x))?"Social profile":"Directory";
 const businessWords={Dentist:["dentist","dental","clinic","orthodont","implant"],HVAC:["hvac","heating","cooling","air conditioning","furnace"],Plumber:["plumber","plumbing","drain","sewer","water heater"],Roofer:["roofer","roofing","shingle","roof repair","roof replacement"]};
 const words=businessWords[type]||[], matches=words.filter(w=>lower.includes(w)).length;
 return matches>=1?"Direct website competitor":"Unknown";
}
async function findCompetitors(city,type,userUrl){
 const queries=[type+" "+city,type+" near "+city,"best "+type+" "+city],out=[],seen=new Set(),userHost=hostname(userUrl);
 for(const q of queries){
  try{
   const searchUrl="https://www.google.com/search?q="+encodeURIComponent(q)+"&num=10";
   const sr=await fetch("https://r.jina.ai/"+searchUrl,{headers:{"User-Agent":"Mozilla/5.0 LocalSEOOpportunityFinder"}});
   if(!sr.ok)continue;
   const txt=await sr.text();
   for(const u of extractUrls(txt)){
    let clean=u;try{const parsed=new URL(u);if(parsed.protocol!=="http:"&&parsed.protocol!=="https:")continue;clean=parsed.origin+parsed.pathname}catch(_){continue}
    const host=hostname(clean);if(!host||host===userHost||host.endsWith("."+userHost)||isExcludedHost(host)||seen.has(host))continue;
    seen.add(host);out.push({name:host,url:clean});if(out.length>=6)return out;
   }
  }catch(_){}
 }
 return out;
}
function isExcludedHost(host){
 const excluded=["google.com","googleusercontent.com","gstatic.com","youtube.com","facebook.com","instagram.com","linkedin.com","tiktok.com","x.com","twitter.com","reddit.com","yelp.com","yellowpages.com","marham.pk","oladoc.com","healthwire.pk","instacare.pk","whatclinic.com","tripadvisor.com"];
 return excluded.some(x=>host===x||host.endsWith("."+x))
}
function extractUrls(text){
 const results=[],re=/https?:\/\/[^\s\]\[\)>"']+/gi;
 for(const m of text.matchAll(re)){let u=m[0].replace(/[.,;:]+$/,"");try{const p=new URL(u);if(p.protocol==="http:"||p.protocol==="https:")results.push(u)}catch(_){}}
 return [...new Set(results)]
}
function getChecks(type){
 const map={
 Dentist:[["Emergency Dentist",["emergency dentist","emergency dental"]],["Dental Implants",["dental implant"]],["Root Canal",["root canal"]],["Braces / Orthodontics",["braces","orthodont"]],["Teeth Whitening",["teeth whitening","whitening"]],["FAQ Content",["faq","frequently asked"]]],
 HVAC:[["Emergency HVAC",["emergency hvac","24/7 hvac","emergency heating","emergency cooling"]],["AC Repair",["ac repair","air conditioning repair"]],["Heating Repair",["heating repair","furnace repair"]],["HVAC Installation",["hvac installation","ac installation","air conditioner installation"]],["Maintenance Plans",["maintenance plan","maintenance plans","service plan"]],["FAQ Content",["faq","frequently asked"]]],
 Plumber:[["Emergency Plumbing",["emergency plumber","emergency plumbing","24/7 plumber"]],["Drain Cleaning",["drain cleaning","drain unclogging"]],["Water Heater",["water heater","water heaters"]],["Sewer Services",["sewer repair","sewer line","sewer cleaning"]],["Leak Repair",["leak repair","water leak","pipe leak"]],["FAQ Content",["faq","frequently asked"]]],
 Roofer:[["Emergency Roof Repair",["emergency roof","storm damage","24/7 roof"]],["Roof Repair",["roof repair","roof repairs"]],["Roof Replacement",["roof replacement","replace roof"]],["Shingle Roofing",["shingle","asphalt shingles"]],["Roof Inspection",["roof inspection","roof inspections"]],["FAQ Content",["faq","frequently asked"]]]
 };
 return map[type]||map.Dentist
                          }
